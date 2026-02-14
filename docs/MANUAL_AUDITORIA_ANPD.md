# Manual de Auditoria — StaiDOC

## Guia Passo a Passo para Demonstrar Conformidade LGPD

**Empresa:** Prevvine Tratamento de Dados Ltda.
**Projeto:** StaiDOC — Assistente de Suporte ao Diagnostico Medico
**Sandbox Regulatorio:** Edital 02/2025 — ANPD
**Dominio:** staidoc.app
**Data:** Fevereiro de 2026

---

## Para quem e este manual?

Este manual e destinado ao **gerente** ou **responsavel** que ira apresentar a StaiDOC aos auditores da Agencia Nacional de Protecao de Dados (ANPD). Ele descreve, em linguagem nao tecnica, **cada etapa da jornada do usuario** (medico) na plataforma — desde o cadastro ate a exclusao da conta — mostrando:

- **O que acontece** em cada passo
- **Onde os dados ficam armazenados** (nome da tabela no banco de dados)
- **Como acessar** cada informacao no painel de administracao (Supabase Dashboard)
- **Por quanto tempo** os dados sao retidos
- **Qual artigo da LGPD** justifica cada acao

---

## Como acessar o Painel de Administracao (Supabase Dashboard)

Para verificar qualquer informacao mencionada neste manual:

1. Acesse: **https://supabase.com/dashboard**
2. Faca login com a conta do projeto
3. Selecione o projeto **StaiDOC**
4. No menu lateral esquerdo, clique em **"Table Editor"**
5. Selecione a tabela desejada na lista

Para consultas mais detalhadas:
1. No menu lateral, clique em **"SQL Editor"**
2. Escreva a consulta SQL indicada neste manual
3. Clique em **"Run"** (botao verde)

> **IMPORTANTE:** Todas as consultas SQL deste manual sao somente leitura (SELECT). Nenhuma delas altera ou apaga dados.

---

## Mapa Geral das Tabelas

| # | Tabela | O que armazena | Retencao |
|---|--------|---------------|----------|
| 1 | `profiles` | Perfil do medico (nome, CRM, especialidade) | Enquanto a conta existir |
| 2 | `conversations` | Sessoes de chat medico-IA | Duracao do Sandbox + 1 ano |
| 3 | `messages` | Mensagens individuais (ja anonimizadas) | Duracao do Sandbox + 1 ano |
| 4 | `audit_logs` | Log geral de auditoria (IMUTAVEL) | **5 anos** |
| 5 | `access_logs` | Logs de acesso (login, logout) | **Minimo 6 meses** (Marco Civil) |
| 6 | `anonymization_logs` | Prova de anonimizacao | **5 anos** |
| 7 | `image_processing_logs` | Prova de que imagens NAO foram armazenadas | **5 anos** |
| 8 | `consent_records` | Registros de consentimento | Relacao ativa + **5 anos** apos revogacao |
| 9 | `sensitive_data_detection_logs` | Cada dado sensivel detectado e removido | **5 anos** |
| 10 | `data_subject_requests` | Pedidos de direitos dos titulares (Art. 18) | **5 anos** |
| 11 | `explainability_logs` | Explicacao de como a IA chegou a resposta | **5 anos** |
| 12 | `security_incident_logs` | Incidentes de seguranca | **5 anos** |

---

# JORNADA DO USUARIO — PASSO A PASSO

---

## PASSO 1: Cadastro do Medico

### O que acontece

O medico acessa **staidoc.app** e clica em "Entrar com Google". O sistema utiliza autenticacao via Google (provedor OAuth configurado no Supabase Auth). Nao ha senha armazenada pela StaiDOC — a autenticacao e delegada ao Google.

### O que e registrado automaticamente

Quando o medico se cadastra pela primeira vez:

1. **Conta de autenticacao** — criada na tabela interna `auth.users` do Supabase (gerenciada pelo proprio Supabase, com criptografia)

2. **Perfil inicial** — criado automaticamente por um trigger no banco de dados:
   - **Tabela:** `profiles`
   - **Dados:** nome (vindo do Google), CRM = "PENDENTE", estado = "XX"
   - O medico completara esses dados no onboarding (Passo 2)

3. **Log de auditoria** — registrado automaticamente pelo trigger `fn_audit_trigger`:
   - **Tabela:** `audit_logs`
   - **Acao:** `create`
   - **Detalhes:** criacao do perfil

