# FICHAS A1 E A2 — SANDBOX REGULATÓRIO ANPD
## Edital 02/2025 — Inteligência Artificial e Proteção de Dados Pessoais

**Projeto:** StaiDOC — Assistente Inteligente de Suporte ao Diagnóstico Médico
**Empresa:** Prevvine Tratamento de Dados Ltda.
**Data de Elaboração:** 14 de Fevereiro de 2026
**Versão:** 1.0

---

# FICHA A1 — IDENTIFICAÇÃO DO PROJETO

---

## 1. Dados da Empresa

| Campo | Informação |
|-------|------------|
| **Razão Social** | Prevvine Tratamento de Dados Ltda. |
| **CNPJ** | [A PREENCHER] |
| **Endereço** | [A PREENCHER — Endereço completo da sede] |
| **Cidade/UF** | [A PREENCHER] |
| **CEP** | [A PREENCHER] |
| **Telefone** | [A PREENCHER] |
| **E-mail institucional** | [A PREENCHER] |
| **Website** | https://staidoc.app |

---

## 2. Encarregado de Proteção de Dados (DPO)

| Campo | Informação |
|-------|------------|
| **Nome completo** | [A PREENCHER] |
| **Cargo** | Encarregado de Proteção de Dados Pessoais (Art. 41, LGPD) |
| **E-mail de contato** | [A PREENCHER — e-mail exclusivo para questões de proteção de dados] |
| **Telefone** | [A PREENCHER] |
| **Canal público para titulares** | [A PREENCHER — ex.: dpo@prevvine.com.br ou formulário web] |

---

## 3. Identificação do Projeto

| Campo | Informação |
|-------|------------|
| **Nome do Projeto** | StaiDOC — Assistente Inteligente de Suporte ao Diagnóstico Médico |
| **Sigla** | StaiDOC |
| **Domínio** | staidoc.app |
| **Sandbox Regulatório** | Edital 02/2025 — ANPD |
| **Tema do Edital** | Inteligência Artificial e Proteção de Dados Pessoais |
| **Período previsto do Sandbox** | [A PREENCHER — conforme cronograma aprovado pela ANPD] |
| **Fase atual** | Desenvolvimento e testes — Ciclos 1 a 3 em andamento |

---

## 4. Objetivo do Projeto

A StaiDOC é uma ferramenta de inteligência artificial projetada para auxiliar médicos no raciocínio diagnóstico. O profissional de saúde descreve os sintomas e sinais clínicos do paciente — sem informações pessoais identificáveis — e a ferramenta sugere hipóteses diagnósticas acompanhadas de referências bibliográficas verificadas na base PubMed (National Institutes of Health, governo dos EUA).

**A ferramenta NÃO substitui o médico.** Toda sugestão gerada pela IA é apresentada como apoio ao raciocínio clínico, e o diagnóstico final é responsabilidade exclusiva do profissional de saúde habilitado. Este modelo é conhecido como **Human-in-the-Loop** e está em conformidade com o Art. 20 da LGPD, que garante o direito à revisão humana de decisões automatizadas.

### 4.1. O que a StaiDOC faz

- Recebe descrições clínicas em texto livre (sintomas, sinais vitais, resultados de exames);
- Anonimiza automaticamente quaisquer dados pessoais antes do processamento pela IA;
- Gera hipóteses diagnósticas com fundamentação científica;
- Verifica automaticamente cada referência bibliográfica na base PubMed;
- Registra todas as operações em logs de auditoria imutáveis para fins de compliance.

### 4.2. O que a StaiDOC NÃO faz

- NÃO emite diagnósticos definitivos;
- NÃO prescreve medicamentos ou tratamentos;
- NÃO coleta ou armazena dados pessoais de pacientes (nome, CPF, endereço, telefone);
- NÃO substitui a consulta médica presencial;
- NÃO armazena imagens médicas — são processadas em memória e descartadas de forma segura.

---

## 5. Público-Alvo

| Campo | Informação |
|-------|------------|
| **Usuários diretos** | Médicos com registro ativo no Conselho Regional de Medicina (CRM) |
| **Cadastro obrigatório** | Número do CRM, estado de registro e especialidade médica |
| **Verificação** | O sistema coleta e registra o CRM durante o processo de onboarding |
| **Pacientes** | NÃO são usuários do sistema. Seus dados pessoais NÃO são coletados |
| **Abrangência geográfica** | Brasil (fase Sandbox) |

---

## 6. Dados Pessoais Tratados

### 6.1. Dados coletados dos médicos (titulares)

