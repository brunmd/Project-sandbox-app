# Sistema de Verificação de Referências Bibliográficas — StaiDOC

## Documento Técnico para a Autoridade Nacional de Proteção de Dados (ANPD)

**Empresa:** Prevvine Tratamento de Dados Ltda.
**Projeto:** StaiDOC — Assistente de Suporte ao Diagnóstico Médico
**Sandbox Regulatório:** Edital 02/2025
**Data:** Fevereiro de 2026

---

## 1. Contexto e Motivação

A StaiDOC é uma ferramenta de suporte ao diagnóstico médico que utiliza Inteligência Artificial (modelo Claude, da Anthropic) para auxiliar profissionais de saúde na formulação de hipóteses diagnósticas. Toda resposta gerada pela IA inclui referências bibliográficas da base PubMed (National Center for Biotechnology Information — NCBI/NIH), permitindo que o médico verifique a fundamentação científica das sugestões.

### Problema Identificado

Modelos de linguagem de grande escala (LLMs) possuem uma limitação técnica conhecida: **não são capazes de mapear corretamente metadados de artigos científicos (título, autores, ano) para seus identificadores únicos (PMIDs — PubMed Identifiers)**. Isso ocorre porque:

- LLMs geram texto baseado em padrões estatísticos, não em consultas a bancos de dados;
- PMIDs são identificadores numéricos arbitrários que não possuem relação semântica com o conteúdo do artigo;
- O modelo pode gerar um PMID que aparenta ser correto, mas que na realidade aponta para um artigo completamente diferente.

Esta limitação configura um **risco à transparência** (Art. 6, VI da LGPD) e à **explicabilidade das decisões automatizadas** (Art. 20 da LGPD), pois referências incorretas comprometem a rastreabilidade e a verificabilidade da fundamentação científica.

---

## 2. Solução Implementada: Arquitetura NTAV

Para mitigar completamente este risco, a StaiDOC implementou a arquitetura **NTAV (Never Trust, Always Verify)** — um sistema de verificação em duas fases que elimina a possibilidade de referências bibliográficas incorretas.

### Fase 1 — Geração Controlada (IA)

O modelo de IA é instruído, via prompt de sistema, a **nunca utilizar PMIDs numéricos diretos** em nenhuma referência. Em vez disso, todas as referências são geradas como **URLs de busca PubMed**, no formato:

```
https://pubmed.ncbi.nlm.nih.gov/?term=Autor+Palavras-chave+Revista+Ano
```

Este formato garante que, mesmo sem verificação posterior, o link **sempre levará a resultados relevantes** no PubMed, pois a busca é feita pelos termos descritivos do artigo.

**Exemplo:**
- Em vez de: `https://pubmed.ncbi.nlm.nih.gov/34447992/` (PMID que pode estar errado)
- O sistema gera: `https://pubmed.ncbi.nlm.nih.gov/?term=McDonagh+ESC+Guidelines+heart+failure+European+Heart+Journal+2021`

### Fase 2 — Verificação Automatizada (Backend)

Após a IA gerar a resposta completa com referências no formato de busca, o backend da StaiDOC executa automaticamente um processo de verificação utilizando a **API pública E-utilities do NCBI/NIH** (National Institutes of Health, governo dos EUA).

O processo de verificação consiste em:

1. **Extração**: Identificação de todas as URLs de busca PubMed presentes na resposta;
2. **Busca (esearch)**: Para cada URL, consulta à API `esearch.fcgi` do PubMed com os termos de busca extraídos;
3. **Validação (esummary)**: Para cada resultado encontrado, consulta à API `esummary.fcgi` para obter os metadados completos do artigo (título, autores, revista, ano, DOI);
4. **Substituição**: As URLs de busca são substituídas por links diretos ao PMID verificado (`https://pubmed.ncbi.nlm.nih.gov/{PMID}/`);
5. **Fallback Seguro**: Caso a verificação não encontre correspondência, a URL de busca original é mantida (continua funcional e relevante).

### Diagrama do Fluxo

```
Médico envia pergunta clínica
        │
        ▼
   ┌─────────────┐
   │  IA (Claude) │ ← Prompt: "NUNCA use PMIDs, use URLs de busca"
   └──────┬──────┘
          │ Resposta com URLs de busca PubMed
          ▼
   ┌─────────────────────────────┐
   │ Verificação PubMed E-utils  │ ← API pública NCBI/NIH (gratuita)
   │ esearch → esummary → PMID   │
   └──────┬──────────────────────┘
          │ Resposta com PMIDs VERIFICADOS
          ▼
   ┌─────────────────────┐
   │ Banco de Dados       │ ← Armazena versão verificada
   │ + Log de Auditoria   │ ← Registra cada verificação
   └──────┬──────────────┘
          │
          ▼
   Médico recebe resposta com referências verificáveis
```