4. **Log de acesso** — registrado pela Edge Function `log-access`:
   - **Tabela:** `access_logs`
   - **Dados:** IP, navegador, horario, acao = "login", sucesso = true

### Como verificar no Dashboard

**Perfil do medico:**
```sql
SELECT id, full_name, crm_number, crm_state, specialty, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
```

**Logs de acesso (logins):**
```sql
SELECT id, user_id, action, ip_address, user_agent, success, created_at
FROM access_logs
WHERE action = 'login'
ORDER BY created_at DESC
LIMIT 20;
```

**Auditoria da criacao de perfil:**
```sql
SELECT id, user_id, action, resource_type, details, created_at
FROM audit_logs
WHERE action = 'create' AND resource_type = 'profiles'
ORDER BY created_at DESC
LIMIT 10;
```

### Artigos da LGPD aplicaveis

- **Art. 7, I** — Consentimento do titular (o medico aceita ao clicar em "Entrar")
- **Art. 46** — Seguranca no tratamento (autenticacao via OAuth, sem senha armazenada)
- **Marco Civil da Internet, Art. 15** — Retencao de logs de acesso por no minimo 6 meses

### Retencao

| Dado | Retencao |
|------|----------|
| Perfil (`profiles`) | Enquanto a conta existir |
| Log de acesso (`access_logs`) | Minimo 6 meses |
| Log de auditoria (`audit_logs`) | 5 anos |

---

## PASSO 2: Onboarding (Completar Perfil + Consentimento)

### O que acontece

Apos o primeiro login, o medico e direcionado para a tela de onboarding onde:
- Preenche seu **nome completo**
- Preenche seu **CRM** (numero e estado)
- Preenche sua **especialidade**
- Aceita os **termos de uso e consentimentos**

### O que e registrado

1. **Atualizacao do perfil:**
   - **Tabela:** `profiles`
   - CRM, estado e especialidade sao atualizados

2. **Registros de consentimento (4 tipos):**
   - **Tabela:** `consent_records`
   - Cada tipo de consentimento gera um registro separado:

   | Tipo | Descricao | Base Legal |
   |------|-----------|------------|
   | `terms_of_service` | Termos de uso da plataforma | Art. 7, I |
   | `data_processing` | Tratamento de dados pessoais | Art. 7, I |
   | `ai_processing` | Uso de IA para sugestoes | Art. 7, I / Art. 20 |
   | `image_processing` | Envio e processamento de imagens | Art. 11, I |

   Cada registro contem: data/hora, IP, navegador, versao dos termos aceitos.

3. **Log de auditoria** — automatico para cada consentimento:
   - **Tabela:** `audit_logs`
   - **Acao:** `consent_granted`

### Como verificar no Dashboard

**Consentimentos de um medico:**
```sql
SELECT id, user_id, consent_type, consent_version, granted,
       granted_at, ip_address, legal_basis, created_at
FROM consent_records
WHERE user_id = '[ID_DO_MEDICO]'
ORDER BY created_at ASC;
```

**Ver todos os consentimentos concedidos:**
```sql
SELECT consent_type, COUNT(*) as total, MIN(granted_at) as primeiro, MAX(granted_at) as ultimo
FROM consent_records
WHERE granted = true
GROUP BY consent_type
ORDER BY consent_type;
```

**Auditoria de consentimentos:**
```sql
SELECT id, user_id, action, resource_type, details, created_at
FROM audit_logs
WHERE action IN ('consent_granted', 'consent_revoked')
ORDER BY created_at DESC
LIMIT 20;
```

### Artigos da LGPD aplicaveis

- **Art. 7, I** — Consentimento como base legal
- **Art. 8** — Consentimento deve ser por escrito, de forma destacada
- **Art. 8, §5** — Consentimento pode ser revogado a qualquer momento
- **Art. 11, I** — Consentimento especifico para dados sensiveis (imagens medicas)

### Retencao

| Dado | Retencao |
|------|----------|
| Consentimento ativo (`consent_records`) | Enquanto a relacao durar |
| Consentimento revogado | **5 anos** apos revogacao |
| Auditoria de consentimento (`audit_logs`) | **5 anos** |

---

## PASSO 3: Medico Envia Mensagem de Texto

### O que acontece

O medico abre uma conversa e digita uma mensagem descrevendo sintomas/sinais clinicos de um paciente. **O medico NAO deve incluir dados pessoais do paciente** (nome, CPF, etc.), mas mesmo que inclua acidentalmente, o sistema possui protecao.

