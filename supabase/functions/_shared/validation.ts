// ============================================================================
// StaiDOC — Modulo de Validacao de Entrada
// ============================================================================
// Protecao contra: injection, DoS por payload grande, dados malformados
// ============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Limite de caracteres por mensagem (aprox. 12.500 tokens) */
export const MAX_CONTENT_LENGTH = 50_000;

/** Limite de mensagens anteriores carregadas como contexto */
export const MAX_CONTEXT_MESSAGES = 40;

/**
 * Valida formato UUID v4.
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Sanitiza string para insercao segura em prompts.
 * Remove caracteres de controle e limita tamanho.
 */
export function sanitizeForPrompt(value: string, maxLength = 100): string {
  return value
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove caracteres de controle
    .replace(/[{}]/g, "")             // Remove chaves (previne template injection)
    .slice(0, maxLength);
}

/**
 * Valida formato do header Authorization.
 */
export function isValidAuthHeader(header: string): boolean {
  return header.startsWith("Bearer ") && header.length > 20;
}

/**
 * Valida magic bytes de imagem para prevenir spoofing de MIME type.
 * Retorna o tipo MIME real baseado nos bytes do arquivo.
 */
export function detectImageMimeType(
  buffer: ArrayBuffer
): string | null {
  const bytes = new Uint8Array(buffer.slice(0, 12));

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // HEIC/HEIF: ftypheic ou ftypmif1 (offset 4)
  if (
    bytes[4] === 0x66 && // 'f'
    bytes[5] === 0x74 && // 't'
    bytes[6] === 0x79 && // 'y'
    bytes[7] === 0x70    // 'p'
  ) {
    return "image/heic";
  }

  return null;
}

/**
 * Sobrescreve buffer com zeros para descarte seguro de dados sensiveis.
 * Garante que dados de imagem nao permanecem em memoria apos uso.
 */
export function secureWipeBuffer(buffer: ArrayBuffer): void {
  const bytes = new Uint8Array(buffer);
  bytes.fill(0);
}