| Dado | Finalidade | Base Legal |
|------|------------|------------|
| Nome completo | Identificação do profissional | Art. 7, I (consentimento) |
| E-mail | Autenticação e comunicação | Art. 7, I (consentimento) |
| Número do CRM | Validação profissional | Art. 7, I (consentimento) |
| Estado do CRM | Validação profissional | Art. 7, I (consentimento) |
| Especialidade médica | Contextualização das respostas da IA | Art. 7, I (consentimento) |
| Endereço IP e user agent | Logs de segurança e auditoria | Art. 7, IX (legítimo interesse) + Marco Civil Art. 15 |
| Registros de consentimento | Prova de aceite informado | Art. 7, I e Art. 8 (consentimento) |

### 6.2. Dados processados (NÃO armazenados em forma identificável)

| Dado | Tratamento | Garantia |
|------|------------|----------|
| Texto clínico (sintomas, sinais) | Anonimizado antes do envio à IA | Hash SHA-256 como prova; texto original nunca armazenado |
| Imagens médicas (exames, radiografias) | Processadas em memória, descartadas após análise | Secure wipe (sobrescrita com zeros); hash como prova de existência e descarte |

### 6.3. Dados NÃO coletados (por design)

O sistema foi projetado desde a concepção (Privacy by Design) para **não coletar** os seguintes dados de pacientes:

- Nome do paciente
- CPF
- RG
- Endereço
- Telefone
- E-mail do paciente
- Número de prontuário

Caso algum desses dados seja incluído acidentalmente pelo médico na descrição clínica, o sistema de anonimização automática (camada REGEX) detecta e remove o dado **antes** de qualquer processamento pela IA.

---

## 7. Tecnologias Utilizadas

| Componente | Tecnologia | Finalidade |
|------------|------------|------------|
| **Infraestrutura** | Supabase (região sa-east-1, São Paulo) | Banco de dados, autenticação e funções serverless |
| **Banco de dados** | PostgreSQL 15+ com RLS | Armazenamento seguro com isolamento por médico |
| **Backend** | Supabase Edge Functions (Deno/TypeScript) | Processamento de mensagens, imagens e logs |
| **Frontend** | React (via Lovable) hospedado no GitHub | Interface do usuário |
| **Inteligência Artificial** | Claude Opus 4.6 (Anthropic) | Geração de hipóteses diagnósticas |
| **Autenticação** | Supabase Auth (e-mail/senha) | Login seguro dos médicos |
| **Verificação bibliográfica** | PubMed E-utilities (NCBI/NIH) | Validação de referências científicas |
| **Criptografia em trânsito** | TLS (HTTPS obrigatório) | Proteção das comunicações |
| **Criptografia em repouso** | AES-256 (gerenciado pelo Supabase) | Proteção dos dados armazenados |
| **Domínio** | staidoc.app com certificado SSL | Acesso público seguro |

---

## 8. Localização dos Dados

| Aspecto | Detalhe |
|---------|---------|
| **Região do banco de dados** | sa-east-1 (São Paulo, Brasil) |
| **Provedor de infraestrutura** | Supabase (hospedado em AWS região São Paulo) |
| **Processamento de IA** | API da Anthropic (dados enviados anonimizados) |
| **API PubMed** | Servidores do governo dos EUA (consulta pública, sem dados pessoais) |
| **Frontend** | CDN global (código estático, sem dados pessoais) |

**Nota sobre transferência internacional:** Os textos clínicos enviados à API da Anthropic são **previamente anonimizados** — não contêm dados pessoais identificáveis. A transferência é de dados clínicos sem identificação, o que mitiga os riscos associados à transferência internacional de dados pessoais.

---

## 9. Contato para a ANPD

| Função | Responsável | Contato |
|--------|-------------|---------|
| **Representante legal** | [A PREENCHER] | [A PREENCHER] |
| **Responsável técnico** | [A PREENCHER] | [A PREENCHER] |
| **Encarregado (DPO)** | [A PREENCHER] | [A PREENCHER] |
| **Canal de comunicação com titulares** | [A PREENCHER] | [A PREENCHER] |

---
---

# FICHA A2 — DESCRIÇÃO TÉCNICA DO PROJETO

---

## 1. Visão Geral da Arquitetura