### Fluxo tecnico (em linguagem simples)

1. **Recebimento:** A mensagem chega ao servidor (Edge Function `process-message`)
2. **Anonimizacao:** O sistema AUTOMATICAMENTE varre o texto procurando dados sensiveis:
   - CPF (ex: 123.456.789-00) → substituido por `[CPF REMOVIDO]`
   - Telefone (ex: (11) 99999-0000) → substituido por `[TELEFONE REMOVIDO]`
   - Email → substituido por `[EMAIL REMOVIDO]`
   - RG → substituido por `[RG REMOVIDO]`
   - Endereco (Rua, Avenida...) → substituido por `[ENDERECO REMOVIDO]`
   - CEP → substituido por `[CEP REMOVIDO]`
   - Numero de prontuario → substituido por `[PRONTUARIO REMOVIDO]`
   - Nomes proprios apos indicadores ("paciente Maria") → substituido por `[NOME REMOVIDO]`

   **IMPORTANTE:** O sistema reconhece **contexto medico** (pressao arterial, frequencia cardiaca, saturacao, etc.) e NAO anonimiza numeros clinicos. Exemplo: "PA 120x80" NAO e tratado como telefone.

3. **Hash de integridade:** O sistema calcula um "carimbo digital" (SHA-256) do texto original E do texto anonimizado, como prova de integridade.

4. **Armazenamento:** Somente o texto JA ANONIMIZADO e salvo no banco de dados. O texto original (com dados sensiveis) NUNCA e armazenado.

### O que e registrado

| Tabela | O que grava | Artigo LGPD |
|--------|------------|-------------|
| `messages` | Mensagem anonimizada + hash de integridade | Art. 12 |
| `anonymization_logs` | Prova de que a anonimizacao ocorreu: hash do original, entidades detectadas, metodo, tempo | Art. 12, Art. 37 |
| `sensitive_data_detection_logs` | Cada dado sensivel detectado individualmente: tipo (CPF, telefone...), confianca, acao tomada | Art. 12, Art. 46 |
| `audit_logs` | Registro de que uma mensagem foi enviada: IP, hora, se havia dados sensiveis | Art. 37 |

### Como verificar no Dashboard

**Mensagens de uma conversa (ja anonimizadas):**
```sql
SELECT id, role, content, content_hash, has_image, tokens_used,
       model_used, created_at
FROM messages
WHERE conversation_id = '[ID_DA_CONVERSA]'
ORDER BY created_at ASC;
```

**Logs de anonimizacao:**
```sql
SELECT a.id, a.message_id, a.original_content_hash,
       a.entities_detected, a.anonymization_method,
       a.sensitive_data_found, a.processing_time_ms, a.created_at
FROM anonymization_logs a
ORDER BY a.created_at DESC
LIMIT 20;
```

**Dados sensiveis detectados (detalhamento):**
```sql
SELECT id, message_id, detection_type, detection_method,
       confidence_score, action_taken, created_at
FROM sensitive_data_detection_logs
ORDER BY created_at DESC
LIMIT 30;
```

**Estatistica geral de anonimizacao:**
```sql
SELECT
  COUNT(*) as total_mensagens_processadas,
  COUNT(*) FILTER (WHERE sensitive_data_found = true) as mensagens_com_dados_sensiveis,
  COUNT(*) FILTER (WHERE sensitive_data_found = false) as mensagens_sem_dados_sensiveis
FROM anonymization_logs;
```

### Artigos da LGPD aplicaveis

- **Art. 12** — Anonimizacao de dados pessoais
- **Art. 6, II** — Adequacao ao contexto do tratamento
- **Art. 6, V** — Qualidade dos dados (integridade via hash SHA-256)
- **Art. 37** — Registro de operacoes de tratamento (ROPA)
- **Art. 46** — Medidas de seguranca

### Retencao

| Dado | Retencao |
|------|----------|
| Mensagem anonimizada (`messages`) | Duracao do Sandbox + 1 ano |
| Log de anonimizacao (`anonymization_logs`) | **5 anos** |
| Deteccao individual (`sensitive_data_detection_logs`) | **5 anos** |
| Auditoria (`audit_logs`) | **5 anos** |

---

## PASSO 4: Medico Envia Imagem (Exame Medico)

### O que acontece

