-- ============================================================================
-- StaiDOC — Migration 004: Correção de Compliance
-- Problema: ON DELETE CASCADE apagava consent_records e data_subject_requests
--           quando um médico era deletado, violando retenção obrigatória.
-- Solução:  ON DELETE SET NULL — preserva registros mesmo após exclusão do perfil.
-- Base legal: Retenção de consentimentos por 5 anos pós-revogação (LGPD Art. 7/8)
-- ============================================================================

-- ============================================================================
-- CORREÇÃO 1: consent_records — preservar consentimentos após exclusão de perfil
-- ============================================================================

-- Remover a constraint antiga (CASCADE)
ALTER TABLE consent_records
  DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;

-- Permitir NULL no campo (necessário para SET NULL funcionar)
ALTER TABLE consent_records
  ALTER COLUMN user_id DROP NOT NULL;

-- Recriar a constraint com SET NULL
ALTER TABLE consent_records
  ADD CONSTRAINT consent_records_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- CORREÇÃO 2: data_subject_requests — preservar pedidos de titulares
-- ============================================================================

-- Remover a constraint antiga (CASCADE)
ALTER TABLE data_subject_requests
  DROP CONSTRAINT IF EXISTS data_subject_requests_requester_user_id_fkey;

-- Permitir NULL no campo
ALTER TABLE data_subject_requests
  ALTER COLUMN requester_user_id DROP NOT NULL;

-- Recriar a constraint com SET NULL
ALTER TABLE data_subject_requests
  ADD CONSTRAINT data_subject_requests_requester_user_id_fkey
  FOREIGN KEY (requester_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- FIM — Agora, quando um médico for deletado:
--   - consent_records: user_id vira NULL, mas o registro permanece (5 anos)
--   - data_subject_requests: requester_user_id vira NULL, registro permanece
--   - audit_logs: já estava correto (ON DELETE SET NULL desde o início)
-- ============================================================================
