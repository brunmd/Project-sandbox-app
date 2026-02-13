-- ============================================================================
-- StaiDOC — Sandbox Regulatório ANPD (Edital 02/2025)
-- Prevvine Tratamento de Dados Ltda.
-- Migration 001: Schema Inicial — Todas as Tabelas
-- ============================================================================
-- Conformidade: LGPD (Lei 13.709/2018), Marco Civil da Internet (Lei 12.965/2014)
-- ============================================================================

-- ============================================================================
-- TIPOS ENUMERADOS (ENUMs)
-- ============================================================================

CREATE TYPE conversation_status AS ENUM ('active', 'completed', 'archived');

CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TYPE audit_action AS ENUM (
  'create', 'read', 'update', 'delete',
  'login', 'logout', 'export', 'consent_granted', 'consent_revoked',
  'message_sent', 'message_received', 'image_processed', 'image_discarded',
  'anonymization_applied', 'data_request_created', 'data_request_completed'
);

CREATE TYPE access_action AS ENUM ('login', 'logout', 'session_refresh', 'failed_login');

CREATE TYPE anonymization_method AS ENUM ('NER_SPACY', 'REGEX', 'HYBRID');

CREATE TYPE image_purpose AS ENUM ('diagnostic_aid', 'clinical_image');

CREATE TYPE image_storage_proof AS ENUM ('never_stored', 'processed_in_memory');

CREATE TYPE consent_type AS ENUM (
  'terms_of_service', 'data_processing', 'ai_processing', 'image_processing'
);

CREATE TYPE detection_type AS ENUM ('name', 'cpf', 'rg', 'address', 'phone', 'email');

CREATE TYPE detection_action AS ENUM ('redacted', 'blocked', 'flagged');

CREATE TYPE dsr_request_type AS ENUM (
  'access', 'rectification', 'deletion', 'portability', 'objection'
);

CREATE TYPE dsr_status AS ENUM ('pending', 'in_progress', 'completed', 'denied');

CREATE TYPE dsr_export_format AS ENUM ('csv', 'json');

CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================================
-- TABELA 1: profiles — Perfil do médico (estende auth.users)
-- ============================================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  crm_number  TEXT NOT NULL,
  crm_state   CHAR(2) NOT NULL CHECK (crm_state ~ '^[A-Z]{2}$'),
  specialty   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_crm UNIQUE (crm_number, crm_state)
);

COMMENT ON TABLE profiles IS 'Perfil do médico — estende auth.users do Supabase Auth';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA 2: conversations — Sessões de chat
-- ============================================================================

CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT,
  status      conversation_status NOT NULL DEFAULT 'active',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE conversations IS 'Sessões de chat médico-IA';

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- ============================================================================
-- TABELA 3: messages — Mensagens individuais
-- ============================================================================

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role             message_role NOT NULL,
  content          TEXT NOT NULL,
  content_hash     TEXT NOT NULL,  -- SHA-256 para prova de integridade
  has_image        BOOLEAN NOT NULL DEFAULT false,
  tokens_used      INTEGER,
  model_used       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Mensagens individuais — conteúdo já anonimizado pelo NER';
COMMENT ON COLUMN messages.content IS 'Texto já anonimizado pelo pipeline NER antes da inserção';
COMMENT ON COLUMN messages.content_hash IS 'SHA-256 do conteúdo anonimizado — prova de integridade';

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================================================
-- TABELA 4: audit_logs — Log geral de auditoria (Art. 37 LGPD / ROPA)
-- ============================================================================
-- IMUTÁVEL: insert-only, sem UPDATE/DELETE
-- Retenção: 5 anos (boas práticas de compliance)

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action         audit_action NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  details        JSONB DEFAULT '{}'::jsonb,
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Log imutável de auditoria — Art. 37 LGPD / ROPA. Retenção: 5 anos';

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Regra para impedir UPDATE e DELETE (imutabilidade)
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================================================
-- TABELA 5: access_logs — Logs de acesso
-- ============================================================================
-- Retenção: mínimo 6 meses (Marco Civil da Internet, Art. 15)