O medico pode enviar imagens de exames medicos (radiografia, tomografia, ECG, etc.) junto com a mensagem. A imagem e processada pela IA para auxiliar no diagnostico.

### Fluxo de protecao de imagens

1. **Validacao:** O sistema verifica:
   - Formato permitido (JPEG, PNG ou WebP apenas)
   - Tamanho maximo de 5MB por imagem
   - Maximo 3 imagens por mensagem
   - Validacao de "magic bytes" (verifica se o arquivo e realmente uma imagem, nao um arquivo malicioso disfaracado)

2. **Hash da imagem:** Um "carimbo digital" (SHA-256) e calculado — prova de que a imagem existiu, sem armazena-la.

3. **Processamento em memoria:** A imagem e enviada DIRETAMENTE para a IA (Claude) em formato base64. **A imagem NUNCA e salva em disco ou banco de dados.**

4. **Descarte seguro:** Apos o processamento, a imagem e apagada da memoria do servidor. O horario exato do descarte e registrado.

5. **Secure Wipe:** O buffer de memoria que continha a imagem e sobrescrito com zeros (tecnica de seguranca que impede recuperacao posterior).

### O que e registrado (PROVA DE QUE A IMAGEM NAO FOI ARMAZENADA)

| Campo | Descricao |
|-------|-----------|
| `image_hash` | "Carimbo digital" da imagem (SHA-256) — identifica sem armazenar |
| `image_size_bytes` | Tamanho em bytes |
| `image_mime_type` | Tipo (JPEG, PNG, WebP) |
| `purpose` | Sempre "diagnostic_aid" |
| `processed_at` | Horario exato do processamento |
| `discarded_at` | Horario exato do descarte (prova!) |
| `processing_duration_ms` | Tempo de processamento em milissegundos |
| `storage_proof` | Sempre "processed_in_memory" ou "never_stored" |

### Como verificar no Dashboard

**Logs de imagens processadas:**
```sql
SELECT id, user_id, conversation_id, image_hash,
       image_size_bytes, image_mime_type, purpose,
       processed_at, discarded_at, storage_proof,
       processing_duration_ms, created_at
FROM image_processing_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Prova de que NENHUMA imagem foi armazenada permanentemente:**
```sql
SELECT
  COUNT(*) as total_imagens_processadas,
  COUNT(*) FILTER (WHERE storage_proof = 'never_stored') as nunca_armazenadas,
  COUNT(*) FILTER (WHERE storage_proof = 'processed_in_memory') as processadas_em_memoria,
  COUNT(*) FILTER (WHERE discarded_at IS NOT NULL) as descartadas_com_prova,
  COUNT(*) FILTER (WHERE discarded_at IS NULL) as sem_data_descarte
FROM image_processing_logs;
```
> **Resultado esperado:** 100% das imagens devem ter `discarded_at` preenchido e `storage_proof` = "never_stored" ou "processed_in_memory".

### Artigos da LGPD aplicaveis

- **Art. 11, I** — Tratamento de dados sensiveis (imagens clinicas) com consentimento
- **Art. 16** — Eliminacao de dados apos tratamento (descarte comprovado)
- **Art. 46** — Medidas de seguranca (secure wipe, validacao de formato)

### Retencao

| Dado | Retencao |
|------|----------|
| Imagem em si | **ZERO** — nunca armazenada, descartada imediatamente |
| Log de processamento (`image_processing_logs`) | **5 anos** (prova para ANPD) |

---

## PASSO 5: A IA Gera a Resposta com Referencias Cientificas

### O que acontece

A IA (Claude Opus 4.6, da Anthropic) recebe a mensagem anonimizada e gera uma resposta com:
- Hipoteses diagnosticas estruturadas
- Raciocinio clinico baseado em evidencias
- **Referencias bibliograficas verificadas do PubMed**
- Disclaimer: "Esta e uma ferramenta de SUPORTE — o diagnostico final e responsabilidade exclusiva do medico"

### Sistema de Verificacao de Referencias (NTAV)

A StaiDOC implementa a arquitetura **NTAV (Never Trust, Always Verify)** para garantir que as referencias bibliograficas sejam reais e verificaveis:

**Fase 1 — Geracao Controlada:**
A IA e instruida a NUNCA usar identificadores numericos de artigos (PMIDs). Em vez disso, gera links de busca PubMed com autor + palavras-chave + revista + ano.

**Fase 2 — Verificacao Automatizada:**
O servidor consulta a API publica do PubMed (E-utilities, do governo dos EUA) para:
1. Buscar o artigo real usando os termos de busca
2. Confirmar que o artigo existe
3. Obter o PMID (identificador) real e verificado
4. Substituir o link de busca pelo link direto ao artigo

**Resultado:** Cada referencia na resposta leva diretamente ao artigo real no PubMed, verificado automaticamente. O medico pode clicar e conferir.

### O que e registrado

| Tabela | O que grava | Artigo LGPD |
|--------|------------|-------------|
| `messages` | Resposta da IA (versao COM referencias verificadas) + hash + modelo + tokens | Art. 20 |
| `explainability_logs` | Explicacao completa de como a IA gerou a resposta: modelo, temperatura, resumo de verificacao de refs, tempo | Art. 20 |
| `audit_logs` | Registro da resposta: modelo, tokens usados, referencias verificadas, tempo | Art. 37 |

### Como verificar no Dashboard

**Logs de explicabilidade (como a IA decidiu):**
```sql
SELECT id, user_id, message_id, conversation_id,
       ai_model_used, explanation_level,
       explanation_content, confidence_score,
       disclaimer_shown, human_in_the_loop_confirmed,
       created_at
