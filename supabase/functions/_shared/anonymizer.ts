// ============================================================================
// StaiDOC — Módulo de Anonimização (NER + REGEX)
// Camada de proteção ANTES do texto ir para a API da Anthropic
// ============================================================================
// Dupla proteção:
//   1. Este módulo remove dados sensíveis via REGEX (camada técnica)
//   2. O prompt mestre instrui a IA a ignorar qualquer PII remanescente (camada lógica)
// ============================================================================

export interface DetectedEntity {
  type: "cpf" | "phone" | "email" | "rg" | "name" | "address";
  original_length: number;
  position: [number, number];
  action: "redacted";
  confidence: number;
  method: string;
}

export interface AnonymizationResult {
  anonymizedContent: string;
  entities: DetectedEntity[];
  sensitiveDataFound: boolean;
  privacyWarningTriggered: boolean;
}

// CPF: 000.000.000-00 ou 00000000000
const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

// Telefone: (00) 00000-0000 ou (00) 0000-0000 ou variações
const PHONE_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/g;

// Email
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// RG: 00.000.000-0 ou variações
const RG_REGEX = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g;

// CEP: 00000-000 ou 00000000
const CEP_REGEX = /\b\d{5}-?\d{3}\b/g;

// Endereços: padrões com Rua, Av., Alameda, etc.
const ADDRESS_REGEX =
  /\b(?:Rua|Avenida|Av\.|Alameda|Al\.|Travessa|Tv\.|Praça|Pça\.|Rodovia|Rod\.|Estrada|Est\.)\s+[A-Za-zÀ-ÿ\s]+(?:,\s*(?:n[°ºo]?\s*)?\d+)?(?:\s*[-,]\s*(?:apto?|apartamento|sala|bloco|conj\.?)\s*\d+)?/gi;

// Prontuário: variações de número de prontuário/registro
const PRONTUARIO_REGEX =
  /(?:prontu[aá]rio|registro|matr[ií]cula|n[°ºo]?\s*(?:do\s+)?(?:prontu[aá]rio|registro))[\s:]*\d+/gi;

// Nomes após indicadores: "paciente Maria", "Sr. João", etc.
const NAME_INDICATOR_REGEX =
  /(?:(?:paciente|sr\.?a?|dr\.?a?|nome|chamad[ao])\s+)([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ÿ][a-zà-ÿ]+){1,5})/gi;

/**
 * Anonimiza o conteúdo removendo dados pessoais identificáveis.
 * Retorna o texto limpo e os metadados de detecção para os logs.
 */
export function anonymizeContent(content: string): AnonymizationResult {
  const entities: DetectedEntity[] = [];
  let anonymized = content;
  let privacyWarningTriggered = false;

  // Ordem de processamento: mais específicos primeiro para evitar conflitos

  // 1. CPF
  anonymized = anonymized.replace(CPF_REGEX, (match, offset) => {
    // Verificar se é realmente um CPF (11 dígitos) e não um número qualquer
    const digits = match.replace(/\D/g, "");
    if (digits.length === 11) {
      entities.push({
        type: "cpf",
        original_length: match.length,
        position: [offset, offset + match.length],
        action: "redacted",
        confidence: 0.98,
        method: "REGEX",
      });
      privacyWarningTriggered = true;
      return "[CPF REMOVIDO]";
    }
    return match;
  });

  // 2. Email
  anonymized = anonymized.replace(EMAIL_REGEX, (match, offset) => {
    entities.push({
      type: "email",
      original_length: match.length,
      position: [offset, offset + match.length],
      action: "redacted",
      confidence: 0.97,
      method: "REGEX",
    });
    privacyWarningTriggered = true;
    return "[EMAIL REMOVIDO]";
  });

  // 3. Telefone
  anonymized = anonymized.replace(PHONE_REGEX, (match, offset) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13) {
      entities.push({
        type: "phone",
        original_length: match.length,
        position: [offset, offset + match.length],
        action: "redacted",
        confidence: 0.93,
        method: "REGEX",
      });
      privacyWarningTriggered = true;
      return "[TELEFONE REMOVIDO]";
    }
    return match;
  });

  // 4. RG
  anonymized = anonymized.replace(RG_REGEX, (match, offset) => {
    const digits = match.replace(/\D/g, "");
    // RG tem entre 7 e 9 dígitos (varia por estado)
    // Evitar falso positivo com números clínicos curtos
    if (digits.length >= 7 && digits.length <= 9) {
      entities.push({
        type: "rg",
        original_length: match.length,
        position: [offset, offset + match.length],
        action: "redacted",
        confidence: 0.85,
        method: "REGEX",
      });
      privacyWarningTriggered = true;
      return "[RG REMOVIDO]";
    }
    return match;
  });

  // 5. Endereços (Rua, Av., etc.)
  anonymized = anonymized.replace(ADDRESS_REGEX, (match, offset) => {
    entities.push({
      type: "address",
      original_length: match.length,
      position: [offset, offset + match.length],
      action: "redacted",
      confidence: 0.88,
      method: "REGEX",
    });
    privacyWarningTriggered = true;
    return "[ENDERECO REMOVIDO]";
  });

  // 6. CEP
  anonymized = anonymized.replace(CEP_REGEX, (match, offset) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length === 8) {
      entities.push({
        type: "address",
        original_length: match.length,
        position: [offset, offset + match.length],
        action: "redacted",
        confidence: 0.90,
        method: "REGEX",
      });
      privacyWarningTriggered = true;
      return "[CEP REMOVIDO]";
    }
    return match;
  });

  // 7. Prontuário
  anonymized = anonymized.replace(PRONTUARIO_REGEX, (match, offset) => {
    entities.push({
      type: "name",
      original_length: match.length,
      position: [offset, offset + match.length],
      action: "redacted",
      confidence: 0.92,
      method: "REGEX",
    });
    privacyWarningTriggered = true;
    return "[PRONTUARIO REMOVIDO]";
  });

  // 8. Nomes após indicadores (paciente X, Sr. Y, etc.)
  anonymized = anonymized.replace(
    NAME_INDICATOR_REGEX,
    (match, name, offset) => {
      entities.push({
        type: "name",
        original_length: name.length,
        position: [offset, offset + match.length],
        action: "redacted",
        confidence: 0.80,
        method: "REGEX_CONTEXTUAL",
      });
      privacyWarningTriggered = true;
      // Preservar o indicador, remover o nome
      const indicator = match.slice(0, match.length - name.length);
      return `${indicator}[NOME REMOVIDO]`;
    }
  );

  return {
    anonymizedContent: anonymized,
    entities,
    sensitiveDataFound: entities.length > 0,
    privacyWarningTriggered,
  };
}

/**
 * Gera hash SHA-256 de texto (para provas de integridade)
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Gera hash SHA-256 de ArrayBuffer (para imagens)
 */
export async function sha256Buffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