CREATE TABLE access_logs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action                   access_action NOT NULL,
  ip_address               INET,
  user_agent               TEXT,
  geo_location             JSONB DEFAULT '{}'::jsonb,
  session_duration_seconds INTEGER,
  success                  BOOLEAN NOT NULL DEFAULT true,
  failure_reason           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE access_logs IS 'Logs de acesso — retenção mínima 6 meses (Marco Civil, Art. 15)';

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_action ON access_logs(action);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_access_logs_success ON access_logs(success) WHERE NOT success;

-- ============================================================================
-- TABELA 6: anonymization_logs — Prova de anonimização
-- ============================================================================
-- Retenção: 5 anos (compliance)

CREATE TABLE anonymization_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  message_id             UUID NOT NULL REFERENCES messages(id) ON DELETE SET NULL,
  original_content_hash  TEXT NOT NULL,  -- SHA-256 do texto ORIGINAL (antes da anonimização)
  entities_detected      JSONB NOT NULL DEFAULT '[]'::jsonb,
  anonymization_method   anonymization_method NOT NULL,
  sensitive_data_found   BOOLEAN NOT NULL DEFAULT false,
  processing_time_ms     INTEGER,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE anonymization_logs IS 'Prova de anonimização — evidência para ANPD. Retenção: 5 anos';
COMMENT ON COLUMN anonymization_logs.original_content_hash IS 'SHA-256 do texto original ANTES da anonimização';
COMMENT ON COLUMN anonymization_logs.entities_detected IS 'Ex: [{"type":"CPF","position":[10,21],"action":"redacted"}]';

CREATE INDEX idx_anonymization_logs_user_id ON anonymization_logs(user_id);
CREATE INDEX idx_anonymization_logs_message_id ON anonymization_logs(message_id);
CREATE INDEX idx_anonymization_logs_created_at ON anonymization_logs(created_at);

-- ============================================================================
-- TABELA 7: image_processing_logs — Prova de que imagens NÃO foram armazenadas
-- ============================================================================

CREATE TABLE image_processing_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  conversation_id       UUID NOT NULL REFERENCES conversations(id) ON DELETE SET NULL,
  message_id            UUID REFERENCES messages(id) ON DELETE SET NULL,
  image_hash            TEXT NOT NULL,  -- SHA-256 da imagem
  image_size_bytes      BIGINT NOT NULL,
  image_mime_type       TEXT NOT NULL,
  purpose               image_purpose NOT NULL,
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  discarded_at          TIMESTAMPTZ,  -- prova de descarte
  processing_duration_ms INTEGER,
  ai_model_used         TEXT,
  storage_proof         image_storage_proof NOT NULL DEFAULT 'never_stored',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE image_processing_logs IS 'Prova de que imagens NÃO foram armazenadas — apenas processadas em memória';
COMMENT ON COLUMN image_processing_logs.image_hash IS 'SHA-256 da imagem — identifica sem armazenar';
COMMENT ON COLUMN image_processing_logs.discarded_at IS 'Timestamp de descarte — prova para ANPD';

CREATE INDEX idx_image_processing_logs_user_id ON image_processing_logs(user_id);
CREATE INDEX idx_image_processing_logs_conversation_id ON image_processing_logs(conversation_id);
CREATE INDEX idx_image_processing_logs_created_at ON image_processing_logs(created_at);

-- ============================================================================
-- TABELA 8: consent_records — Gestão de consentimento
-- ============================================================================
-- Retenção: enquanto houver relação + 5 anos após revogação

CREATE TABLE consent_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type     consent_type NOT NULL,
  consent_version  TEXT NOT NULL,
  granted          BOOLEAN NOT NULL DEFAULT false,
  granted_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  ip_address       INET,
  user_agent       TEXT,
  legal_basis      TEXT NOT NULL,  -- Art. 7 ou Art. 11 LGPD
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_consent_dates CHECK (
    (granted = true AND granted_at IS NOT NULL) OR
    (granted = false)
  )
);

COMMENT ON TABLE consent_records IS 'Gestão de consentimento — Art. 7/11 LGPD. Retenção: relação + 5 anos pós-revogação';

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_created_at ON consent_records(created_at);

-- ============================================================================
-- TABELA 9: sensitive_data_detection_logs — Log de detecção NER
-- ============================================================================

