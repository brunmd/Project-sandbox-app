-- ============================================================================
-- StaiDOC — Sandbox Regulatório ANPD (Edital 02/2025)
-- Migration 003: Funções Auxiliares e Triggers
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: Trigger automático para audit_logs
-- ============================================================================
-- Grava automaticamente em audit_logs quando houver INSERT/UPDATE/DELETE
-- nas tabelas core (profiles, conversations, messages, consent_records, data_subject_requests)

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_action audit_action;
  v_user_id UUID;
  v_resource_id UUID;
  v_details JSONB;
BEGIN
  -- Determinar a ação
  CASE TG_OP
    WHEN 'INSERT' THEN v_action := 'create';
    WHEN 'UPDATE' THEN v_action := 'update';
    WHEN 'DELETE' THEN v_action := 'delete';
  END CASE;

  -- Extrair user_id e resource_id conforme a tabela
  IF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := COALESCE(NEW.id, OLD.id);
    v_resource_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'conversations' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    v_resource_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'messages' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    v_resource_id := COALESCE(NEW.id, OLD.id);
    -- Para messages, usar ação específica
    IF TG_OP = 'INSERT' THEN
      v_action := 'message_sent';
    END IF;
  ELSIF TG_TABLE_NAME = 'consent_records' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    v_resource_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' AND NEW.granted = true THEN
      v_action := 'consent_granted';
    ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
      v_action := 'consent_revoked';
    END IF;
  ELSIF TG_TABLE_NAME = 'data_subject_requests' THEN
    v_user_id := COALESCE(NEW.requester_user_id, OLD.requester_user_id);
    v_resource_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      v_action := 'data_request_created';
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
      v_action := 'data_request_completed';
    END IF;
  ELSE
    v_user_id := auth.uid();
    v_resource_id := COALESCE(NEW.id, OLD.id);
  END IF;

  -- Montar detalhes
  v_details := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP
  );

  -- Para UPDATE, incluir campos alterados
  IF TG_OP = 'UPDATE' THEN
    v_details := v_details || jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  END IF;

  -- Inserir no audit_logs
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, v_resource_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS DE AUDITORIA AUTOMÁTICA
-- ============================================================================

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_conversations
  AFTER INSERT OR UPDATE OR DELETE ON conversations
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_messages
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_consent_records
  AFTER INSERT OR UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_data_subject_requests
  AFTER INSERT OR UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================================
-- FUNÇÃO: Calcular deadline de 15 dias úteis (Art. 18 §5 LGPD)
-- ============================================================================
-- Considera dias úteis brasileiros (exclui sábados e domingos).
-- Nota: não inclui feriados nacionais — para produção, usar tabela de feriados.

CREATE OR REPLACE FUNCTION fn_calculate_business_days_deadline(
  p_start_date TIMESTAMPTZ,
  p_business_days INTEGER DEFAULT 15
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_current_date DATE := p_start_date::date;
  v_days_added INTEGER := 0;
BEGIN
  WHILE v_days_added < p_business_days LOOP
    v_current_date := v_current_date + 1;
    -- Pular sábado (6) e domingo (0)
    IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
      v_days_added := v_days_added + 1;
    END IF;
  END LOOP;

  RETURN v_current_date::timestamptz;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION fn_calculate_business_days_deadline IS
  'Calcula prazo de 15 dias úteis para resposta a pedidos de titulares (Art. 18 §5 LGPD)';

-- ============================================================================
-- TRIGGER: Auto-preencher deadline em data_subject_requests
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_set_dsr_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline_at IS NULL THEN
    NEW.deadline_at := fn_calculate_business_days_deadline(NEW.requested_at, 15);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dsr_set_deadline
  BEFORE INSERT ON data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_dsr_deadline();

-- ============================================================================
-- FUNÇÃO: Auto-criar perfil após signup (via auth.users trigger)
-- ============================================================================
-- Chamada pelo trigger de auth.users para criar perfil inicial.
-- O médico completa os dados (CRM, etc.) depois no onboarding.

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, crm_number, crm_state)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'PENDENTE',  -- Preenchido no onboarding
    'XX'         -- Preenchido no onboarding
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no schema auth (requer permissão de superuser — executar no Dashboard)
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================================
-- FUNÇÃO: Gerar hash SHA-256 (utilitário)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_sha256(p_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(p_text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Requer extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON FUNCTION fn_sha256 IS 'Gera hash SHA-256 de texto — usado para content_hash e integridade';
