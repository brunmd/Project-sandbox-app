-- ============================================================================
-- StaiDOC — Migration 007: Corrigir tipo ip_address em consent_records
-- ============================================================================
-- Problema: ip_address e do tipo INET. O frontend (browser) nao consegue
--           obter o IP real do usuario. Quando o Lovable tenta inserir uma
--           string invalida (ou vazia), o INSERT falha silenciosamente.
-- Solucao:  Alterar para TEXT em tabelas que recebem INSERT do frontend.
--           Manter INET nas tabelas de auditoria (preenchidas pelo backend).
-- ============================================================================

-- Alterar consent_records.ip_address de INET para TEXT
ALTER TABLE consent_records ALTER COLUMN ip_address TYPE TEXT USING ip_address::TEXT;

-- Garantir que consent_records tem os defaults corretos para o frontend
-- (created_at ja tem DEFAULT now(), granted_at precisa ser preenchido pelo frontend)

-- ============================================================================
-- FIM
-- ============================================================================