A StaiDOC adota uma arquitetura de três camadas com separação clara de responsabilidades, princípios de Privacy by Design e mecanismos de auditoria integrados em cada etapa do processamento.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APRESENTAÇÃO                       │
│              Frontend React (hospedado via GitHub/Lovable)          │
│         Landing Page │ Login │ Consentimento │ Chat │ Conta         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS (TLS)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CAMADA DE PROCESSAMENTO                         │
│             Supabase Edge Functions (Deno/TypeScript)                │
│                                                                     │
│  ┌───────────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │  process-message   │  │ process-image │  │   log-access     │    │
│  │  (principal)       │  │ (imagens)     │  │   (login/logout) │    │
│  └────────┬──────────┘  └───────┬───────┘  └──────────────────┘    │
│           │                     │                                    │
│  ┌────────┴─────────────────────┴──────────────────────────────┐    │
│  │              MÓDULOS COMPARTILHADOS                          │    │
│  │  anonymizer.ts │ cors.ts │ master-prompt.ts │ validation.ts  │    │
│  │  pubmed-utils.ts                                             │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  Supabase        │ │  API Anthropic  │ │  API PubMed      │
│  PostgreSQL      │ │  (Claude Opus   │ │  (E-utilities    │
│  12 tabelas      │ │   4.6)          │ │   NCBI/NIH)      │
│  RLS ativo       │ │  Dados          │ │  Verificação     │
│  sa-east-1       │ │  anonimizados   │ │  de referências  │
└──────────────────┘ └─────────────────┘ └──────────────────┘
```

### 1.1. Componentes da Arquitetura

| Componente | Tecnologia | Descrição |
|------------|------------|-----------|
| **Frontend** | React (via Lovable) | Interface do médico: login, consentimento, chat com IA, gestão de conta. Hospedado no GitHub com deploy automático. Não armazena dados localmente. |
| **Backend** | Supabase Edge Functions (Deno/TypeScript) | 3 funções serverless que processam mensagens, imagens e logs de acesso. Executam anonimização, chamam a IA, verificam referências e gravam logs. |
| **Banco de dados** | PostgreSQL 15+ (Supabase, sa-east-1) | 12 tabelas (3 core + 9 compliance) com Row Level Security. Dados permanecem no Brasil. |
| **Autenticação** | Supabase Auth | Login por e-mail/senha. Sessões JWT com expiração automática. |
| **IA** | Claude Opus 4.6 (Anthropic) | Modelo de linguagem para geração de hipóteses diagnósticas. Recebe apenas texto anonimizado. |
| **Verificação bibliográfica** | PubMed E-utilities (NCBI/NIH) | API pública e gratuita para validação de referências científicas. |

---

## 2. Fluxo de Dados Detalhado

O processamento de cada mensagem do médico segue um fluxo sequencial com 7 etapas, cada uma com registro de auditoria:

```
ETAPA 1          ETAPA 2           ETAPA 3            ETAPA 4
Médico           Anonimização      API Anthropic      Verificação
digita   ───►    REGEX      ───►   Claude Opus  ───►  PubMed
mensagem         automática        4.6                 E-utilities
                 (anonymizer.ts)   (texto anon.)       (NTAV)
                      │                 │                   │
                      ▼                 ▼                   ▼
                 anonymization     explainability      Referências
                 _logs             _logs                verificadas
                      │                 │                   │
                      └────────┬────────┘                   │
                               ▼                            │
                 ETAPA 5                    ETAPA 6         │
                 Resposta com       ◄───    Substituição    │
                 referências                de links    ◄───┘
                 verificadas
                      │
                      ▼
                 ETAPA 7
                 Registro em
                 audit_logs
                 (imutável)
```

### Descrição de cada etapa:

**Etapa 1 — Entrada do médico:**
O médico digita uma descrição clínica no chat (sintomas, sinais vitais, resultados de exames). O frontend envia a mensagem via HTTPS para a Edge Function `process-message`.

**Etapa 2 — Anonimização automática (REGEX):**
O módulo `anonymizer.ts` analisa o texto e detecta padrões de dados pessoais usando expressões regulares. São detectados e removidos automaticamente: CPF (com e sem formatação), telefones (fixo e celular, com DDD), e-mails, RG, CEP, nomes próprios (quando precedidos de padrões como "paciente" ou "nome") e números de prontuário. Dados clínicos (pressão arterial, frequência cardíaca, temperatura) NÃO são removidos — são necessários para o diagnóstico. Um hash SHA-256 do texto original é gerado como prova de que a anonimização ocorreu. O texto original nunca é armazenado. A operação é registrada na tabela `anonymization_logs`.

**Etapa 3 — Processamento pela IA:**
O texto já anonimizado é enviado à API da Anthropic (modelo Claude Opus 4.6, temperatura 0.2, max_tokens 4096). O modelo recebe um prompt mestre (`master-prompt.ts`) que instrui a IA a: (a) atuar exclusivamente como assistente de suporte diagnóstico; (b) sempre incluir o disclaimer de que não substitui o médico; (c) nunca gerar PMIDs diretos, apenas URLs de busca PubMed; (d) ignorar quaisquer dados pessoais que eventualmente tenham passado pelo filtro técnico. A resposta é transmitida em tempo real via Server-Sent Events (SSE — streaming).

**Etapa 4 — Verificação de referências (NTAV):**
O módulo `pubmed-utils.ts` extrai todas as URLs de busca PubMed presentes na resposta da IA e consulta a API pública E-utilities do NCBI/NIH (governo dos EUA) para verificar cada referência. O processo utiliza dois endpoints: `esearch.fcgi` (busca por termos) e `esummary.fcgi` (metadados do artigo). Para cada referência, o sistema confirma a existência do artigo e obtém o PMID real.

**Etapa 5 — Substituição de links:**
As URLs de busca são substituídas por links diretos ao artigo verificado (formato `https://pubmed.ncbi.nlm.nih.gov/{PMID}/`). Caso a verificação não encontre correspondência, a URL de busca original é mantida como fallback seguro — ela continua funcional e leva a resultados relevantes.