CREATE TABLE sensitive_data_detection_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  message_id        UUID NOT NULL REFERENCES messages(id) ON DELETE SET NULL,
  detection_type    detection_type NOT NULL,
  detection_method  TEXT NOT NULL,
  confidence_score  NUMERIC(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  action_taken      detection_action NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sensitive_data_detection_logs IS 'Log de detecção NER — cada entidade sensível detectada';

CREATE INDEX idx_sensitive_data_detection_user_id ON sensitive_data_detection_logs(user_id);
CREATE INDEX idx_sensitive_data_detection_message_id ON sensitive_data_detection_logs(message_id);
CREATE INDEX idx_sensitive_data_detection_created_at ON sensitive_data_detection_logs(created_at);

-- ============================================================================
-- TABELA 10: data_subject_requests — Direitos dos Titulares (Art. 18 LGPD)
-- ============================================================================

CREATE TABLE data_subject_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type      dsr_request_type NOT NULL,
  status            dsr_status NOT NULL DEFAULT 'pending',
  description       TEXT NOT NULL,
  response          TEXT,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at   TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  deadline_at       TIMESTAMPTZ NOT NULL,  -- 15 dias úteis a partir do pedido
  export_format     dsr_export_format,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_subject_requests IS 'Direitos dos Titulares — Art. 18 LGPD. Prazo: 15 dias úteis';

CREATE INDEX idx_dsr_requester_user_id ON data_subject_requests(requester_user_id);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);
CREATE INDEX idx_dsr_deadline_at ON data_subject_requests(deadline_at);
CREATE INDEX idx_dsr_created_at ON data_subject_requests(created_at);

-- ============================================================================
-- TABELA 11: explainability_logs — Transparência da IA (Art. 20 LGPD)
-- ============================================================================

CREATE TABLE explainability_logs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  message_id                  UUID NOT NULL REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id             UUID NOT NULL REFERENCES conversations(id) ON DELETE SET NULL,
  ai_model_used               TEXT NOT NULL,
  explanation_level           SMALLINT NOT NULL CHECK (explanation_level BETWEEN 1 AND 3),
  explanation_content         TEXT NOT NULL,
  confidence_score            NUMERIC(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  disclaimer_shown            BOOLEAN NOT NULL DEFAULT true,
  human_in_the_loop_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE explainability_logs IS 'Transparência da IA — Art. 20 LGPD. Explica como a IA chegou à sugestão';
COMMENT ON COLUMN explainability_logs.explanation_level IS '1=básico, 2=detalhado, 3=técnico';
COMMENT ON COLUMN explainability_logs.disclaimer_shown IS 'Indica se "isto não é diagnóstico" foi exibido';

CREATE INDEX idx_explainability_user_id ON explainability_logs(user_id);
CREATE INDEX idx_explainability_message_id ON explainability_logs(message_id);
CREATE INDEX idx_explainability_conversation_id ON explainability_logs(conversation_id);
CREATE INDEX idx_explainability_created_at ON explainability_logs(created_at);

-- ============================================================================
-- TABELA 12: security_incident_logs — Incidentes de segurança
-- ============================================================================
-- Retenção: 5 anos (fiscalização ANPD)

CREATE TABLE security_incident_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type           TEXT NOT NULL,
  severity                incident_severity NOT NULL,
  description             TEXT NOT NULL,
  affected_users_count    INTEGER NOT NULL DEFAULT 0,
  detected_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at             TIMESTAMPTZ,
  resolution_description  TEXT,
  reported_to_anpd        BOOLEAN NOT NULL DEFAULT false,
  reported_at             TIMESTAMPTZ,
  is_simulation           BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE security_incident_logs IS 'Incidentes de segurança — retenção 5 anos para fiscalização ANPD';

CREATE INDEX idx_security_incidents_severity ON security_incident_logs(severity);
CREATE INDEX idx_security_incidents_detected_at ON security_incident_logs(detected_at);
CREATE INDEX idx_security_incidents_is_simulation ON security_incident_logs(is_simulation);
CREATE INDEX idx_security_incidents_created_at ON security_incident_logs(created_at);