FROM explainability_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Resumo de verificacao de referencias (dentro da explicabilidade):**
```sql
SELECT id, explanation_content, created_at
FROM explainability_logs
WHERE explanation_content LIKE '%PubMed E-utilities%'
ORDER BY created_at DESC
LIMIT 10;
```

**Verificar disclaimer mostrado ao usuario:**
```sql
SELECT
  COUNT(*) as total_respostas,
  COUNT(*) FILTER (WHERE disclaimer_shown = true) as com_disclaimer,
  COUNT(*) FILTER (WHERE disclaimer_shown = false) as sem_disclaimer
FROM explainability_logs;
```
> **Resultado esperado:** 100% das respostas devem ter `disclaimer_shown = true`.

**Auditoria detalhada de uma mensagem especifica:**
```sql
SELECT a.details
FROM audit_logs a
WHERE a.action = 'message_received'
  AND a.resource_id = '[ID_DA_MENSAGEM]';
```
> O campo `details` contem: modelo usado, tokens, contagem de referencias, resumo de verificacao, tempo de processamento.

### Artigos da LGPD aplicaveis

- **Art. 20** — Direito a explicacao sobre decisoes automatizadas
- **Art. 6, VI** — Transparencia (referencias verificaveis e clicaveis)
- **Art. 6, V** — Qualidade dos dados (verificacao ativa via PubMed)

### Retencao

| Dado | Retencao |
|------|----------|
| Resposta da IA (`messages`) | Duracao do Sandbox + 1 ano |
| Explicabilidade (`explainability_logs`) | **5 anos** |
| Auditoria (`audit_logs`) | **5 anos** |

---

## PASSO 6: Medico Faz Login/Logout (Acessos Subsequentes)

### O que acontece

Cada vez que o medico entra ou sai da plataforma, o sistema registra:
- **Login:** IP, navegador, horario, sucesso/falha
- **Logout:** IP, navegador, duracao da sessao
- **Tentativa falha de login:** IP, horario, motivo da falha

### O que e registrado

| Tabela | O que grava |
|--------|------------|
| `access_logs` | Acao (login/logout/failed_login), IP, navegador, geo-localizacao, duracao, sucesso, motivo de falha |
| `audit_logs` | Registro de auditoria do acesso |

### Como verificar no Dashboard

**Historico de acessos de um medico:**
```sql
SELECT id, action, ip_address, user_agent, success,
       session_duration_seconds, failure_reason, created_at
FROM access_logs
WHERE user_id = '[ID_DO_MEDICO]'
ORDER BY created_at DESC
LIMIT 30;
```

**Tentativas de login com falha (seguranca):**
```sql
SELECT id, user_id, ip_address, user_agent, failure_reason, created_at
FROM access_logs
WHERE success = false
ORDER BY created_at DESC
LIMIT 20;
```

**Estatistica geral de acessos:**
```sql
SELECT
  action,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success = true) as sucesso,
  COUNT(*) FILTER (WHERE success = false) as falha
FROM access_logs
GROUP BY action
ORDER BY action;
```

### Artigos aplicaveis

- **Marco Civil da Internet, Art. 15** — Obrigatoriedade de guarda de logs de acesso por no minimo 6 meses
- **Art. 46 LGPD** — Medidas de seguranca