**Etapa 6 — Armazenamento da resposta:**
A resposta final (com referências verificadas) é salva na tabela `messages` do banco de dados. O log de explicabilidade é registrado na tabela `explainability_logs` com: modelo utilizado, parâmetros, dados sensíveis detectados, resumo da verificação PubMed e tempo de processamento.

**Etapa 7 — Registro de auditoria:**
Um registro imutável (insert-only) é gravado na tabela `audit_logs` com: ação realizada, identificador do médico, timestamp, IP de origem e user agent. Esse registro nunca pode ser alterado ou excluído.

---

## 3. Fluxo de Processamento de Imagens

O processamento de imagens médicas segue um fluxo separado com garantia de descarte seguro:

```
Médico envia           Validação            Processamento        Descarte
imagem médica   ───►   de segurança   ───►  em memória     ───►  seguro
(exame, RX)            (magic bytes,        (Claude Vision)      (secure wipe:
                        5MB máx,                                  bytes → zeros)
                        3 imgs máx)              │                     │
                                                 ▼                     ▼
                                           Resposta com          image_processing
                                           análise clínica       _logs (hash,
                                                                  timestamps,
                                                                  storage_proof:
                                                                  "processed_in
                                                                  _memory")
```

**Garantias de segurança para imagens:**
- A imagem é validada por "magic bytes" (verificação do tipo real do arquivo, não apenas da extensão);
- Limite de 3 imagens por mensagem e 5MB por imagem;
- A imagem é processada exclusivamente em memória (RAM) — nunca toca o disco;
- Após o processamento, cada byte da imagem é sobrescrito por zero (secure wipe);
- Um hash SHA-256 é gerado como prova de existência e descarte;
- O registro de processamento inclui timestamps de recebimento, processamento e descarte;
- O campo `storage_proof` é definido como `"processed_in_memory"` — prova técnica de que a imagem nunca foi armazenada.

---

## 4. Banco de Dados — Estrutura Completa

### 4.1. Visão geral das 12 tabelas

O banco de dados PostgreSQL está organizado em dois grupos: tabelas core (funcionalidade principal) e tabelas de compliance (auditoria e conformidade LGPD).

#### Tabelas Core (3)

| Tabela | Finalidade | RLS | Relação |
|--------|-----------|-----|---------|
| `profiles` | Perfil do médico (nome, CRM, estado, especialidade). Criado automaticamente após o cadastro via trigger. | Médico acessa apenas seu próprio perfil | 1:1 com auth.users |
| `conversations` | Sessões de chat entre médico e IA. Cada conversa possui status (ativa, completada, arquivada). | Médico acessa apenas suas próprias conversas | 1:N com profiles |
| `messages` | Mensagens individuais (já anonimizadas). Contém: conteúdo, hash do conteúdo, papel (user/assistant), tokens utilizados e modelo da IA. | Médico acessa apenas mensagens das suas conversas | 1:N com conversations |

#### Tabelas de Compliance (9)

| Tabela | Artigo LGPD | Finalidade | Retenção | RLS |
|--------|-------------|-----------|----------|-----|
| `audit_logs` | Art. 37 (ROPA) | Registro imutável de todas as ações do sistema | 5 anos | Somente inserção via service_role |
| `access_logs` | Marco Civil Art. 15 | Registro de logins, logouts e tentativas de acesso | 6 meses mín. | Somente inserção via service_role |
| `anonymization_logs` | Art. 12 | Prova de que dados foram anonimizados (hash, método, entidades detectadas) | 5 anos | Somente inserção via service_role |
| `image_processing_logs` | Art. 12/15 | Prova de que imagens foram processadas em memória e descartadas | 5 anos | Somente inserção via service_role |
| `consent_records` | Art. 7/8/11 | Gestão de consentimentos (4 tipos, com versão do documento e base legal) | Duração da relação + 5 anos | Médico lê seus próprios registros |
| `sensitive_data_detection_logs` | Art. 12 | Detalhamento de cada dado sensível detectado (tipo, confiança, ação tomada) | 5 anos | Somente inserção via service_role |
| `data_subject_requests` | Art. 18 | Requisições de direitos dos titulares (acesso, retificação, exclusão, portabilidade, objeção) | 5 anos | Médico cria e lê seus próprios pedidos |
| `explainability_logs` | Art. 20 | Transparência da IA (modelo, parâmetros, verificação PubMed, disclaimer) | 5 anos | Médico lê logs das suas consultas |
| `security_incident_logs` | Art. 48 | Incidentes de segurança (severidade, afetados, se reportado à ANPD) | 5 anos | Somente via service_role (admin/DPO) |

