// ============================================================================
// StaiDOC — Edge Function: log-access (v2 — Security Hardened)
// Chamada no login/logout para gravar access_logs
// ============================================================================
// Conformidade: Marco Civil da Internet (Art. 15) — retencao minima 6 meses
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const VALID_ACTIONS = ["login", "logout", "session_refresh", "failed_login"];
const AUDIT_ACTION_MAP: Record<string, string> = {
  login: "login",
  logout: "logout",
  session_refresh: "login",
  failed_login: "login",
};

interface LogAccessRequest {
  action: string;
  session_duration_seconds?: number;
  failure_reason?: string;
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = (await req.json()) as LogAccessRequest;
    const { action, session_duration_seconds, failure_reason } = body;

    // Validar action (previne log poisoning)
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Acao invalida" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;
    let success = true;

    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      userId = user?.id ?? null;
    }

    if (action === "failed_login") {
      success = false;
    }

    // Extrair informacoes do request
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // =========================================================================
    // Gravar access_log e audit_log em paralelo
    // =========================================================================
    await Promise.allSettled([
      supabaseAdmin.from("access_logs").insert({
        user_id: userId,
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        geo_location: {},
        session_duration_seconds: session_duration_seconds ?? null,
        success,
        failure_reason: failure_reason ?? null,
      }),
      supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        action: AUDIT_ACTION_MAP[action] || "login",
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
      }),
    ]);

    return new Response(
      JSON.stringify({ success: true, action, logged_at: new Date().toISOString() }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro em log-access:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao registrar acesso" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
