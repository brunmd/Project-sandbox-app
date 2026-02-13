// ============================================================================
// StaiDOC — CORS Configuration (Seguranca)
// ============================================================================
// LGPD Art. 46: Protecao contra acessos nao autorizados
// Apenas dominios autorizados podem fazer requisicoes ao backend
// ============================================================================

const ALLOWED_ORIGINS = [
  "https://staidoc.app",
  "https://www.staidoc.app",
  "https://sandboxapp.lovable.app",
  // Lovable preview URLs seguem este padrao
];

/**
 * Verifica se a origem e permitida.
 * Aceita dominios exatos da lista e qualquer subdominio *.lovable.app
 * (necessario para os previews dinamicos do Lovable).
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Permitir qualquer preview do Lovable (*.lovable.app)
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  return false;
}

/**
 * Retorna headers CORS dinamicos baseados na origem da requisicao.
 * Se a origem nao for permitida, retorna header vazio (browser bloqueia).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowed = isOriginAllowed(origin);

  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    ...(allowed ? { "Vary": "Origin" } : {}),
  };
}

/**
 * Headers estaticos para compatibilidade com imports existentes.
 * @deprecated Use getCorsHeaders(req) para seguranca dinamica.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://staidoc.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
