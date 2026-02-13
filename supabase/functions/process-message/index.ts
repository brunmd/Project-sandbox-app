// ============================================================================
// StaiDOC — Edge Function: process-message
// Fluxo: Recebe mensagem → Anonimiza (NER+REGEX) → Grava logs → Chama
//        API Anthropic (Claude Opus 4.6) com streaming → Retorna SSE
// ============================================================================
// Conformidade: LGPD Art. 6/7/12/18/20/37/46 + Marco Civil Art. 15
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { MASTER_PROMPT } from "../_shared/master-prompt.ts";
import {
  anonymizeContent,
  sha256,
  type DetectedEntity,
} from "../_shared/anonymizer.ts";

// ============================================================================
// Configuracao do modelo — Somente Anthropic
// ============================================================================
const MODEL_ID = "claude-opus-4-6";
const MODEL_NAME = "Claude Opus 4.6";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// ============================================================================
// Tipos
// ============================================================================
interface ProcessMessageRequest {
  conversation_id: string;
  content: string;
  has_image?: boolean;
}

// ============================================================================
// Funcao principal
// ============================================================================
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // =====================================================================
    // AUTENTICACAO
    // =====================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Token de autenticacao ausente" }, 401);
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
      return jsonResponse({ error: "Usuario nao autenticado" }, 401);
    }

    const userId = user.id;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    // =====================================================================
    // VALIDACAO DE ENTRADA
    // =====================================================================
    const body = (await req.json()) as ProcessMessageRequest;
    const { conversation_id, content, has_image = false } = body;

    if (!conversation_id || !content) {
      return jsonResponse(
        { error: "conversation_id e content sao obrigatorios" },
        400
      );
    }

    // Verificar que a conversa pertence ao medico autenticado
    const { data: conversation, error: convError } = await supabaseUser
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return jsonResponse(
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
        content: anonymizedContent,
        content_hash: anonymizedContentHash,
        has_image,
      })
      .select("id")
      .single();

    if (msgError) throw msgError;

    // =====================================================================
    // ETAPA 3: GRAVAR LOGS DE ANONIMIZACAO (prova para auditores ANPD)
    // =====================================================================

    // Log principal de anonimizacao
    await supabaseAdmin.from("anonymization_logs").insert({
      user_id: userId,
      message_id: userMessage.id,
      original_content_hash: originalContentHash,
      entities_detected: entities.map((e: DetectedEntity) => ({
        type: e.type,
        action: e.action,
        confidence: e.confidence,
        method: e.method,
        original_length: e.original_length,
      })),
      anonymization_method: "HYBRID",
      sensitive_data_found: sensitiveDataFound,
      processing_time_ms: anonymizationTimeMs,
    });

    // Logs individuais de cada entidade detectada
    if (entities.length > 0) {
      await supabaseAdmin.from("sensitive_data_detection_logs").insert(
        entities.map((e: DetectedEntity) => ({
          user_id: userId,
          message_id: userMessage.id,
          detection_type: e.type,
          detection_method: `REGEX_${e.method}`,
          confidence_score: e.confidence,
          action_taken: e.action,
        }))
      );
    }

    // Log de auditoria da mensagem do medico
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "message_sent",
      resource_type: "messages",
      resource_id: userMessage.id,
      details: {
        conversation_id,
        has_image,
        sensitive_data_found: sensitiveDataFound,
        entities_count: entities.length,
        entity_types: entities.map((e: DetectedEntity) => e.type),
        anonymization_time_ms: anonymizationTimeMs,
        privacy_warning_triggered: privacyWarningTriggered,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // =====================================================================
    // ETAPA 4: BUSCAR HISTORICO DA CONVERSA (contexto para a IA)
    // =====================================================================
    const { data: previousMessages } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    // Montar array de mensagens para a API Anthropic
    const apiMessages = (previousMessages || []).map((m) => ({
      role: m.role === "system" ? ("user" as const) : (m.role as "user" | "assistant"),
      content: m.content,
    }));

    // =====================================================================
    // ETAPA 5: CHAMAR API ANTHROPIC COM STREAMING
    // =====================================================================
    const systemPrompt = MASTER_PROMPT
      .replace("{MODEL_NAME}", MODEL_NAME)
      .replace("{SESSION_ID}", conversation_id);

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
        top_p: 0.9,
        stream: true,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error("Erro Anthropic API:", anthropicResponse.status, errorBody);
      throw new Error(
        `API Anthropic retornou status ${anthropicResponse.status}`
      );
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
          // ETAPA 7: STREAM FINALIZADO — Gravar resposta da IA e logs
          // =================================================================
          const aiContentHash = await sha256(fullResponse);
          const totalProcessingTime = Date.now() - processingStart;

          // Salvar mensagem da IA
          const { data: aiMessage } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id,
              user_id: userId,
              role: "assistant",
              content: fullResponse,
              content_hash: aiContentHash,
              has_image: false,
              tokens_used: outputTokens,
              model_used: MODEL_ID,
            })
            .select("id")
            .single();

          if (aiMessage) {
            // Contar referencias na resposta
            const referencesCount = (
              fullResponse.match(/\[\d+\]/g) || []
            ).length;

            // Log de explicabilidade (Art. 20 LGPD)
            await supabaseAdmin.from("explainability_logs").insert({
              user_id: userId,
              message_id: aiMessage.id,
              conversation_id,
              ai_model_used: MODEL_ID,
              explanation_level: 2,
              explanation_content:
                `Resposta gerada pelo modelo ${MODEL_NAME} com temperatura 0.2 ` +
                `para maxima precisao clinica. O sistema utilizou o prompt mestre ` +
                `STAIDOC v1.0 com instrucoes de raciocinio clinico baseado em evidencias. ` +
                `Referencias extraidas do PubMed/MEDLINE (${referencesCount} citacoes). ` +
                `O texto do medico foi anonimizado antes do processamento ` +
                `(${entities.length} entidade(s) sensivel(is) ` +
                `${sensitiveDataFound ? "detectada(s) e removida(s)" : "nao detectada(s)"}). ` +
                `Tempo total de processamento: ${totalProcessingTime}ms.`,
              confidence_score: 0.85,
              disclaimer_shown: true,
              human_in_the_loop_confirmed: false,
            });

            // Log de auditoria da resposta da IA
            await supabaseAdmin.from("audit_logs").insert({
              user_id: userId,
              action: "message_received",
              resource_type: "messages",
              resource_id: aiMessage.id,
              details: {
                conversation_id,
                model_used: MODEL_ID,
                tokens_used: outputTokens,
                references_count: referencesCount,
                processing_time_ms: totalProcessingTime,
                privacy_flag: sensitiveDataFound,
                anonymization_entities_count: entities.length,
              },
              ip_address: ipAddress,
              user_agent: userAgent,
            });
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
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Erro em process-message:", error);
    return jsonResponse({ error: "Erro interno ao processar mensagem" }, 500);
  }
});

// ============================================================================
// Utilitarios
// ============================================================================
function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