### 4.2. Diagrama de relacionamentos

```
auth.users (Supabase Auth)
     │
     │ 1:1 (trigger automático fn_handle_new_user)
     ▼
profiles ──────────┬──────────────────────────────────────────────┐
  │                │                                              │
  │ 1:N            │ 1:N                                          │ 1:N
  ▼                ▼                                              ▼
conversations    consent_records                      data_subject_requests
  │
  │ 1:N
  ▼
messages ──────────┬──────────────────┬───────────────────────────┐
  │                │                  │                           │
  │ 1:1            │ 1:1              │ 1:N                       │ 1:1
  ▼                ▼                  ▼                           ▼
anonymization    explainability    sensitive_data          image_processing
_logs            _logs             _detection_logs         _logs


                    TABELAS INDEPENDENTES (inserção via service_role)
                    ───────────────────────────────────────────────
                    audit_logs .......... registro imutável de ações
                    access_logs ......... logins, logouts, sessões
                    security_incident_logs .. incidentes de segurança
```

### 4.3. Migrations aplicadas (8)

As migrações são scripts SQL versionados que criam e modificam a estrutura do banco de dados:

| # | Migration | Descrição |
|---|-----------|-----------|
| 1 | `001_initial_schema.sql` | Criação das 12 tabelas, tipos enumerados (ENUMs), índices de performance |
| 2 | `002_rls_policies.sql` | Políticas de Row Level Security — isolamento de dados por médico |
| 3 | `003_functions.sql` | Triggers automáticos, cálculo de prazo de 15 dias úteis (Art. 18 LGPD) |
| 4 | `004_fix_cascade_compliance.sql` | Correção de regras de cascata para integridade referencial |
| 5 | `005_fix_new_user_trigger.sql` | Correção do trigger de criação automática de perfil após cadastro |
| 6 | `006_security_hardening.sql` | Otimização de RLS com subqueries (performance), correção de `search_path` em funções `SECURITY DEFINER` (prevenção de ataques de search_path hijacking), adição de índices |
| 7 | `007_fix_consent_ip_type.sql` | Correção do tipo de dados do campo IP de INET para TEXT (compatibilidade) |
| 8 | `008_fix_audit_trigger_security_definer.sql` | Correção de permissões no trigger de auditoria |

---

## 5. Edge Functions — Backend Serverless

As Edge Functions são funções serverless executadas no ambiente Deno (TypeScript) do Supabase. Cada função opera de forma isolada e possui acesso ao banco de dados via service_role (permissão administrativa restrita ao backend).

### 5.1. process-message (função principal)

| Campo | Detalhe |
|-------|---------|
| **Endpoint** | POST `/functions/v1/process-message` |
| **Autenticação** | JWT do Supabase (Bearer token) |
| **Entrada** | Texto clínico do médico + ID da conversa + (opcional) imagens em base64 |
| **Saída** | Stream SSE com resposta da IA e referências verificadas |

**Fluxo interno:**
1. Validação da entrada (tamanho, formato UUID, autenticação);
2. Anonimização do texto via `anonymizer.ts`;
3. Registro em `anonymization_logs` e `sensitive_data_detection_logs`;
4. Chamada à API Anthropic (Claude Opus 4.6) com prompt mestre;
5. Streaming da resposta via SSE (Server-Sent Events);
6. Verificação das referências PubMed via `pubmed-utils.ts` (arquitetura NTAV);
7. Substituição de URLs de busca por links verificados;
8. Salvamento da resposta verificada no banco de dados;
9. Registro em `explainability_logs` e `audit_logs`.

### 5.2. process-image

| Campo | Detalhe |
|-------|---------|
| **Endpoint** | POST `/functions/v1/process-image` (FormData) |
| **Autenticação** | JWT do Supabase (Bearer token) |
| **Entrada** | Imagem médica (JPEG, PNG — até 5MB) |
| **Saída** | Análise clínica da imagem |

**Fluxo interno:**
1. Validação por magic bytes (tipo real do arquivo);
2. Geração de hash SHA-256 da imagem;
3. Processamento em memória pela API Anthropic (Claude Vision);
4. Secure wipe: sobrescrita de todos os bytes da imagem por zeros;
5. Registro em `image_processing_logs` com timestamps de processamento e descarte;
6. A imagem NUNCA é salva em disco ou banco de dados.

