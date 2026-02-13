-- ============================================================================
-- StaiDOC — Migration 005: Corrigir trigger de novo usuário
-- Problema: UNIQUE constraint em (crm_number, crm_state) impede múltiplos
--           usuários com crm_number='PENDENTE' e crm_state='XX'
-- Solução:  Trocar UNIQUE constraint por índice parcial que ignora 'PENDENTE'
-- ============================================================================

-- 1. Remover a constraint UNIQUE antiga
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS uq_crm;

-- 2. Criar índice UNIQUE parcial que só vale quando CRM não é 'PENDENTE'
CREATE UNIQUE INDEX uq_crm_valid
  ON profiles (crm_number, crm_state)
  WHERE crm_number != 'PENDENTE';

-- 3. Recriar a função de novo usuário com tratamento de erro
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, crm_number, crm_state)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email,
      'Médico'
    ),
    'PENDENTE',
    'XX'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Erro ao criar perfil para user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM — Agora múltiplos médicos podem se cadastrar sem conflito.
-- O CRM real é preenchido no onboarding e aí sim precisa ser único.
-- ============================================================================
