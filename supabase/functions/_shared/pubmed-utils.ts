// ============================================================================
// StaiDOC — PubMed E-utilities Verification
// Verifica referências bibliográficas via API oficial NCBI/NIH
// ============================================================================
// API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
// Rate limit: 3 req/sec sem API key, 10 req/sec com API key
// Custo: GRATUITO (API pública do governo dos EUA)
// ============================================================================

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const RATE_LIMIT_MS = 400; // ~2.5 req/sec (margem de segurança)

// ============================================================================
// Tipos
// ============================================================================
export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
}

export interface VerifiedReference {
  refIndex: number; // posição no array de referências encontradas
  searchTerms: string;
  originalUrl: string;
  verifiedPmid: string | null;
  verifiedUrl: string;
  article: PubMedArticle | null;
  confidence: "VERIFIED" | "FALLBACK";
}

// ============================================================================
// Busca PubMed (esearch)
// ============================================================================
async function searchPubMed(query: string, maxResults = 1): Promise<string[]> {
  try {
    const url = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data?.esearchresult?.idlist || [];
  } catch (err) {
    console.error("[PubMed esearch] Error:", err);
    return [];
  }
}

// ============================================================================
// Detalhes do artigo (esummary)
// ============================================================================
async function getArticleSummary(
  pmid: string
): Promise<PubMedArticle | null> {
  try {
    const url = `${EUTILS_BASE}/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const article = data?.result?.[pmid];
    if (!article || article.error) return null;

    const authorList = (article.authors || []) as Array<{ name: string }>;
    const authorsStr =
      authorList
        .slice(0, 3)
        .map((a) => a.name)
        .join(", ") + (authorList.length > 3 ? ", et al" : "");

    return {
      pmid,
      title: (article.title || "").replace(/\.$/, ""), // remover ponto final
      authors: authorsStr,
      journal: article.source || "",
      year: (article.pubdate || "").split(" ")[0] || "",
      doi: (article.elocationid || "").replace("doi: ", ""),
    };
  } catch (err) {
    console.error("[PubMed esummary] Error:", err);
    return null;
  }
}

// ============================================================================
// Verificação de todas as referências no texto
// ============================================================================
/**
 * Encontra todas as URLs de busca PubMed no texto da resposta,
 * verifica cada uma via E-utilities, e substitui por PMID real quando possível.
 *
 * O texto original é retornado com URLs verificadas.
 * Um array de verificações é retornado para logging/auditoria.
 */
export async function verifyReferences(text: string): Promise<{
  verifiedText: string;
  verifications: VerifiedReference[];
  verifiedCount: number;
  fallbackCount: number;
}> {
  // Extrair todas as URLs de busca PubMed únicas
  const searchUrlRegex =
    /https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\?term=([^)\s]+)/g;
  const uniqueUrls = new Map<string, string>(); // url → decoded search terms

  let match;
  while ((match = searchUrlRegex.exec(text)) !== null) {
    const url = match[0];
    if (!uniqueUrls.has(url)) {
      const terms = decodeURIComponent(match[1]).replace(/\+/g, " ");
      uniqueUrls.set(url, terms);
    }
  }

  if (uniqueUrls.size === 0) {
    return { verifiedText: text, verifications: [], verifiedCount: 0, fallbackCount: 0 };
  }

  const verifications: VerifiedReference[] = [];
  let verifiedText = text;
  let verifiedCount = 0;
  let fallbackCount = 0;
  let refIndex = 0;

  for (const [searchUrl, terms] of uniqueUrls) {
    try {
      // 1. Buscar no PubMed
      const pmids = await searchPubMed(terms, 1);
      await delay(RATE_LIMIT_MS);

      if (pmids.length > 0) {
        // 2. Obter detalhes do artigo
        const article = await getArticleSummary(pmids[0]);
        await delay(RATE_LIMIT_MS);

        if (article) {
          const verifiedUrl = `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

          verifications.push({
            refIndex: refIndex++,
            searchTerms: terms,
            originalUrl: searchUrl,
            verifiedPmid: article.pmid,
            verifiedUrl,
            article,
            confidence: "VERIFIED",
          });

          // Substituir TODAS as ocorrências desta URL de busca pelo PMID verificado
          verifiedText = verifiedText.split(searchUrl).join(verifiedUrl);
          verifiedCount++;
          continue;
        }
      }

      // Fallback: manter URL de busca original (ainda é válida)
      verifications.push({
        refIndex: refIndex++,
        searchTerms: terms,
        originalUrl: searchUrl,
        verifiedPmid: null,
        verifiedUrl: searchUrl,
        article: null,
        confidence: "FALLBACK",
      });
      fallbackCount++;
    } catch (err) {
      console.error(`[PubMed] Verification error for "${terms}":`, err);
      verifications.push({
        refIndex: refIndex++,
        searchTerms: terms,
        originalUrl: searchUrl,
        verifiedPmid: null,
        verifiedUrl: searchUrl,
        article: null,
        confidence: "FALLBACK",
      });
      fallbackCount++;
    }
  }

  return { verifiedText, verifications, verifiedCount, fallbackCount };
}

// ============================================================================
// Utilitário
// ============================================================================
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
