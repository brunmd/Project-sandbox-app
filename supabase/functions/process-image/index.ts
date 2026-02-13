// ============================================================================
// StaiDOC — Edge Function: process-image
// Recebe imagem → gera hash → envia para IA → descarta imagem → grava log
// ============================================================================
// IMPORTANTE: A imagem NUNCA é armazenada. É processada em memória e descartada.
// O log comprova que a imagem existiu, foi processada e foi descartada.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Ler FormData (imagem + metadados)
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const conversationId = formData.get("conversation_id") as string;
    const messageId = formData.get("message_id") as string | null;
    const purpose = (formData.get("purpose") as string) || "diagnostic_aid";

    if (!imageFile || !conversationId) {
      return new Response(
        JSON.stringify({ error: "image e conversation_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
      return new Response(
        JSON.stringify({
          error: `Tipo de imagem não permitido: ${imageFile.type}`,
          allowed: ALLOWED_MIME_TYPES,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar tamanho
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `Imagem excede o tamanho máximo de ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar que a conversa pertence ao usuário
    const { data: conversation, error: convError } = await supabaseUser
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada ou sem permissão" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processedAt = new Date().toISOString();
    const processingStart = Date.now();

    // =========================================================================
    // ETAPA 1: Ler imagem em memória e gerar hash
    // =========================================================================

    const imageBuffer = await imageFile.arrayBuffer();
    const imageHash = await sha256Buffer(imageBuffer);

    // =========================================================================
    // ETAPA 2: Enviar para IA processar (em memória)
    // =========================================================================
    // TODO: Integrar com API de IA que aceita imagens (GPT-4V, Claude Vision, etc.)

    const { aiResult, modelUsed } = await processImageWithAI(
      imageBuffer,
      imageFile.type,
      purpose
    );

    // =========================================================================
    // ETAPA 3: DESCARTAR imagem da memória
    // =========================================================================
    // O ArrayBuffer sai de escopo e será coletado pelo GC.
    // Marcamos o momento exato do descarte.
    const discardedAt = new Date().toISOString();
    const processingDuration = Date.now() - processingStart;

    // =========================================================================
    // ETAPA 4: Gravar log de processamento (prova de descarte)
    // =========================================================================

    await supabaseAdmin.from("image_processing_logs").insert({
      user_id: userId,
      conversation_id: conversationId,
      message_id: messageId,
      image_hash: imageHash,
      image_size_bytes: imageFile.size,
      image_mime_type: imageFile.type,
      purpose,
      processed_at: processedAt,
      discarded_at: discardedAt,
      processing_duration_ms: processingDuration,
      ai_model_used: modelUsed,
      storage_proof: "processed_in_memory",
    });

    // =========================================================================
    // ETAPA 5: Log de auditoria
    // =========================================================================

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "image_processed",
      resource_type: "image_processing_logs",
      resource_id: null,
      details: {
        conversation_id: conversationId,
        image_hash: imageHash,
        image_size_bytes: imageFile.size,
        image_mime_type: imageFile.type,
        purpose,
        processing_duration_ms: processingDuration,
        storage_proof: "processed_in_memory",
      },
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent"),
    });

    // Segundo log para o descarte
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "image_discarded",
      resource_type: "image_processing_logs",
      resource_id: null,
      details: {
        image_hash: imageHash,
        discarded_at: discardedAt,
        storage_proof: "processed_in_memory",
      },
    });

    // =========================================================================
    // RETORNO
    // =========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        ai_result: aiResult,
        model_used: modelUsed,
        image_hash: imageHash,
        processing_duration_ms: processingDuration,
        storage_proof: "processed_in_memory",
        discarded_at: discardedAt,
        disclaimer:
          "A imagem foi processada em memória e descartada imediatamente. " +
          "Nenhuma cópia foi armazenada. O hash SHA-256 comprova sua existência.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro em process-image:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar imagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Gera hash SHA-256 de um ArrayBuffer
 */
async function sha256Buffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Processa imagem com IA
 * TODO: Implementar integração real com API de visão (Claude Vision, GPT-4V, etc.)
 */
async function processImageWithAI(
  _imageBuffer: ArrayBuffer,
  _mimeType: string,
  _purpose: string
): Promise<{ aiResult: string; modelUsed: string }> {
  // Placeholder — substituir por chamada real à API de visão
  return {
    aiResult:
      "⚠️ DISCLAIMER: Análise de imagem como auxílio diagnóstico. Não substitui avaliação clínica.\n\n" +
      "[Resultado da análise de imagem será gerado aqui após integração com modelo de visão]\n\n" +
      "🔒 A imagem foi processada em memória e descartada imediatamente.",
    modelUsed: "placeholder-vision-v1",
  };
}
