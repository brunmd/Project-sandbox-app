// ============================================================================
// StaiDOC — Edge Function: process-message
// Recebe mensagem → NER anonimiza → chama IA → grava logs → retorna resposta
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessMessageRequest {
  conversation_id: string;
  content: string;
  has_image: boolean;
}

interface NEREntity {
  type: string;
  value: string;
  position: [number, number];
  action: string;
  confidence: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticação: extrair JWT do header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente Supabase com service_role para escrita em logs
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Cliente com token do usuário para validar identidade
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validar usuário autenticado
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const { conversation_id, content, has_image } = await req.json() as ProcessMessageRequest;

    // Validação de entrada
    if (!conversation_id || !content) {
      return new Response(
        JSON.stringify({ error: "conversation_id e content são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar que a conversa pertence ao usuário
    const { data: conversation, error: convError } = await supabaseUser
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada ou sem permissão" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processingStart = Date.now();

    // =========================================================================
    // ETAPA 1: Anonimização via NER
    // =========================================================================
    // TODO: Integrar com serviço NER real (spaCy, etc.)
    // Por enquanto, placeholder que simula detecção

    const originalContentHash = await sha256(content);
    const { anonymizedContent, entitiesDetected, sensitiveDataFound } =
      await anonymizeContent(content);
    const anonymizedContentHash = await sha256(anonymizedContent);

    const nerProcessingTime = Date.now() - processingStart;

    // =========================================================================
    // ETAPA 2: Gravar mensagem do usuário (já anonimizada)
    // =========================================================================

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

    // =========================================================================
    // ETAPA 3: Gravar logs de anonimização e detecção
    // =========================================================================

    // Log de anonimização
    await supabaseAdmin.from("anonymization_logs").insert({
      user_id: userId,
      message_id: userMessage.id,
      original_content_hash: originalContentHash,
      entities_detected: entitiesDetected,
      anonymization_method: "HYBRID",
      sensitive_data_found: sensitiveDataFound,
      processing_time_ms: nerProcessingTime,
    });

    // Logs de detecção individual
    if (entitiesDetected.length > 0) {
      const detectionLogs = entitiesDetected.map((entity: NEREntity) => ({
        user_id: userId,
        message_id: userMessage.id,
        detection_type: entity.type.toLowerCase(),
        detection_method: "NER_HYBRID",
        confidence_score: entity.confidence,
        action_taken: entity.action,
      }));

      await supabaseAdmin
        .from("sensitive_data_detection_logs")
        .insert(detectionLogs);
    }

    // =========================================================================
    // ETAPA 4: Chamar IA para gerar resposta
    // =========================================================================
    // TODO: Integrar com API de IA (Claude, GPT, etc.)

    const aiStart = Date.now();
    const { aiResponse, tokensUsed, modelUsed, confidenceScore } =
      await callAIModel(anonymizedContent, conversation_id);
    const aiProcessingTime = Date.now() - aiStart;

    // =========================================================================
    // ETAPA 5: Gravar resposta da IA como mensagem
    // =========================================================================

    const aiContentHash = await sha256(aiResponse);

    const { data: assistantMessage, error: aiMsgError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id,
        user_id: userId,
        role: "assistant",
        content: aiResponse,
        content_hash: aiContentHash,
        has_image: false,
        tokens_used: tokensUsed,
        model_used: modelUsed,
      })
      .select("id")
      .single();

    if (aiMsgError) throw aiMsgError;

    // =========================================================================
    // ETAPA 6: Log de explicabilidade (Art. 20 LGPD)
    // =========================================================================

    await supabaseAdmin.from("explainability_logs").insert({
      user_id: userId,
      message_id: assistantMessage.id,
      conversation_id,
      ai_model_used: modelUsed,
      explanation_level: 1, // Básico por padrão
      explanation_content:
        "Resposta gerada por modelo de IA com base nos sintomas/sinais informados. " +
        "O modelo analisa padrões clínicos para sugerir possíveis diagnósticos diferenciais. " +
        "Esta é uma ferramenta de auxílio — o diagnóstico final é responsabilidade do médico.",
      confidence_score: confidenceScore,
      disclaimer_shown: true,
      human_in_the_loop_confirmed: false,
    });

    // =========================================================================
    // ETAPA 7: Log de auditoria
    // =========================================================================

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "message_sent",
      resource_type: "messages",
      resource_id: userMessage.id,
      details: {
        conversation_id,
        has_image,
        sensitive_data_found: sensitiveDataFound,
        entities_count: entitiesDetected.length,
        processing_time_ms: Date.now() - processingStart,
      },
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent"),
    });

    // =========================================================================
    // RETORNO
    // =========================================================================

    return new Response(
      JSON.stringify({
        message_id: assistantMessage.id,
        content: aiResponse,
        model_used: modelUsed,
        tokens_used: tokensUsed,
        disclaimer: "Este é um auxílio ao diagnóstico. A decisão clínica final é do médico.",
        sensitive_data_detected: sensitiveDataFound,
        processing_time_ms: Date.now() - processingStart,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro em process-message:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar mensagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Gera hash SHA-256 de um texto
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Anonimiza conteúdo usando NER
 * TODO: Substituir por integração real com spaCy/serviço NER
 */
async function anonymizeContent(content: string): Promise<{
  anonymizedContent: string;
  entitiesDetected: NEREntity[];
  sensitiveDataFound: boolean;
}> {
  const entities: NEREntity[] = [];
  let anonymized = content;

  // Regex para CPF: XXX.XXX.XXX-XX
  const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
  let match;
  while ((match = cpfRegex.exec(content)) !== null) {
    entities.push({
      type: "cpf",
      value: "[REDACTED]",
      position: [match.index, match.index + match[0].length],
      action: "redacted",
      confidence: 0.99,
    });
    anonymized = anonymized.replace(match[0], "[CPF_REDACTED]");
  }

  // Regex para telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const phoneRegex = /\(\d{2}\)\s?\d{4,5}-?\d{4}/g;
  while ((match = phoneRegex.exec(content)) !== null) {
    entities.push({
      type: "phone",
      value: "[REDACTED]",
      position: [match.index, match.index + match[0].length],
      action: "redacted",
      confidence: 0.95,
    });
    anonymized = anonymized.replace(match[0], "[PHONE_REDACTED]");
  }

  // Regex para email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  while ((match = emailRegex.exec(content)) !== null) {
    entities.push({
      type: "email",
      value: "[REDACTED]",
      position: [match.index, match.index + match[0].length],
      action: "redacted",
      confidence: 0.98,
    });
    anonymized = anonymized.replace(match[0], "[EMAIL_REDACTED]");
  }

  // Regex para RG: XX.XXX.XXX-X
  const rgRegex = /\b\d{2}\.\d{3}\.\d{3}-\d{1}\b/g;
  while ((match = rgRegex.exec(content)) !== null) {
    entities.push({
      type: "rg",
      value: "[REDACTED]",
      position: [match.index, match.index + match[0].length],
      action: "redacted",
      confidence: 0.90,
    });
    anonymized = anonymized.replace(match[0], "[RG_REDACTED]");
  }

  return {
    anonymizedContent: anonymized,
    entitiesDetected: entities,
    sensitiveDataFound: entities.length > 0,
  };
}

/**
 * Chama modelo de IA para gerar resposta
 * TODO: Implementar integração real com API de IA
 */
async function callAIModel(
  content: string,
  conversationId: string
): Promise<{
  aiResponse: string;
  tokensUsed: number;
  modelUsed: string;
  confidenceScore: number;
}> {
  // Placeholder — substituir por chamada real à API
  // Em produção: montar prompt com contexto da conversa, chamar API, parsear resposta

  return {
    aiResponse:
      "⚠️ DISCLAIMER: Este é um auxílio ao diagnóstico e não substitui a avaliação clínica.\n\n" +
      "[Resposta da IA será gerada aqui após integração com modelo de linguagem]\n\n" +
      "Com base nos sintomas/sinais informados, os diagnósticos diferenciais sugeridos são:\n" +
      "1. [Diagnóstico diferencial 1]\n" +
      "2. [Diagnóstico diferencial 2]\n" +
      "3. [Diagnóstico diferencial 3]\n\n" +
      "Exames complementares sugeridos: [lista de exames]\n\n" +
      "🔒 Nenhum dado pessoal identificável foi armazenado nesta interação.",
    tokensUsed: 0,
    modelUsed: "placeholder-model-v1",
    confidenceScore: 0.0,
  };
}
