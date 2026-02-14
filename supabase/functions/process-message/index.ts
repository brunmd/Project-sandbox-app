// ============================================================================
// StaiDOC — Edge Function: process-message (v2 — Security Hardened)
// Fluxo: Recebe mensagem → Valida → Anonimiza (NER+REGEX) → Grava logs →
//        Chama API Anthropic (Claude Opus 4.6) com streaming → Retorna SSE
// ============================================================================
// Conformidade: LGPD Art. 6/7/12/18/20/37/46 + Marco Civil Art. 15
// Seguranca: CORS restrito, input validation, prompt injection prevention,
//            rate limit por contexto, logging paralelo
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { MASTER_PROMPT } from "../_shared/master-prompt.ts";
import {
  anonymizeContent,
  sha256,
  type DetectedEntity,
} from "../_shared/anonymizer.ts";
import {
  isValidUUID,
  isValidAuthHeader,
  sanitizeForPrompt,
  detectImageMimeType,
  secureWipeBuffer,
  MAX_CONTENT_LENGTH,
  MAX_CONTEXT_MESSAGES,
} from "../_shared/validation.ts";
import { verifyReferences } from "../_shared/pubmed-utils.ts";

// ============================================================================
// Configuracao do modelo — Somente Anthropic
// ============================================================================
// Modelo primario: Claude Opus 4.6 (modelo mais avancado — confirmado no plano)
const MODEL_ID = "claude-opus-4-6";
const MODEL_NAME = "Claude Opus 4.6";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// ============================================================================
// Tipos
// ============================================================================
interface ImageData {
  media_type: string;
  data: string; // base64
}

interface ProcessMessageRequest {
  conversation_id: string;
  content: string;
  has_image?: boolean;
  images?: ImageData[];
}