### 5.3. log-access

| Campo | Detalhe |
|-------|---------|
| **Endpoint** | POST `/functions/v1/log-access` |
| **Autenticação** | JWT do Supabase (Bearer token) |
| **Entrada** | Ação (login, logout, session_refresh, failed_login) |
| **Saída** | Confirmação de registro |

**Fluxo interno:**
1. Registro na tabela `access_logs` com: IP, user agent, ação, duração da sessão;
2. Registro correspondente na tabela `audit_logs` (redundância intencional para auditoria).

---

## 6. Módulos Compartilhados

Os módulos compartilhados são bibliotecas TypeScript utilizadas por todas as Edge Functions, garantindo consistência no comportamento do sistema.

### 6.1. anonymizer.ts — Anonimização de Dados Pessoais

| Aspecto | Detalhe |
|---------|---------|
| **Método** | REGEX híbrido (expressões regulares) |
| **Camada 1 (técnica)** | Detecção automática de padrões: CPF, telefone, e-mail, RG, CEP, nomes próprios, prontuários |
| **Camada 2 (lógica)** | Prompt mestre instrui a IA a ignorar dados pessoais residuais |
| **Saída** | Texto anonimizado + hash SHA-256 do original + contagem de entidades detectadas |
| **Dados preservados** | Informações clínicas (pressão arterial, frequência cardíaca, temperatura, glicemia) — necessárias para o diagnóstico |

### 6.2. cors.ts — Controle de Origem

| Aspecto | Detalhe |
|---------|---------|
| **Política** | CORS restritivo — aceita requisições apenas de domínios autorizados |
| **Domínios permitidos** | staidoc.app e previews do ambiente Lovable |
| **Rejeição** | Requisições de qualquer outro domínio são automaticamente rejeitadas |

### 6.3. master-prompt.ts — Prompt Mestre da IA (STAIDOC v1.0)

| Aspecto | Detalhe |
|---------|---------|
| **Função** | Define o comportamento e limites da IA |
| **Instruções** | Atuar como assistente de suporte diagnóstico; nunca emitir diagnóstico definitivo; incluir disclaimers; gerar referências no formato de busca PubMed (nunca PMIDs diretos); ignorar dados pessoais |
| **Tags de transparência** | `[HUMAN-IN-THE-LOOP]`, `[TRANSPARENCIA]`, `[AVISO DE PRIVACIDADE]` |

### 6.4. pubmed-utils.ts — Verificação de Referências (NTAV)

| Aspecto | Detalhe |
|---------|---------|
| **Arquitetura** | NTAV — Never Trust, Always Verify |
| **API** | PubMed E-utilities (NCBI/NIH) — pública e gratuita |
| **Endpoints** | `esearch.fcgi` (busca por termos) e `esummary.fcgi` (metadados do artigo) |
| **Taxa de sucesso** | Mais de 90% das referências verificadas com PMID real confirmado |
| **Fallback** | URLs de busca mantidas quando a verificação não encontra correspondência |
| **Documentação completa** | `docs/VERIFICACAO_REFERENCIAS_PUBMED.md` |

### 6.5. validation.ts — Validação de Entrada e Segurança

| Aspecto | Detalhe |
|---------|---------|
| **Validação de texto** | Tamanho máximo de mensagem (prevenção de ataques DoS) |
| **Validação de UUID** | Formato obrigatório para identificadores (prevenção de SQL injection) |
| **Validação de imagem** | Verificação por magic bytes (tipo real do arquivo), limite de tamanho e quantidade |
| **Secure wipe** | Função `secureWipeBuffer` que sobrescreve cada byte de um buffer por zero |

---

## 7. Privacy by Design — Medidas Implementadas

O sistema foi projetado desde a concepção com proteção de dados como princípio fundamental, implementando as seguintes medidas:

### 7.1. Minimização de dados

- Apenas dados estritamente necessários são coletados (CRM, e-mail, especialidade);
- Dados pessoais de pacientes NÃO são coletados por design;
- Dados acidentalmente incluídos são removidos automaticamente pela anonimização.

### 7.2. Anonimização antes do processamento

- Todo texto passa pelo módulo `anonymizer.ts` ANTES de ser enviado à API da Anthropic;
- O texto original com dados sensíveis NUNCA é armazenado;
- Apenas o texto anonimizado e o hash SHA-256 (prova matemática) são persistidos.

### 7.3. Imagens nunca armazenadas

- Imagens médicas são processadas exclusivamente em memória;
- Após o processamento, são sobrescritas com zeros (secure wipe);
- Hash, timestamps de processamento e descarte, e prova de não-armazenamento são registrados.