---

## 3. Garantias de Conformidade com a LGPD

### Art. 6, II — Adequação
As referências bibliográficas são compatíveis com o contexto clínico da consulta. A verificação via PubMed E-utilities garante que cada referência aponta para um artigo real e relevante ao tema discutido.

### Art. 6, V — Qualidade dos Dados
O sistema verifica ativamente a precisão das referências, não confiando na capacidade do LLM de gerar identificadores corretos. Referências que não podem ser verificadas são sinalizadas e mantêm o formato de busca (funcional, porém não verificado).

### Art. 6, VI — Transparência
- Cada referência é clicável e leva diretamente ao artigo no PubMed (base de acesso público);
- O profissional de saúde pode verificar independentemente qualquer referência citada;
- O sistema registra para cada verificação: os termos de busca utilizados, o PMID encontrado, o nível de confiança (verificado vs. fallback), e os metadados completos do artigo.

### Art. 20 — Explicabilidade de Decisões Automatizadas
O log de explicabilidade (`explainability_logs`) registra, para cada interação:
- O modelo de IA utilizado e seus parâmetros;
- Um resumo da verificação de referências (quantas verificadas, quantas em fallback);
- O disclaimer de que a ferramenta é de suporte — o diagnóstico final é responsabilidade exclusiva do profissional de saúde (Human-in-the-Loop);
- O nível de confiança da resposta.

### Art. 37 — Registro de Operações de Tratamento (ROPA)
Todas as operações de verificação são registradas em logs de auditoria imutáveis (insert-only), incluindo:
- Timestamp de cada verificação;
- Termos de busca utilizados;
- PMIDs encontrados e validados;
- Confiança da verificação (VERIFIED ou FALLBACK);
- Metadados dos artigos (título, autores, revista, ano, DOI).

---

## 4. Especificações Técnicas

### API Utilizada
- **PubMed E-utilities** (NCBI/NIH): https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
- **Custo**: Gratuita (API pública do governo dos Estados Unidos)
- **Rate Limit**: 3 requisições/segundo sem chave de API; 10 requisições/segundo com chave
- **Disponibilidade**: 24/7, mantida pelo governo federal dos EUA

### Endpoints
1. `esearch.fcgi` — Busca por termos, retorna lista de PMIDs correspondentes
2. `esummary.fcgi` — Detalhes de um artigo por PMID (título, autores, DOI, etc.)

### Taxa de Verificação Esperada
- **>90% das referências** são verificadas com sucesso (PMID real confirmado)
- **<10% em fallback** — mantêm URL de busca funcional (o usuário ainda encontra artigos relevantes)
- O fallback NÃO é falha — é uma degradação controlada que mantém a usabilidade

### Armazenamento
- A versão **verificada** da resposta é armazenada no banco de dados
- O log de verificação é armazenado em `explainability_logs` (campo `explanation_content`)
- Ambos são protegidos por Row Level Security (RLS) e criptografia em trânsito (TLS)

---

## 5. Vantagens sobre Abordagens Alternativas

| Abordagem | Risco | StaiDOC (NTAV) |
|-----------|-------|-----------------|
| LLM gera PMIDs diretos | Alto — PMIDs frequentemente incorretos | Eliminado — PMIDs nunca gerados pelo LLM |
| Sem referências | Médio — sem fundamentação científica | N/A — referências sempre presentes |
| RAG com base local | Baixo-médio — base pode estar desatualizada | Melhor — consulta PubMed em tempo real |
| Apenas URLs de busca | Baixo — funcional mas não verificado | Melhor — busca verificada + PMID quando possível |

---

## 6. Conclusão

A arquitetura NTAV da StaiDOC representa uma abordagem de segurança em camadas para o problema de referências bibliográficas em sistemas de IA:

1. **Camada 1 (Prevenção)**: O modelo de IA é impedido de gerar PMIDs diretos, eliminando a fonte de erro;
2. **Camada 2 (Verificação)**: O backend verifica cada referência contra a base PubMed oficial;
3. **Camada 3 (Fallback Seguro)**: Referências não verificadas mantêm formato funcional de busca;
4. **Camada 4 (Auditoria)**: Todo o processo é registrado em logs imutáveis para fiscalização.

Este sistema garante que o profissional de saúde sempre receba referências **verificáveis, rastreáveis e funcionais**, em conformidade com os princípios de transparência e explicabilidade da LGPD.

---

*Documento técnico elaborado para fins de demonstração de conformidade no âmbito do Sandbox Regulatório da ANPD (Edital 02/2025).*
