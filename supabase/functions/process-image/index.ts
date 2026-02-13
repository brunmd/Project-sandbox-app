// ============================================================================
// StaiDOC — Edge Function: process-image (v2 — Security Hardened)
// Recebe imagem → valida magic bytes → gera hash → envia para IA →
// descarta imagem com wipe seguro → grava log
// ============================================================================
// IMPORTANTE: A imagem NUNCA e armazenada. E processada em memoria e descartada.
// O log comprova que a imagem existiu, foi processada e foi descartada.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sha256Buffer } from "../_shared/anonymizer.ts";
import {
  isValidUUID,
  isValidAuthHeader,
  detectImageMimeType,
  secureWipeBuffer,
} from "../_shared/validation.ts";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (reduzido de 10MB para seguranca)
const ALLOWED_PURPOSES = ["diagnostic_aid", "clinical_image"];

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  let imageBuffer: ArrayBuffer | null = null;

  try {
    // Autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !isValidAuthHeader(authHeader)) {
      return errorResponse(cors, "Token de autenticacao ausente ou invalido", 401);
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
      return errorResponse(cors, "Usuario nao autenticado", 401);
    }

    const userId = user.id;

    // Ler FormData
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const conversationId = formData.get("conversation_id") as string;
    const messageId = formData.get("message_id") as string | null;
    const purpose = (formData.get("purpose") as string) || "diagnostic_aid";

    if (!imageFile || !conversationId) {
      return errorResponse(cors, "image e conversation_id sao obrigatorios", 400);
    }

    // Validar UUID
    if (!isValidUUID(conversationId)) {
      return errorResponse(cors, "Formato de conversation_id invalido", 400);
    }
    if (messageId && !isValidUUID(messageId)) {
      return errorResponse(cors, "Formato de message_id invalido", 400);
    }

    // Validar purpose
    if (!ALLOWED_PURPOSES.includes(purpose)) {
      return errorResponse(cors, "Tipo de proposito invalido", 400);
    }

    // Validar tamanho
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return errorResponse(
        cors,
        `Imagem excede o tamanho maximo de ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
        413
      );
    }

    // Verificar que a conversa pertence ao usuario (via RLS)
    const { data: conversation, error: convError } = await supabaseUser
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return errorResponse(cors, "Conversa nao encontrada ou sem permissao", 403);
    }

    const processedAt = new Date().toISOString();
    const processingStart = Date.now();

    // =========================================================================
    // ETAPA 1: Ler imagem em memoria e validar magic bytes
    // =========================================================================
    imageBuffer = await imageFile.arrayBuffer();

    // Validar tipo real da imagem pelos magic bytes (previne spoofing de MIME)
    const detectedMime = detectImageMimeType(imageBuffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      secureWipeBuffer(imageBuffer);
      return errorResponse(
        cors,
        "Arquivo nao e uma imagem valida (validacao de magic bytes falhou)",
        400
      );
    }

    const imageHash = await sha256Buffer(imageBuffer);

    // =========================================================================
    // ETAPA 2: Enviar para IA processar (em memoria)
    // =========================================================================
    const { aiResult, modelUsed } = await processImageWithAI(
      imageBuffer,
      detectedMime,
      purpose
    );

    // =========================================================================
    // ETAPA 3: DESCARTAR imagem com wipe seguro
    // =========================================================================
    secureWipeBuffer(imageBuffer);
    imageBuffer = null;
    const discardedAt = new Date().toISOString();
    const processingDuration = Date.now() - processingStart;

    // =========================================================================
    // ETAPA 4: Gravar logs em paralelo (prova de descarte)
    // =========================================================================
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    await Promise.allSettled([
      supabaseAdmin.from("image_processing_logs").insert({
        user_id: userId,
        conversation_id: conversationId,
        message_id: messageId,
        image_hash: imageHash,
        image_size_bytes: imageFile.size,
        image_mime_type: detectedMime,
        purpose,
        processed_at: processedAt,
        discarded_at: discardedAt,
        processing_duration_ms: processingDuration,
        ai_model_used: modelUsed,
        storage_proof: "processed_in_memory",
      }),
      supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        action: "image_processed",
        resource_type: "image_processing_logs",
        resource_id: null,
        details: {
          conversation_id: conversationId,
          image_size_bytes: imageFile.size,
          image_mime_type: detectedMime,
          purpose,
          processing_duration_ms: processingDuration,
          storage_proof: "processed_in_memory",
          discarded_at: discardedAt,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    ]);

    // =========================================================================
    // RETORNO
    // =========================================================================
    return new Response(
      JSON.stringify({
        success: true,
        ai_result: aiResult,
        model_used: modelUsed,
        processing_duration_ms: processingDuration,
        storage_proof: "processed_in_memory",
        discarded_at: discardedAt,
        disclaimer:
          "A imagem foi processada em memoria e descartada imediatamente. " +
          "Nenhuma copia foi armazenada.",
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Garantir wipe seguro mesmo em caso de erro
    if (imageBuffer) {
      secureWipeBuffer(imageBuffer);
    }
    console.error("Erro em process-image:", error);
    return errorResponse(getCorsHeaders(req), "Erro interno ao processar imagem", 500);
  }
});

// ============================================================================
// FUNCOES AUXILIARES
// ============================================================================

function errorResponse(
  cors: Record<string, string>,
  message: string,
  status: number
) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * Processa imagem com IA (Claude Vision)
 * TODO: Implementar integracao real com API Anthropic Vision
 */
async function processImageWithAI(
  _imageBuffer: ArrayBuffer,
  _mimeType: string,
  _purpose: string
): Promise<{ aiResult: string; modelUsed: string }> {
  return {
    aiResult:
      "DISCLAIMER: Analise de imagem como auxilio diagnostico. Nao substitui avaliacao clinica.\n\n" +
      "[Resultado da analise de imagem sera gerado aqui apos integracao com modelo de visao]\n\n" +
      "A imagem foi processada em memoria e descartada imediatamente.",
    modelUsed: "placeholder-vision-v1",
  };
}