### 7.4. Isolamento por médico (Row Level Security)

- Cada médico acessa exclusivamente seus próprios dados;
- O isolamento é garantido pelo banco de dados (RLS), não pelo código da aplicação;
- Mesmo tentativas de acesso via API direta são bloqueadas automaticamente pelo PostgreSQL.

### 7.5. Logs imutáveis

- Tabelas de auditoria permitem apenas inserção (insert-only);
- Nenhum registro de log pode ser alterado ou excluído;
- Isso garante a integridade da trilha de auditoria para fiscalização.

---

## 8. Segurança — Criptografia e Proteções

### 8.1. Criptografia

| Camada | Tecnologia | Detalhes |
|--------|------------|---------|
| **Em trânsito** | TLS (HTTPS) | Todas as comunicações entre o navegador do médico e o servidor são criptografadas. Certificado SSL gerenciado automaticamente. |
| **Em repouso** | AES-256 | Criptografia de disco gerenciada pelo Supabase. Dados armazenados no banco de dados são criptografados de forma transparente. |
| **Chaves de API** | Variáveis de ambiente | Chaves da Anthropic e credenciais sensíveis são armazenadas como variáveis de ambiente seguras no Supabase, nunca expostas no código-fonte ou frontend. |

### 8.2. Proteções contra ataques

| Ameaça | Proteção Implementada |
|--------|----------------------|
| **SQL Injection** | Validação de UUID obrigatória; queries parametrizadas via Supabase client |
| **Cross-Site Scripting (XSS)** | Sanitização no React; CORS restritivo |
| **DoS (negação de serviço)** | Limites de tamanho de mensagem e imagem |
| **Acesso não autorizado** | Autenticação JWT; RLS no banco de dados |
| **Search path hijacking** | Correção de `search_path` em funções `SECURITY DEFINER` (migration 006) |
| **Falsificação de tipo de arquivo** | Validação por magic bytes (tipo real, não extensão) |
| **Exfiltração de dados de imagem** | Processamento em memória + secure wipe |

### 8.3. Hardening de segurança (migration 006)

- Otimização de políticas RLS com subqueries para melhor performance;
- Correção de `search_path` em funções com `SECURITY DEFINER` para prevenir ataques;
- Adição de índices para queries frequentes de auditoria.

---

## 9. Modelo de Inteligência Artificial

### 9.1. Especificações do modelo

| Parâmetro | Valor | Justificativa |
|-----------|-------|---------------|
| **Modelo** | Claude Opus 4.6 | Modelo da Anthropic com alta capacidade de raciocínio clínico |
| **Provedor** | Anthropic | Empresa focada em segurança de IA (AI Safety) |
| **Temperatura** | 0.2 | Valor baixo para máxima precisão e reprodutibilidade das respostas |
| **Max tokens** | 4096 | Limite de tamanho da resposta — suficiente para análise clínica detalhada |
| **Streaming** | SSE (Server-Sent Events) | Resposta transmitida em tempo real para melhor experiência do médico |
| **Prompt mestre** | STAIDOC v1.0 | Define comportamento, limites éticos e formato das respostas |

### 9.2. Limites éticos integrados ao prompt

O prompt mestre (`master-prompt.ts`) estabelece os seguintes limites invioláveis:

1. **A IA é assistente, não decisor:** Todas as sugestões são apresentadas como apoio ao raciocínio clínico;
2. **Disclaimer obrigatório:** Toda resposta inclui aviso de que o diagnóstico final é responsabilidade do médico;
3. **Referências verificáveis:** A IA gera apenas URLs de busca PubMed, nunca PMIDs diretos;
4. **Recusa de dados pessoais:** A IA é instruída a ignorar dados pessoais de pacientes, mesmo que passem pela anonimização;
5. **Tags de transparência:** `[HUMAN-IN-THE-LOOP]` e `[TRANSPARENCIA]` são incluídas em todas as respostas.

### 9.3. Sistema NTAV de verificação de referências

O sistema NTAV (Never Trust, Always Verify) é uma camada de segurança que verifica automaticamente cada referência bibliográfica gerada pela IA:

1. **Prevenção:** A IA é impedida de gerar PMIDs diretos (fonte de erro eliminada);
2. **Verificação:** O backend consulta a API PubMed para cada referência;
3. **Substituição:** URLs de busca são trocadas por links diretos a artigos verificados;
4. **Fallback seguro:** Referências não verificadas mantêm formato funcional de busca;
5. **Auditoria:** Todo o processo é registrado em `explainability_logs`.

A documentação técnica completa do sistema NTAV está disponível em `docs/VERIFICACAO_REFERENCIAS_PUBMED.md`.

