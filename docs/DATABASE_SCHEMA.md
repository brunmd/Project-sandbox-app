# StaiDOC — Schema do Banco de Dados

**Prevvine Tratamento de Dados Ltda.**
Sandbox Regulatório ANPD — Edital 02/2025

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        auth.users                               │
│                     (Supabase Auth)                              │
│                    Google Provider                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 1:1
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                        profiles                                  │
│  id (PK/FK) │ full_name │ crm_number │ crm_state │ specialty    │
└──────────┬───────────────────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      conversations                               │
│  id (PK) │ user_id (FK) │ title │ status │ started_at │ ended_at│
└──────────┬───────────────────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                        messages                                  │
│  id │ conversation_id │ user_id │ role │ content │ content_hash  │
│  has_image │ tokens_used │ model_used │ created_at               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tabelas Core (3)

| # | Tabela | Descrição | RLS |
|---|--------|-----------|-----|
| 1 | `profiles` | Perfil do médico (estende auth.users) | Próprio |
| 2 | `conversations` | Sessões de chat médico-IA | Próprio |
| 3 | `messages` | Mensagens individuais (anonimizadas) | Próprio |

## Tabelas de Compliance & Auditoria (9)

| # | Tabela | Artigo LGPD | Retenção | RLS |
|---|--------|-------------|----------|-----|
| 4 | `audit_logs` | Art. 37 (ROPA) | 5 anos | service_role only |
| 5 | `access_logs` | Marco Civil Art. 15 | 6 meses mín. | service_role only |
| 6 | `anonymization_logs` | Art. 12 | 5 anos | service_role only |
| 7 | `image_processing_logs` | Art. 12/15 | 5 anos | service_role only |
| 8 | `consent_records` | Art. 7/8/11 | Relação + 5 anos | Próprio (read) |
| 9 | `sensitive_data_detection_logs` | Art. 12 | 5 anos | service_role only |
| 10 | `data_subject_requests` | Art. 18 | 5 anos | Próprio (read/insert) |
| 11 | `explainability_logs` | Art. 20 | 5 anos | Próprio (read) |
| 12 | `security_incident_logs` | Art. 48 | 5 anos | service_role only |

---

## Diagrama de Relacionamentos

```
profiles ─────────┬──────────────────────────────────────────────────┐
  │                │                                                  │
  │ 1:N            │ 1:N                                              │ 1:N
  ▼                ▼                                                  ▼
conversations    consent_records                          data_subject_requests
  │
  │ 1:N
  ▼
messages ─────────┬──────────────────────┬───────────────────────────┐
  │                │                      │                           │
  │ 1:1            │ 1:1                  │ 1:N                       │ 1:1
  ▼                ▼                      ▼                           ▼
anonymization   explainability    sensitive_data          image_processing
_logs           _logs             _detection_logs         _logs


                    LOGS INDEPENDENTES
                    ──────────────────
                    audit_logs (imutável)
                    access_logs
                    security_incident_logs
```

---

## Políticas RLS

### Acesso do Médico (`auth.uid() = user_id`)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `profiles` | Próprio | Próprio | Próprio | - |
| `conversations` | Próprio | Próprio | Próprio | Próprio |
| `messages` | Próprio | Próprio | - | - |
| `consent_records` | Próprio | Próprio | - | - |
| `data_subject_requests` | Próprio | Próprio | - | - |
| `explainability_logs` | Próprio | - | - | - |

### Acesso Somente via service_role (Edge Functions)

| Tabela | Operações |
|--------|-----------|
| `audit_logs` | INSERT only (imutável) |
| `access_logs` | INSERT only |
| `anonymization_logs` | INSERT only |
| `image_processing_logs` | INSERT only |
| `sensitive_data_detection_logs` | INSERT only |
| `security_incident_logs` | INSERT only (admin/DPO) |

---

## Edge Functions

| Função | Endpoint | Descrição |
|--------|----------|-----------|
| `process-message` | POST | Mensagem → NER → IA → Logs → Resposta |
| `process-image` | POST (FormData) | Imagem → Hash → IA → Descarte → Log |
| `log-access` | POST | Login/Logout → Access Log + Audit Log |

---

## Tipos Enumerados (ENUMs)

| Tipo | Valores |
|------|---------|
| `conversation_status` | active, completed, archived |
| `message_role` | user, assistant, system |
| `audit_action` | create, read, update, delete, login, logout, export, consent_granted, consent_revoked, message_sent, message_received, image_processed, image_discarded, anonymization_applied, data_request_created, data_request_completed |
| `access_action` | login, logout, session_refresh, failed_login |
| `anonymization_method` | NER_SPACY, REGEX, HYBRID |
| `consent_type` | terms_of_service, data_processing, ai_processing, image_processing |
| `detection_type` | name, cpf, rg, address, phone, email |
| `detection_action` | redacted, blocked, flagged |
| `dsr_request_type` | access, rectification, deletion, portability, objection |
| `dsr_status` | pending, in_progress, completed, denied |
| `incident_severity` | low, medium, high, critical |
| `image_purpose` | diagnostic_aid, clinical_image |
| `image_storage_proof` | never_stored, processed_in_memory |

---

## Retenção de Dados (Legislação Brasileira)

| Tipo de Dado | Retenção | Base Legal |
|---|---|---|
| Logs de acesso | 6 meses mín. | Marco Civil da Internet, Art. 15 |
| Logs de auditoria | 5 anos | Boas práticas de compliance |
| Dados clínicos (mensagens) | Sandbox + 1 ano | Ambiente de testes |
| Consentimentos | Relação + 5 anos pós-revogação | LGPD Art. 7/8 |
| Incidentes de segurança | 5 anos | Fiscalização ANPD |

---

## Funções e Triggers

| Função | Tipo | Descrição |
|--------|------|-----------|
| `update_updated_at_column()` | Trigger | Auto-atualiza `updated_at` em profiles |
| `fn_audit_trigger()` | Trigger | Grava audit_log automático em INSERT/UPDATE/DELETE |
| `fn_calculate_business_days_deadline()` | Utilitária | Calcula 15 dias úteis (Art. 18 LGPD) |
| `fn_set_dsr_deadline()` | Trigger | Auto-preenche deadline em data_subject_requests |
| `fn_handle_new_user()` | Trigger (auth) | Auto-cria perfil após signup |
| `fn_sha256()` | Utilitária | Gera hash SHA-256 de texto |
