// ============================================================================
// StaiDOC — Modulo de Anonimizacao (NER + REGEX) v2 — Security Hardened
// Camada de protecao ANTES do texto ir para a API da Anthropic
// ============================================================================
// Dupla protecao:
//   1. Este modulo remove dados sensiveis via REGEX (camada tecnica)
//   2. O prompt mestre instrui a IA a ignorar qualquer PII remanescente (camada logica)
// ============================================================================
// Melhorias v2:
//   - Contexto medico: evita falsos positivos com dados clinicos
//   - Posicoes calculadas no texto ORIGINAL (nao no modificado)
//   - Deteccao de CPF sem formatacao (11 digitos consecutivos)
// ============================================================================

export interface DetectedEntity {
  type: "cpf" | "phone" | "email" | "rg" | "name" | "address";
  original_length: number;
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

// ============================================================================
// REGEX patterns
// ============================================================================

// CPF: 000.000.000-00 ou 00000000000
const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

// Telefone: (00) 00000-0000 ou (00) 0000-0000 ou variacoes
const PHONE_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/g;

// Email
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// RG: 00.000.000-0 ou variacoes
const RG_REGEX = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g;

// CEP: 00000-000 ou 00000000
const CEP_REGEX = /\b\d{5}-?\d{3}\b/g;

// Enderecos: padroes com Rua, Av., Alameda, etc.
const ADDRESS_REGEX =
  /\b(?:Rua|Avenida|Av\.|Alameda|Al\.|Travessa|Tv\.|Praca|Pca\.|Rodovia|Rod\.|Estrada|Est\.)\s+[A-Za-z\u00C0-\u00FF\s]+(?:,\s*(?:n[\u00B0\u00BAo]?\s*)?\d+)?(?:\s*[-,]\s*(?:apto?|apartamento|sala|bloco|conj\.?)\s*\d+)?/gi;

// Prontuario: variacoes de numero de prontuario/registro
const PRONTUARIO_REGEX =
  /(?:prontu[a\u00E1]rio|registro|matr[i\u00ED]cula|n[\u00B0\u00BAo]?\s*(?:do\s+)?(?:prontu[a\u00E1]rio|registro))[\s:]*\d+/gi;

// Nomes apos indicadores: "paciente Maria", "Sr. Joao", etc.
const NAME_INDICATOR_REGEX =
  /(?:(?:paciente|sr\.?a?|dr\.?a?|nome|chamad[ao])\s+)([A-Z\u00C0-\u0178][a-z\u00E0-\u00FF]+(?:\s+(?:d[aeo]s?\s+)?[A-Z\u00C0-\u0178][a-z\u00E0-\u00FF]+){1,5})/gi;

// ============================================================================
// Contexto medico: padroes que NAO devem ser anonimizados
// ============================================================================
// Previne falsos positivos com dados clinicos como pressao arterial,
// frequencia cardiaca, temperatura, saturacao, glicemia, etc.
const MEDICAL_CONTEXT_PATTERNS = [
  /(?:press[a\u00E3]o|pa|pas|pad)\s*[:=]?\s*\d/i,
  /(?:fc|frequencia|frequ[e\u00EA]ncia)\s*[:=]?\s*\d/i,
  /(?:temperatura|temp)\s*[:=]?\s*\d/i,
  /(?:satura[c\u00E7][a\u00E3]o|spo2|sat)\s*[:=]?\s*\d/i,
  /(?:glicemia|hgt|dextro)\s*[:=]?\s*\d/i,
  /(?:hemoglobina|hb|hg)\s*[:=]?\s*\d/i,
  /(?:creatinina|cr)\s*[:=]?\s*\d/i,
  /(?:ureia|ur)\s*[:=]?\s*\d/i,
  /(?:leucocitos|leuco)\s*[:=]?\s*\d/i,
  /(?:plaquetas|plaq)\s*[:=]?\s*\d/i,
  /(?:inr|tp|ttpa)\s*[:=]?\s*\d/i,
  /\d+\s*(?:mg|ml|mcg|ui|mmhg|bpm|rpm|kg|cm|mm|g\/dl|mg\/dl|meq|mmol)/i,
];

/**
 * Verifica se uma posicao no texto esta dentro de contexto medico.
 * Se estiver, o match nao deve ser anonimizado (falso positivo).
 */
function isInMedicalContext(content: string, matchStart: number): boolean {
  // Analisar 40 caracteres antes e 20 depois do match
  const contextBefore = content.slice(Math.max(0, matchStart - 40), matchStart);
  const contextAfter = content.slice(matchStart, matchStart + 20);
  const context = contextBefore + contextAfter;

  return MEDICAL_CONTEXT_PATTERNS.some((pattern) => pattern.test(context));
}

// ============================================================================
// Tipos para coleta antes da substituicao
// ============================================================================
interface PendingRedaction {
  start: number;
  end: number;
  replacement: string;
  entity: DetectedEntity;
}

/**
 * Anonimiza o conteudo removendo dados pessoais identificaveis.
 * Retorna o texto limpo e os metadados de deteccao para os logs.
 *
 * v2: Coleta todos os matches primeiro, depois aplica substituicoes
 *     de tras para frente para manter posicoes corretas.
 */
export function anonymizeContent(content: string): AnonymizationResult {
  const redactions: PendingRedaction[] = [];
  let privacyWarningTriggered = false;

  // ========================================================================
  // FASE 1: Coletar todos os matches (sem modificar o texto)
  // ========================================================================

  // 1. CPF
  for (const match of content.matchAll(CPF_REGEX)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length === 11 && match.index !== undefined) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[CPF REMOVIDO]",
        entity: {
          type: "cpf",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.98,
          method: "REGEX",
        },
      });
    }
  }

  // 2. Email
  for (const match of content.matchAll(EMAIL_REGEX)) {
    if (match.index !== undefined) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[EMAIL REMOVIDO]",
        entity: {
          type: "email",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.97,
          method: "REGEX",
        },
      });
    }
  }

  // 3. Telefone (com verificacao de contexto medico)
  for (const match of content.matchAll(PHONE_REGEX)) {
    const digits = match[0].replace(/\D/g, "");
    if (
      digits.length >= 10 &&
      digits.length <= 13 &&
      match.index !== undefined &&
      !isInMedicalContext(content, match.index)
    ) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[TELEFONE REMOVIDO]",
        entity: {
          type: "phone",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.93,
          method: "REGEX",
        },
      });
    }
  }

  // 4. RG (com verificacao de contexto medico)
  for (const match of content.matchAll(RG_REGEX)) {
    const digits = match[0].replace(/\D/g, "");
    if (
      digits.length >= 7 &&
      digits.length <= 9 &&
      match.index !== undefined &&
      !isInMedicalContext(content, match.index)
    ) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[RG REMOVIDO]",
        entity: {
          type: "rg",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.85,
          method: "REGEX",
        },
      });
    }
  }

  // 5. Enderecos
  for (const match of content.matchAll(ADDRESS_REGEX)) {
    if (match.index !== undefined) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[ENDERECO REMOVIDO]",
        entity: {
          type: "address",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.88,
          method: "REGEX",
        },
      });
    }
  }

  // 6. CEP (com verificacao de contexto medico)
  for (const match of content.matchAll(CEP_REGEX)) {
    const digits = match[0].replace(/\D/g, "");
    if (
      digits.length === 8 &&
      match.index !== undefined &&
      !isInMedicalContext(content, match.index)
    ) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[CEP REMOVIDO]",
        entity: {
          type: "address",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.90,
          method: "REGEX",
        },
      });
    }
  }

  // 7. Prontuario
  for (const match of content.matchAll(PRONTUARIO_REGEX)) {
    if (match.index !== undefined) {
      redactions.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: "[PRONTUARIO REMOVIDO]",
        entity: {
          type: "name",
          original_length: match[0].length,
          action: "redacted",
          confidence: 0.92,
          method: "REGEX",
        },
      });
    }
  }

  // 8. Nomes apos indicadores
  for (const match of content.matchAll(NAME_INDICATOR_REGEX)) {
    if (match.index !== undefined && match[1]) {
      const fullMatch = match[0];
      const name = match[1];
      const indicator = fullMatch.slice(0, fullMatch.length - name.length);
      redactions.push({
        start: match.index,
        end: match.index + fullMatch.length,
        replacement: `${indicator}[NOME REMOVIDO]`,
        entity: {
          type: "name",
          original_length: name.length,
          action: "redacted",
          confidence: 0.80,
          method: "REGEX_CONTEXTUAL",
        },
      });
    }
  }

  // ========================================================================
  // FASE 2: Remover sobreposicoes (manter o match mais especifico)
  // ========================================================================
  redactions.sort((a, b) => a.start - b.start);
  const filtered: PendingRedaction[] = [];
  let lastEnd = -1;

  for (const r of redactions) {
    if (r.start >= lastEnd) {
      filtered.push(r);
      lastEnd = r.end;
    }
    // Se sobrepoe, descarta (o anterior, mais especifico, ja foi adicionado)
  }

  // ========================================================================
  // FASE 3: Aplicar substituicoes de tras para frente (preserva posicoes)
  // ========================================================================
  let anonymized = content;
  const entities: DetectedEntity[] = [];

  // Processar de tras para frente para nao invalidar offsets
  for (let i = filtered.length - 1; i >= 0; i--) {
    const r = filtered[i];
    anonymized =
      anonymized.slice(0, r.start) + r.replacement + anonymized.slice(r.end);
    entities.unshift(r.entity); // unshift para manter ordem original
    privacyWarningTriggered = true;
  }

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
