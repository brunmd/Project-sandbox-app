-- ============================================================================
-- StaiDOC — Migration 006: Security Hardening
-- Correcoes de seguranca identificadas na auditoria de fevereiro/2026
-- ============================================================================
-- Referencia: LGPD Art. 46 (medidas tecnicas de seguranca)
-- Referencia: Supabase RLS Performance Best Practices
-- ============================================================================

-- ============================================================================
-- PARTE 1: CORRIGIR PERFORMANCE DO RLS
-- ============================================================================
-- Problema: Usar auth.uid() diretamente nas policies pode ser ate 100x mais
--           lento em tabelas grandes. A subquery (select auth.uid()) e
--           avaliada uma unica vez por consulta, nao por cada linha.
-- ============================================================================

-- PROFILES
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- CONVERSATIONS
DROP POLICY IF EXISTS conversations_select_own ON conversations;
DROP POLICY IF EXISTS conversations_insert_own ON conversations;
DROP POLICY IF EXISTS conversations_update_own ON conversations;
DROP POLICY IF EXISTS conversations_delete_own ON conversations;

CREATE POLICY conversations_select_own ON conversations
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY conversations_insert_own ON conversations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY conversations_update_own ON conversations
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY conversations_delete_own ON conversations
  FOR DELETE USING ((select auth.uid()) = user_id);

-- MESSAGES
DROP POLICY IF EXISTS messages_select_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;

CREATE POLICY messages_select_own ON messages
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY messages_insert_own ON messages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- CONSENT_RECORDS
DROP POLICY IF EXISTS consent_records_select_own ON consent_records;
DROP POLICY IF EXISTS consent_records_insert_own ON consent_records;

CREATE POLICY consent_records_select_own ON consent_records
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY consent_records_insert_own ON consent_records
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- DATA_SUBJECT_REQUESTS
DROP POLICY IF EXISTS dsr_select_own ON data_subject_requests;
DROP POLICY IF EXISTS dsr_insert_own ON data_subject_requests;

CREATE POLICY dsr_select_own ON data_subject_requests
  FOR SELECT USING ((select auth.uid()) = requester_user_id);

CREATE POLICY dsr_insert_own ON data_subject_requests
  FOR INSERT WITH CHECK ((select auth.uid()) = requester_user_id);

-- EXPLAINABILITY_LOGS
DROP POLICY IF EXISTS explainability_select_own ON explainability_logs;

CREATE POLICY explainability_select_own ON explainability_logs
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PARTE 2: INDICES PARA COLUNAS USADAS EM RLS POLICIES
-- ============================================================================
-- Se a coluna ja tem indice (PK ou criado no schema), o CREATE INDEX IF NOT
-- EXISTS simplesmente nao cria duplicata.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records (user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_requester_user_id ON data_subject_requests (requester_user_id);
CREATE INDEX IF NOT EXISTS idx_explainability_user_id ON explainability_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_anonymization_logs_message_id ON anonymization_logs (message_id);

-- ============================================================================
-- PARTE 3: REFORCAR TRIGGER DE NOVO USUARIO
-- ============================================================================
-- Usar SET search_path = '' conforme best practice do Supabase
-- para prevenir ataques de search_path hijacking
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, crm_number, crm_state)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email,
      'Medico'
    ),
    'PENDENTE',
    'XX'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'fn_handle_new_user falhou para user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar trigger (garantir que esta conectado)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================================
-- PARTE 4: REFORCAR FUNCAO DE AUDITORIA
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  audit_action_val text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    audit_action_val := CASE TG_TABLE_NAME
      WHEN 'profiles' THEN 'profile_created'
      WHEN 'conversations' THEN 'conversation_created'
      WHEN 'messages' THEN 'message_sent'
      WHEN 'consent_records' THEN 'consent_granted'
      WHEN 'data_subject_requests' THEN 'dsr_created'
      ELSE 'record_created'
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action_val := CASE TG_TABLE_NAME
      WHEN 'profiles' THEN 'profile_updated'
      WHEN 'conversations' THEN 'conversation_updated'
      WHEN 'consent_records' THEN 'consent_updated'
      WHEN 'data_subject_requests' THEN 'dsr_updated'
      ELSE 'record_updated'
    END;
  ELSIF TG_OP = 'DELETE' THEN
    audit_action_val := CASE TG_TABLE_NAME
      WHEN 'conversations' THEN 'conversation_deleted'
      ELSE 'record_deleted'
    END;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      auth.uid()
    ),
    audit_action_val,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'trigger_time', now()
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'fn_audit_trigger falhou em % %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$;

-- ============================================================================
-- FIM — Migration 006: Security Hardening aplicado
-- ============================================================================
