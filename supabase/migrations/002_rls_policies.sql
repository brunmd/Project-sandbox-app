-- ============================================================================
-- StaiDOC — Sandbox Regulatório ANPD (Edital 02/2025)
-- Migration 002: Row Level Security (RLS) — Políticas por Médico
-- ============================================================================
-- Princípio: cada médico só acessa seus próprios dados.
-- Tabelas de auditoria: insert-only via service_role (Edge Functions).
-- ============================================================================

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymization_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_processing_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_data_detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE explainability_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incident_logs      ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES — Médico lê e atualiza SOMENTE seu próprio perfil
-- ============================================================================

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert do perfil: permitido ao próprio usuário (criação pós-signup)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- CONVERSATIONS — CRUD completo do próprio médico
-- ============================================================================

CREATE POLICY conversations_select_own ON conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY conversations_insert_own ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY conversations_update_own ON conversations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY conversations_delete_own ON conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MESSAGES — Médico lê e insere SOMENTE suas mensagens
-- ============================================================================

CREATE POLICY messages_select_own ON messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY messages_insert_own ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- CONSENT_RECORDS — Médico lê seus consentimentos
-- ============================================================================

CREATE POLICY consent_records_select_own ON consent_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert de consentimento pelo próprio usuário
CREATE POLICY consent_records_insert_own ON consent_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DATA_SUBJECT_REQUESTS — Médico lê e cria seus pedidos (Art. 18 LGPD)
-- ============================================================================

CREATE POLICY dsr_select_own ON data_subject_requests
  FOR SELECT
  USING (auth.uid() = requester_user_id);

CREATE POLICY dsr_insert_own ON data_subject_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_user_id);

-- ============================================================================
-- EXPLAINABILITY_LOGS — Médico lê explicações das SUAS consultas
-- ============================================================================

CREATE POLICY explainability_select_own ON explainability_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABELAS DE AUDITORIA — Somente escrita via service_role (Edge Functions)
-- ============================================================================
-- Nenhuma política para o role "authenticated" = bloqueio total para usuários.
-- As Edge Functions usam service_role key que bypassa RLS automaticamente.
--
-- Tabelas afetadas:
--   - audit_logs
--   - access_logs
--   - anonymization_logs
--   - image_processing_logs
--   - sensitive_data_detection_logs
--
-- Nota: service_role bypassa RLS por padrão no Supabase.
-- Não é necessário criar políticas explícitas para service_role.

-- ============================================================================
-- SECURITY_INCIDENT_LOGS — Somente admin/DPO via service_role
-- ============================================================================
-- Nenhuma política para authenticated = sem acesso de usuários comuns.
-- Acesso somente via service_role (admin dashboard ou Edge Functions).

-- ============================================================================
-- POLÍTICAS PARA service_role — INSERT nas tabelas de auditoria
-- ============================================================================
-- Nota: No Supabase, service_role bypassa RLS automaticamente.
-- As políticas abaixo existem como documentação e defesa em profundidade.

-- Audit logs: insert-only para service_role (já protegido por RULES no schema)
CREATE POLICY audit_logs_service_insert ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Access logs: insert-only para service_role
CREATE POLICY access_logs_service_insert ON access_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Anonymization logs: insert-only para service_role
CREATE POLICY anonymization_logs_service_insert ON anonymization_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Image processing logs: insert-only para service_role
CREATE POLICY image_processing_logs_service_insert ON image_processing_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Sensitive data detection logs: insert-only para service_role
CREATE POLICY sensitive_data_detection_logs_service_insert ON sensitive_data_detection_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Explainability logs: insert via service_role
CREATE POLICY explainability_logs_service_insert ON explainability_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Security incident logs: insert via service_role
CREATE POLICY security_incident_logs_service_insert ON security_incident_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Consent records: insert via service_role (para registros automáticos)
CREATE POLICY consent_records_service_insert ON consent_records
  FOR INSERT
  TO service_role
  WITH CHECK (true);