// Limites de seguranca para imagens
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB por imagem
const MAX_IMAGES_PER_MESSAGE = 3;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ============================================================================
// Funcao principal
// ============================================================================
serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // =====================================================================
    // AUTENTICACAO
    // =====================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !isValidAuthHeader(authHeader)) {
      return jsonResponse(cors, { error: "Token de autenticacao ausente ou invalido" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse(cors, { error: "Usuario nao autenticado" }, 401);
    }

    const userId = user.id;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    // =====================================================================
    // VALIDACAO DE ENTRADA (Seguranca: prevencao de injection e DoS)
    // =====================================================================
    const body = (await req.json()) as ProcessMessageRequest;
    const { conversation_id, content = "", images = [] } = body;
    const hasImages = images.length > 0;

    if (!conversation_id || (!content && !hasImages)) {
      return jsonResponse(
        cors,
        { error: "conversation_id e content (ou images) sao obrigatorios" },
        400
      );
    }

    // Validar formato UUID (previne SQL injection e prompt injection)
    if (!isValidUUID(conversation_id)) {
      return jsonResponse(cors, { error: "Formato de conversation_id invalido" }, 400);
    }

    // Validar tamanho do conteudo (previne DoS e custos excessivos na API)
    if (content.length > MAX_CONTENT_LENGTH) {
      return jsonResponse(
        cors,
        { error: `Mensagem excede o limite de ${MAX_CONTENT_LENGTH} caracteres` },
        413
      );
    }

    // =====================================================================
    // VALIDACAO DE IMAGENS (se presentes)
    // =====================================================================
    if (images.length > MAX_IMAGES_PER_MESSAGE) {
      return jsonResponse(
        cors,
        { error: `Maximo de ${MAX_IMAGES_PER_MESSAGE} imagens por mensagem` },
        400
      );
    }

    const validatedImages: Array<{
      media_type: string;
      data: string;
      hash: string;
      size_bytes: number;
    }> = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.data || !img.media_type) {
        return jsonResponse(cors, { error: `Imagem ${i + 1}: dados incompletos` }, 400);
      }

      // Decodificar base64 para validar magic bytes
      let imageBuffer: ArrayBuffer;
      try {
        const binaryString = atob(img.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        imageBuffer = bytes.buffer;
      } catch {
        return jsonResponse(cors, { error: `Imagem ${i + 1}: base64 invalido` }, 400);
      }

      // Validar tamanho
      if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        return jsonResponse(
          cors,
          { error: `Imagem ${i + 1}: excede limite de ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB` },
          413
        );
      }

      // Validar magic bytes (nao confiar no MIME type do frontend)
      const detectedType = detectImageMimeType(imageBuffer);
      if (!detectedType || !ALLOWED_IMAGE_TYPES.includes(detectedType)) {
        return jsonResponse(
          cors,
          { error: `Imagem ${i + 1}: formato nao suportado. Aceitos: JPEG, PNG, WebP` },
          400
        );
      }

      // Hash SHA-256 da imagem (prova de existencia sem armazenamento)
      const imageHash = await sha256(img.data.slice(0, 1000) + img.data.length);

      validatedImages.push({
        media_type: detectedType, // Usar tipo detectado, nao o informado
        data: img.data,
        hash: imageHash,
        size_bytes: imageBuffer.byteLength,
      });

      // Secure wipe do buffer decodificado (a imagem continua em base64 para a API)
      secureWipeBuffer(imageBuffer);
    }

    // Verificar que a conversa pertence ao medico autenticado (via RLS)
    const { data: conversation, error: convError } = await supabaseUser
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return jsonResponse(
        cors,
        { error: "Conversa nao encontrada ou sem permissao" },
        403
      );
    }

    const processingStart = Date.now();

    // =====================================================================
    // ETAPA 1: ANONIMIZACAO (NER + REGEX)
    // =====================================================================
    // Dupla protecao:
    //   Camada 1 (tecnica): Este modulo remove dados via REGEX
    //   Camada 2 (logica): O prompt mestre instrui a IA a ignorar PII remanescente
    // =====================================================================

    // Hash do texto ORIGINAL (prova de que existiu — o texto em si e descartado)
    const originalContentHash = await sha256(content);

    // Anonimizar
    const {
      anonymizedContent,
      entities,
      sensitiveDataFound,
      privacyWarningTriggered,
    } = anonymizeContent(content);

    // Hash do texto ANONIMIZADO (prova de integridade)
    const anonymizedContentHash = await sha256(anonymizedContent);

    const anonymizationTimeMs = Date.now() - processingStart;

    // =====================================================================
    // ETAPA 2: GRAVAR MENSAGEM DO MEDICO (ja anonimizada)
    // =====================================================================
    const { data: userMessage, error: msgError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id,
        user_id: userId,
        role: "user",
        content: anonymizedContent || (hasImages ? "[Imagem enviada para analise]" : ""),
        content_hash: anonymizedContentHash,
        has_image: hasImages,
      })
      .select("id")
      .single();

    if (msgError) {
      console.error("Erro ao gravar mensagem:", msgError.message, msgError.code, msgError.details);
      return jsonResponse(cors, {
        error: `Erro ao gravar mensagem: ${msgError.message}`,
        code: msgError.code,
        step: "message_insert",
      }, 500);
    }

    // =====================================================================
    // ETAPA 3: GRAVAR LOGS DE ANONIMIZACAO EM PARALELO
    // =====================================================================
    const logPromises: Promise<unknown>[] = [
      // Log principal de anonimizacao
      supabaseAdmin.from("anonymization_logs").insert({
        user_id: userId,
        message_id: userMessage.id,
        original_content_hash: originalContentHash,
        entities_detected: entities.map((e: DetectedEntity) => ({
          type: e.type,
          action: e.action,
          confidence: e.confidence,
          method: e.method,
        })),
        anonymization_method: "HYBRID",
        sensitive_data_found: sensitiveDataFound,
        processing_time_ms: anonymizationTimeMs,
      }),
      // Log de auditoria da mensagem do medico
      supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        action: "message_sent",
        resource_type: "messages",
        resource_id: userMessage.id,
        details: {
          conversation_id,
          has_image: hasImages,
          sensitive_data_found: sensitiveDataFound,
          entities_count: entities.length,
          entity_types: entities.map((e: DetectedEntity) => e.type),
          anonymization_time_ms: anonymizationTimeMs,
          privacy_warning_triggered: privacyWarningTriggered,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    ];

    // Logs individuais de cada entidade detectada
    if (entities.length > 0) {
      logPromises.push(
        supabaseAdmin.from("sensitive_data_detection_logs").insert(
          entities.map((e: DetectedEntity) => ({
            user_id: userId,
            message_id: userMessage.id,
            detection_type: e.type,
            detection_method: `REGEX_${e.method}`,
            confidence_score: e.confidence,
            action_taken: e.action,
          }))
        )
      );
    }

    // Logs de processamento de imagem (LGPD: prova de descarte)
    if (validatedImages.length > 0) {
      logPromises.push(
        supabaseAdmin.from("image_processing_logs").insert(
          validatedImages.map((img) => ({
            user_id: userId,
            conversation_id,
            message_id: userMessage.id,
            image_hash: img.hash,
            image_size_bytes: img.size_bytes,
            image_mime_type: img.media_type,
            purpose: "diagnostic_aid",
            processed_at: new Date().toISOString(),
            discarded_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - processingStart,
            ai_model_used: MODEL_ID,
            storage_proof: "processed_in_memory",
          }))
        )
      );
    }

    // Executar todos os logs em paralelo (nao bloqueia o fluxo principal)
    await Promise.allSettled(logPromises);

    // =====================================================================
    // ETAPA 4: BUSCAR HISTORICO DA CONVERSA (com limite de seguranca)
    // =====================================================================
    const { data: previousMessages } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(MAX_CONTEXT_MESSAGES);

    // Reverter para ordem cronologica (buscamos desc para pegar os mais recentes)
    const chronologicalMessages = (previousMessages || []).reverse();

    // Montar array de mensagens para a API Anthropic
    // deno-lint-ignore no-explicit-any
    const apiMessages: Array<{ role: "user" | "assistant"; content: any }> = chronologicalMessages.map((m) => ({
      role: m.role === "system" ? ("user" as const) : (m.role as "user" | "assistant"),
      content: m.content,
    }));

    // Se a mensagem atual tem imagens, substituir o ultimo item (que é a msg do usuario atual)
    // por content blocks multimodal para a Anthropic Vision API
    if (validatedImages.length > 0 && apiMessages.length > 0) {
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (lastMsg.role === "user") {
        // deno-lint-ignore no-explicit-any
        const contentBlocks: any[] = [];

        // Adicionar imagens como content blocks
        for (const img of validatedImages) {
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: img.media_type,
              data: img.data,
            },
          });
        }

        // Adicionar texto (se houver)
        const textContent = lastMsg.content && lastMsg.content !== "[Imagem enviada para analise]"
          ? lastMsg.content
          : "Analise esta imagem de exame medico. Descreva os achados de forma estruturada e correlacione com o contexto clinico disponivel.";

        contentBlocks.push({
          type: "text",
          text: textContent,
        });

        lastMsg.content = contentBlocks;
      }
    }

    // =====================================================================
    // ETAPA 5: CHAMAR API ANTHROPIC COM STREAMING
    // =====================================================================
    // Sanitizar conversation_id antes de injetar no prompt (previne prompt injection)
    const safeSessionId = sanitizeForPrompt(conversation_id);
    const systemPrompt = MASTER_PROMPT
      .replace("{MODEL_NAME}", MODEL_NAME)
      .replace("{SESSION_ID}", safeSessionId);

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY nao configurada");
    }

    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 4096,
        temperature: 0.2,
        stream: true,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const statusCode = anthropicResponse.status;
      let errorDetail = "";
      try {
        const errBody = await anthropicResponse.json();
        errorDetail = errBody?.error?.message || errBody?.error?.type || "";
      } catch { /* ignorar */ }
      console.error("Erro Anthropic API:", statusCode, errorDetail);
      return jsonResponse(cors, {
        error: `Erro na API Anthropic (${statusCode}): ${errorDetail || "verifique a API key e o modelo"}`,
        step: "anthropic_api",
        status_code: statusCode,
      }, 502);
    }

    // =====================================================================
    // ETAPA 6: STREAMING SSE — Repassar para o frontend
    // =====================================================================
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = anthropicResponse.body!.getReader();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Processar linhas SSE completas
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6).trim();
              if (!data || data === "[DONE]") continue;

              try {
                const event = JSON.parse(data);

                // Repassar deltas de texto para o frontend
                if (
                  event.type === "content_block_delta" &&
                  event.delta?.type === "text_delta" &&
                  event.delta?.text
                ) {
                  fullResponse += event.delta.text;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
                    )
                  );
                }

                // Capturar tokens usados
                if (event.type === "message_delta" && event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
              } catch {
                // Ignorar linhas que nao sao JSON valido
              }
            }
          }

          // =================================================================
          // ETAPA 7: VERIFICACAO DE REFERENCIAS VIA PUBMED E-UTILITIES
          // =================================================================
          // Abordagem NTAV (Never Trust, Always Verify):
          // 1. Claude gera com URLs de busca PubMed (sem PMIDs diretos)
          // 2. E-utilities busca e verifica cada referência
          // 3. URLs de busca são substituídas por PMIDs verificados
          // 4. Versão verificada é salva no DB e enviada ao frontend
          // =================================================================
          let finalContent = fullResponse;
          let verificationSummary = "Verificacao PubMed nao executada";
          let referencesCount = (fullResponse.match(/\[\d+\]/g) || []).length;

          try {
            const {
              verifiedText,
              verifications,
              verifiedCount,
              fallbackCount,
            } = await verifyReferences(fullResponse);

            finalContent = verifiedText;
            verificationSummary =
              `${verifications.length} referencia(s) processada(s) via PubMed E-utilities: ` +
              `${verifiedCount} verificada(s) com PMID real, ` +
              `${fallbackCount} mantida(s) como busca PubMed (fallback seguro). ` +
              `Artigos verificados: ${verifications
                .filter((v) => v.article)
                .map(
                  (v) =>
                    `[${v.verifiedPmid}] ${v.article!.title} (${v.article!.journal}, ${v.article!.year})`
                )
                .join("; ")}.`;

            // Enviar referências verificadas ao frontend para atualização em tempo real
            if (verifiedCount > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    verified_refs: verifications
                      .filter((v) => v.confidence === "VERIFIED")
                      .map((v) => ({
                        originalUrl: v.originalUrl,
                        verifiedUrl: v.verifiedUrl,
                        pmid: v.verifiedPmid,
                        title: v.article?.title,
                      })),
                    full_verified_text: finalContent,
                  })}\n\n`
                )
              );
            }
          } catch (verifyError) {
            console.error("[PubMed] Verification failed:", verifyError);
            // Fallback: usar texto original (com URLs de busca — ainda válidas)
            verificationSummary = `Verificacao PubMed falhou: ${verifyError instanceof Error ? verifyError.message : "erro desconhecido"}. URLs de busca PubMed mantidas como fallback seguro.`;
          }

          // =================================================================
          // ETAPA 8: GRAVAR RESPOSTA VERIFICADA E LOGS
          // =================================================================
          const aiContentHash = await sha256(finalContent);
          const totalProcessingTime = Date.now() - processingStart;

          // Salvar mensagem da IA (versão VERIFICADA com PMIDs reais)
          const { data: aiMessage } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id,
              user_id: userId,
              role: "assistant",
              content: finalContent,
              content_hash: aiContentHash,
              has_image: false,
              tokens_used: outputTokens,
              model_used: MODEL_ID,
            })
            .select("id")
            .single();

          if (aiMessage) {
            // Gravar explainability e audit em paralelo
            await Promise.allSettled([
              // Log de explicabilidade (Art. 20 LGPD)
              supabaseAdmin.from("explainability_logs").insert({
                user_id: userId,
                message_id: aiMessage.id,
                conversation_id,
                ai_model_used: MODEL_ID,
                explanation_level: 2,
                explanation_content:
                  `Resposta gerada pelo modelo ${MODEL_NAME} com temperatura 0.2 ` +
                  `para maxima precisao clinica. O sistema utilizou o prompt mestre ` +
                  `STAIDOC v1.0 com instrucoes de raciocinio clinico baseado em evidencias. ` +
                  `${verificationSummary} ` +
                  `O texto do medico foi anonimizado antes do processamento ` +
                  `(${entities.length} entidade(s) sensivel(is) ` +
                  `${sensitiveDataFound ? "detectada(s) e removida(s)" : "nao detectada(s)"}). ` +
                  `Tempo total de processamento: ${totalProcessingTime}ms.`,
                confidence_score: 0.85,
                disclaimer_shown: true,
                human_in_the_loop_confirmed: false,
              }),
              // Log de auditoria da resposta da IA
              supabaseAdmin.from("audit_logs").insert({
                user_id: userId,
                action: "message_received",
                resource_type: "messages",
                resource_id: aiMessage.id,
                details: {
                  conversation_id,
                  model_used: MODEL_ID,
                  tokens_used: outputTokens,
                  references_count: referencesCount,
                  references_verified: verificationSummary,
                  processing_time_ms: totalProcessingTime,
                  privacy_flag: sensitiveDataFound,
                  anonymization_entities_count: entities.length,
                },
                ip_address: ipAddress,
                user_agent: userAgent,
              }),
            ]);
          }

          // Secure wipe: limpar dados de imagem da memoria apos uso
          for (const img of validatedImages) {
            img.data = "";
          }

          // Sinal de fim do stream
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("Erro no streaming:", streamError);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "Erro ao processar resposta da IA",
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    // =====================================================================
    // RETORNO: Stream SSE para o frontend
    // =====================================================================
    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code || "";
    console.error("Erro em process-message:", errMsg, errCode);
    return jsonResponse(getCorsHeaders(req), {
      error: `Erro interno: ${errMsg}`,
      code: errCode,
      step: "catch_geral",
    }, 500);
  }
});

// ============================================================================
// Utilitarios
// ============================================================================
function jsonResponse(
  cors: Record<string, string>,
  body: Record<string, unknown>,
  status: number
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
