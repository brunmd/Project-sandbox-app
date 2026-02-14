-- ============================================================================
-- StaiDOC — Migration 008: Corrigir fn_audit_trigger() para bypass de RLS
-- ============================================================================
-- PROBLEMA CRITICO:
--   O trigger trg_audit_conversations dispara em DELETE e tenta INSERT em
--   audit_logs. Porém audit_logs tem RLS habilitado e a UNICA policy de
--   INSERT e para service_role (migration 002, linha 139-142).
--   O role "authenticated" NAO tem policy de INSERT em audit_logs.
--
--   Resultado: o INSERT no audit_logs falha silenciosamente por violacao
--   de RLS, e como o trigger roda dentro da mesma transacao, o DELETE
--   inteiro sofre ROLLBACK silencioso. O usuario tenta apagar uma conversa
--   e nada acontece.
--
-- CAUSA RAIZ:
--   Embora fn_audit_trigger() ja fosse SECURITY DEFINER (migration 003),
--   faltava o SET search_path = '' (exigido para seguranca) e as
--   referencias a tabelas/funcoes nao usavam schema qualificado (public.).
--   Sem search_path fixo, um atacante poderia criar objetos em um schema
--   temporario para interceptar chamadas — e o Supabase pode nao resolver
--   corretamente o owner da funcao para bypass de RLS.
--
-- SOLUCAO:
--   CREATE OR REPLACE com SECURITY DEFINER + SET search_path = ''
--   + todas as referencias a tabelas e funcoes com prefixo public.
--   Isso garante que a funcao executa como o owner (postgres/superuser),
--   bypassa RLS ao inserir em audit_logs, e esta protegida contra
--   search_path hijacking.
--
-- ALTERNATIVA DESCARTADA:
--   Criar policy de INSERT em audit_logs para "authenticated" seria
--   menos seguro — audit_logs deve ser insert-only via triggers/service_role,
--   nunca por acesso direto do usuario.
--
-- Referencia: https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_action public.audit_action;
  v_user_id UUID;
  v_resource_id UUID;
  v_details JSONB;
BEGIN
  -- Determinar a acao
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
    -- Para messages, usar acao especifica
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

  -- Inserir no audit_logs (com schema qualificado — essencial com search_path vazio)
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, v_resource_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- ============================================================================
-- COMENTARIO para documentacao
-- ============================================================================
COMMENT ON FUNCTION public.fn_audit_trigger() IS
  'Trigger de auditoria automatica — SECURITY DEFINER com search_path vazio '
  'para bypass seguro de RLS ao inserir em audit_logs. '
  'Correcao migration 008: sem isso, DELETE em conversations falhava silenciosamente.';

-- ============================================================================
-- FIM — Apos esta migration:
--   1. fn_audit_trigger() executa como owner (postgres), bypassa RLS
--   2. search_path = '' previne ataques de schema hijacking
--   3. Todas as referencias usam public. (schema qualificado)
--   4. DELETE em conversations agora completa corretamente,
--      e o audit_log de delete e gravado com sucesso
--   5. Nenhuma policy nova foi adicionada — audit_logs continua
--      inacessivel para INSERT direto pelo role authenticated
-- ============================================================================
