// ============================================================================
// StaiDOC — Edge Function: log-access
// Chamada no login/logout para gravar access_logs
// ============================================================================
// Conformidade: Marco Civil da Internet (Art. 15) — retenção mínima 6 meses
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LogAccessRequest {
  action: "login" | "logout" | "session_refresh" | "failed_login";
  session_duration_seconds?: number;
  failure_reason?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Para failed_login, o usuário pode não estar autenticado
    const { action, session_duration_seconds, failure_reason } =
      await req.json() as LogAccessRequest;

    let userId: string | null = null;
    let success = true;

    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabaseUser.auth.getUser();
      userId = user?.id ?? null;
    }

    // Para failed_login, não temos user_id
    if (action === "failed_login") {
      success = false;
    }

    // Extrair informações do request
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent");

    // Geolocalização básica (placeholder — usar serviço de GeoIP em produção)
    const geoLocation = ipAddress
      ? { ip: ipAddress, note: "GeoIP lookup pendente" }
      : {};

    // =========================================================================
    // Gravar access_log
    // =========================================================================

    const { error: logError } = await supabaseAdmin.from("access_logs").insert({
      user_id: userId,
      action,
      ip_address: ipAddress,
      user_agent: userAgent,
      geo_location: geoLocation,
      session_duration_seconds: session_duration_seconds ?? null,
      success,
      failure_reason: failure_reason ?? null,
    });

    if (logError) throw logError;

    // =========================================================================
    // Gravar audit_log correspondente
    // =========================================================================

    const auditAction = action === "login" ? "login" : action === "logout" ? "logout" : action;

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: auditAction === "login" || auditAction === "logout" ? auditAction : "login",
      resource_type: "access_logs",
      resource_id: null,
      details: {
        access_action: action,
        success,
        failure_reason: failure_reason ?? null,
        session_duration_seconds: session_duration_seconds ?? null,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return new Response(
      JSON.stringify({ success: true, action, logged_at: new Date().toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro em log-access:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao registrar acesso" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