---

## 10. Frontend — Interface do Usuário

### 10.1. Páginas e rotas

| Rota | Página | Acesso | Descrição |
|------|--------|--------|-----------|
| `/` | Landing Page | Público | Apresentação do projeto com botões "Inscrever-se" e "Entrar" |
| `/login` | Login/Cadastro | Público | Autenticação por e-mail e senha |
| `/onboarding` | Onboarding | Autenticado (primeira vez) | Coleta de CRM, estado do CRM e especialidade médica |
| `/consent` | Consentimento | Autenticado (primeira vez) | 4 consentimentos obrigatórios com textos explicativos |
| `/chat` | Chat Principal | Autenticado + Consentido | Interface de conversa com a IA, streaming em tempo real |
| `/account` | Configurações | Autenticado | Gestão de conta, incluindo solicitação de exclusão |

### 10.2. Consentimento informado (4 tipos)

Antes de acessar o chat, o médico deve aceitar 4 consentimentos independentes:

| Tipo | Base Legal | Conteúdo |
|------|------------|----------|
| Termos de Serviço | Art. 7, I | Condições gerais de uso da plataforma |
| Processamento de Dados | Art. 11, I | Consentimento para tratamento de dados pessoais sensíveis de saúde |
| Processamento por IA | Art. 11, I + Art. 20 | Consentimento para uso de inteligência artificial, com direito à explicação |
| Processamento de Imagens | Art. 11, I | Consentimento para processamento de imagens médicas com descarte seguro |

Cada aceite é registrado na tabela `consent_records` com: data/hora, versão do documento, endereço IP, user agent e base legal aplicável. O sistema bloqueia o acesso ao chat até que todos os 4 consentimentos sejam concedidos.

---

## 11. Conformidade com a LGPD — Mapeamento por Artigo

| Artigo LGPD | Requisito | Implementação na StaiDOC |
|-------------|-----------|--------------------------|
| Art. 6, I | Finalidade | Processamento limitado ao suporte diagnóstico médico |
| Art. 6, II | Adequação | Dados coletados são compatíveis com a finalidade |
| Art. 6, III | Necessidade | Coleta mínima: apenas CRM, e-mail e especialidade |
| Art. 6, VI | Transparência | Disclaimers, tags de transparência, referências verificáveis |
| Art. 7, I | Consentimento | 4 tipos de consentimento com registro completo |
| Art. 8 | Condições do consentimento | Granular, específico, com prova de aceite |
| Art. 11, I | Dados sensíveis | Consentimento explícito para dados de saúde |
| Art. 12 | Anonimização | REGEX + prompt dupla camada; hash como prova |
| Art. 15 | Término do tratamento | Retenção definida por tabela conforme legislação |
| Art. 18 | Direitos do titular | Tabela `data_subject_requests` com prazo automático de 15 dias úteis |
| Art. 20 | Decisões automatizadas | Human-in-the-Loop; logs de explicabilidade; disclaimer obrigatório |
| Art. 37 | ROPA | `audit_logs` imutáveis com registro de todas as operações |
| Art. 41 | Encarregado (DPO) | [A DESIGNAR] |
| Art. 46 | Segurança | TLS, AES-256, RLS, validação de entrada, secure wipe |
| Art. 48 | Incidentes | Tabela `security_incident_logs` com campo de simulação |
| Marco Civil Art. 15 | Logs de acesso | `access_logs` com retenção mínima de 6 meses |

---

## 12. Resumo Técnico

| Métrica | Valor |
|---------|-------|
| **Tabelas no banco de dados** | 12 (3 core + 9 compliance) |
| **Migrations aplicadas** | 8 |
| **Edge Functions** | 3 (process-message, process-image, log-access) |
| **Módulos compartilhados** | 5 (anonymizer, cors, master-prompt, pubmed-utils, validation) |
| **Tipos enumerados (ENUMs)** | 12 |
| **Funções SQL / Triggers** | 6 |
| **Políticas RLS** | Aplicadas em todas as tabelas core e em consent_records, data_subject_requests e explainability_logs |
| **Tipos de consentimento** | 4 (termos, dados, IA, imagens) |
| **Tipos de direito do titular** | 5 (acesso, retificação, exclusão, portabilidade, objeção) |
| **Padrões de anonimização** | 7 (CPF, telefone, e-mail, RG, CEP, nomes, prontuários) |
| **Região dos dados** | sa-east-1 (São Paulo, Brasil) |

---

*Fichas A1 e A2 elaboradas pela Prevvine Tratamento de Dados Ltda. para apresentação ao Sandbox Regulatório da Autoridade Nacional de Proteção de Dados (ANPD), Edital 02/2025.*

*Versão 1.0 — 14 de Fevereiro de 2026*