### Retencao

| Dado | Retencao |
|------|----------|
| Logs de acesso (`access_logs`) | **Minimo 6 meses** (Marco Civil) |
| Auditoria (`audit_logs`) | **5 anos** |

---

## PASSO 7: Medico Solicita Exclusao da Conta

### O que acontece

Na "Area de Membros" (pagina `/account`), o medico pode clicar em **"Excluir minha conta"**. Um dialogo de confirmacao aparece explicando que a acao e irreversivel.

### Fluxo da exclusao

1. **Medico clica em "Excluir minha conta"** → dialogo de confirmacao
2. **Medico confirma** → o sistema cria um registro em `data_subject_requests`
3. **Prazo calculado automaticamente:** O banco de dados calcula 15 dias uteis a partir do pedido (excluindo sabados e domingos) — conforme Art. 18, §5 da LGPD
4. **Medico e desconectado** e vê a mensagem: "Sua conta sera excluida conforme previsto na LGPD"
5. **Gerente recebe a solicitacao** (pendente) e a processa dentro do prazo

### O que e registrado

| Tabela | O que grava |
|--------|------------|
| `data_subject_requests` | Tipo = "deletion", status = "pending", descricao, data do pedido, prazo de 15 dias uteis |
| `audit_logs` | Acao = "data_request_created", detalhes do pedido |

### Como verificar no Dashboard

**Todos os pedidos de exclusao:**
```sql
SELECT id, requester_user_id, request_type, status,
       description, requested_at, deadline_at,
       acknowledged_at, completed_at, created_at
FROM data_subject_requests
WHERE request_type = 'deletion'
ORDER BY requested_at DESC;
```

**Pedidos pendentes (que precisam de acao do gerente):**
```sql
SELECT id, requester_user_id, request_type, status,
       requested_at, deadline_at,
       deadline_at - NOW() as tempo_restante
FROM data_subject_requests
WHERE status = 'pending'
ORDER BY deadline_at ASC;
```
> **ATENCAO:** Se `tempo_restante` for negativo, o prazo ja venceu!

**Auditoria de pedidos de direitos:**
```sql
SELECT id, user_id, action, resource_type, details, created_at
FROM audit_logs
WHERE action IN ('data_request_created', 'data_request_completed')
ORDER BY created_at DESC
LIMIT 20;
```

### Artigos da LGPD aplicaveis

- **Art. 18, IV** — Direito a eliminacao dos dados
- **Art. 18, §5** — Prazo de resposta: 15 dias uteis
- **Art. 15** — Termino do tratamento de dados
- **Art. 16** — Eliminacao de dados pessoais apos termino do tratamento

### Retencao

| Dado | Retencao |
|------|----------|
| Pedido de exclusao (`data_subject_requests`) | **5 anos** (prova de cumprimento) |
| Auditoria (`audit_logs`) | **5 anos** |

---

## PASSO 8: Outros Direitos do Titular (Art. 18 LGPD)

Alem da exclusao, o sistema suporta os seguintes pedidos:

| Tipo | Descricao | Campo `request_type` |
|------|-----------|---------------------|
| Acesso | Medico quer ver todos os seus dados | `access` |
| Retificacao | Medico quer corrigir dados incorretos | `rectification` |
| Exclusao | Medico quer excluir sua conta | `deletion` |
| Portabilidade | Medico quer exportar seus dados (CSV/JSON) | `portability` |
| Oposicao | Medico se opoe a um tratamento especifico | `objection` |

### Como verificar todos os pedidos de direitos

```sql
SELECT request_type, status,
       COUNT(*) as total,
       AVG(EXTRACT(DAY FROM (completed_at - requested_at))) as media_dias_resposta
FROM data_subject_requests
GROUP BY request_type, status
ORDER BY request_type, status;
```

---

# SEGURANCA — PROTECOES IMPLEMENTADAS

---

## Row Level Security (RLS)

**O que e:** Cada medico so consegue ver e acessar SEUS PROPRIOS dados. Mesmo que alguem tente acessar dados de outro medico usando a API, o banco de dados bloqueia automaticamente.

**Como verificar:** Todas as 12 tabelas possuem RLS ativado.

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
> **Resultado esperado:** Todas as tabelas devem mostrar `rowsecurity = true`.

---

## Imutabilidade dos Logs de Auditoria

**O que e:** A tabela `audit_logs` nao permite UPDATE nem DELETE. Uma vez registrado, um log NUNCA pode ser alterado ou apagado. Isso garante a integridade da trilha de auditoria.

**Como verificar:**

```sql
SELECT rulename, ev_type
FROM pg_rewrite
WHERE ev_class = 'audit_logs'::regclass
  AND rulename IN ('audit_logs_no_update', 'audit_logs_no_delete');
```
> **Resultado esperado:** Duas regras listadas — uma bloqueando UPDATE, outra bloqueando DELETE.

---

## Triggers de Auditoria Automatica

**O que e:** Toda acao nas tabelas principais (profiles, conversations, messages, consent_records, data_subject_requests) gera AUTOMATICAMENTE um registro em `audit_logs`. O programador nao precisa lembrar de registrar — o banco de dados faz sozinho.

**Tabelas monitoradas:**
- `profiles` — INSERT, UPDATE
- `conversations` — INSERT, UPDATE, DELETE
- `messages` — INSERT
- `consent_records` — INSERT, UPDATE
- `data_subject_requests` — INSERT, UPDATE

---

## Calculo de Prazo de 15 Dias Uteis

**O que e:** Quando um medico faz um pedido de direitos (Art. 18), o sistema calcula automaticamente o prazo de 15 dias uteis (excluindo sabados e domingos).

**Como verificar:**
```sql
SELECT id, requested_at, deadline_at,
       deadline_at - requested_at as dias_corridos
FROM data_subject_requests
ORDER BY created_at DESC
LIMIT 5;
```
> **Resultado esperado:** O `deadline_at` deve ser aproximadamente 21 dias corridos apos o `requested_at` (15 uteis ~ 21 corridos).

---

# CONSULTAS RAPIDAS PARA AUDITORIA

Abaixo estao consultas "prontas" que o gerente pode executar no SQL Editor do Supabase para responder rapidamente a perguntas de auditores da ANPD.

---

### "Quantos medicos usam a plataforma?"

```sql
SELECT COUNT(*) as total_medicos,
       COUNT(*) FILTER (WHERE crm_number != 'PENDENTE') as com_crm_validado,
       COUNT(*) FILTER (WHERE crm_number = 'PENDENTE') as crm_pendente
FROM profiles;
```

---

### "Quantas mensagens foram trocadas?"

```sql
SELECT
  role,
  COUNT(*) as total,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM messages
GROUP BY role;
```

---

### "Quantas vezes dados sensiveis foram detectados e removidos?"

```sql
SELECT
  detection_type,
  COUNT(*) as total_deteccoes,
  ROUND(AVG(confidence_score)::numeric, 2) as confianca_media,
  action_taken
FROM sensitive_data_detection_logs
GROUP BY detection_type, action_taken
ORDER BY total_deteccoes DESC;
```

---

### "Alguma imagem foi armazenada permanentemente?"

```sql
SELECT
  CASE
    WHEN COUNT(*) FILTER (WHERE storage_proof NOT IN ('never_stored', 'processed_in_memory')) > 0
    THEN 'ALERTA: Existem imagens com status inesperado!'
    ELSE 'OK: Nenhuma imagem foi armazenada permanentemente.'
  END as resultado,
  COUNT(*) as total_imagens_processadas,
  COUNT(*) FILTER (WHERE discarded_at IS NOT NULL) as com_prova_descarte
FROM image_processing_logs;
```

---

### "Existem pedidos de direitos fora do prazo?"

```sql
SELECT id, requester_user_id, request_type, status,
       requested_at, deadline_at,
       CASE
         WHEN status IN ('pending', 'in_progress') AND deadline_at < NOW()
         THEN 'FORA DO PRAZO!'
         WHEN status IN ('pending', 'in_progress')
         THEN 'Dentro do prazo'
         ELSE 'Concluido'
       END as situacao
FROM data_subject_requests
ORDER BY deadline_at ASC;
```

---

### "O disclaimer de IA esta sendo exibido?"

```sql
SELECT
  CASE
    WHEN COUNT(*) FILTER (WHERE disclaimer_shown = false) > 0
    THEN 'ALERTA: Existem respostas sem disclaimer!'
    ELSE 'OK: Todas as respostas exibiram disclaimer.'
  END as resultado,
  COUNT(*) as total_respostas,
  COUNT(*) FILTER (WHERE disclaimer_shown = true) as com_disclaimer
FROM explainability_logs;
```

---

### "Resumo geral de auditoria (por tipo de acao)"

```sql
SELECT action, resource_type,
       COUNT(*) as total,
       MIN(created_at) as primeiro_registro,
       MAX(created_at) as ultimo_registro
FROM audit_logs
GROUP BY action, resource_type
ORDER BY total DESC;
```

---

### "Todos os incidentes de seguranca registrados"

```sql
SELECT id, incident_type, severity, description,
       affected_users_count, detected_at, resolved_at,
       reported_to_anpd, is_simulation, created_at
FROM security_incident_logs
ORDER BY detected_at DESC;
```

---

# ROTEIRO DE SIMULACAO DE AUDITORIA ANPD

Se os auditores da ANPD quiserem simular uma auditoria, siga este roteiro:

## 1. Demonstrar cadastro
- Criar uma conta de teste via Google
- Mostrar no Dashboard: `profiles`, `access_logs`, `audit_logs`

## 2. Demonstrar consentimento
- Completar o onboarding com CRM de teste
- Mostrar no Dashboard: `consent_records` (4 registros)

## 3. Demonstrar anonimizacao
- Enviar mensagem contendo um CPF ficticio (ex: "Paciente com CPF 123.456.789-00")
- Mostrar na tabela `messages` que o CPF foi substituido por `[CPF REMOVIDO]`
- Mostrar em `anonymization_logs` o registro da operacao
- Mostrar em `sensitive_data_detection_logs` o CPF detectado

## 4. Demonstrar nao-retencao de imagens
- Enviar uma imagem de teste
- Mostrar em `image_processing_logs` que `storage_proof = 'processed_in_memory'` e `discarded_at` esta preenchido
- Confirmar que NAO existe storage bucket com imagens (Supabase Storage vazio)

## 5. Demonstrar explicabilidade da IA
- Mostrar a resposta da IA com referencias bibliograficas
- Clicar em uma referencia para confirmar que leva ao PubMed
- Mostrar em `explainability_logs` a explicacao de como a IA gerou a resposta
- Confirmar que `disclaimer_shown = true`

## 6. Demonstrar direitos dos titulares
- Clicar em "Excluir minha conta"
- Mostrar em `data_subject_requests` o pedido com prazo calculado
- Mostrar em `audit_logs` o registro automatico

## 7. Demonstrar seguranca
- Mostrar que RLS esta ativo em todas as tabelas
- Mostrar que `audit_logs` e imutavel (regras de no_update / no_delete)
- Mostrar logs de acesso com IP e navegador

## 8. Demonstrar retencao de dados
- Executar as consultas rapidas deste manual
- Confirmar periodos de retencao conforme tabela do inicio deste documento

---

# GLOSSARIO

Para facilitar a comunicacao com auditores:

| Termo Tecnico | Significado |
|--------------|-------------|
| **RLS** | Row Level Security — cada usuario so ve seus proprios dados |
| **SHA-256** | Algoritmo de "carimbo digital" — gera um codigo unico para qualquer texto ou arquivo |
| **Hash** | O "carimbo digital" gerado pelo SHA-256 — prova de integridade sem expor o conteudo |
| **Edge Function** | Codigo que roda no servidor do Supabase — processa mensagens, imagens, logs |
| **PMID** | PubMed Identifier — numero unico de um artigo cientifico no PubMed |
| **NTAV** | Never Trust, Always Verify — a IA nunca gera PMIDs, sempre verificamos no PubMed |
| **NER** | Named Entity Recognition — tecnica de reconhecimento de dados sensiveis em texto |
| **OAuth** | Protocolo de autenticacao via terceiros (Google) — sem senha propria |
| **SSE** | Server-Sent Events — tecnologia de streaming em tempo real |
| **Trigger** | Automacao no banco de dados — executa acao quando algo acontece (ex: novo registro) |
| **Service Role** | Credencial administrativa usada pelas Edge Functions para gravar logs |
| **Supabase** | Plataforma de banco de dados e autenticacao usada pela StaiDOC |
| **ROPA** | Record of Processing Activities — registro de operacoes de tratamento (Art. 37 LGPD) |
| **DPO** | Data Protection Officer — encarregado de protecao de dados |

---

*Manual elaborado para fins de demonstracao de conformidade no ambito do Sandbox Regulatorio da ANPD (Edital 02/2025).*
*Prevvine Tratamento de Dados Ltda. — Fevereiro de 2026*
