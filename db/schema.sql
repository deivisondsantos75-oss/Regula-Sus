-- RegulaSUS — esquema do banco (PostgreSQL). Idempotente: pode rodar várias vezes.

CREATE TABLE IF NOT EXISTS units (
  id              SERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  level           INTEGER     NOT NULL,
  level_label     TEXT        NOT NULL,
  specialties     TEXT[]      NOT NULL DEFAULT '{}',
  audience        TEXT        NOT NULL DEFAULT 'todos',
  total_beds      INTEGER     NOT NULL,
  available_beds  INTEGER     NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT units_beds_ck CHECK (available_beds >= 0 AND available_beds <= total_beds),
  CONSTRAINT units_audience_ck CHECK (audience IN ('todos','adulto','pediatrico','materno_infantil'))
);
ALTER TABLE units ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'todos';

CREATE TABLE IF NOT EXISTS patients (
  id                  SERIAL PRIMARY KEY,
  name                TEXT        NOT NULL,
  age                 INTEGER     NOT NULL,
  sex                 TEXT        NOT NULL,
  cns                 TEXT,
  city                TEXT        NOT NULL,
  complaint           TEXT        NOT NULL,
  comorbidities       TEXT,
  systolic            INTEGER,
  diastolic           INTEGER,
  heart_rate          INTEGER,
  spo2                INTEGER,
  temperature         NUMERIC(4,1),
  resp_rate           INTEGER,
  glasgow             INTEGER,
  status              TEXT        NOT NULL DEFAULT 'aguardando',
  priority            TEXT,
  complexity          TEXT,
  risk_score          INTEGER,
  specialty           TEXT,
  ai_summary          TEXT,
  ai_justification    TEXT,
  red_flags           TEXT[],
  assigned_unit_id    INTEGER,
  triaged_at          TIMESTAMPTZ,
  referred_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- migração: coluna que nunca era lida (a recomendação é recalculada com as vagas atuais)
ALTER TABLE patients DROP COLUMN IF EXISTS recommended_unit_id;

-- integridade (idempotente: só cria se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_enums_ck') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_enums_ck CHECK (
      status IN ('aguardando','triado','encaminhado')
      AND sex IN ('F','M')
      AND (priority IS NULL OR priority IN ('vermelho','laranja','amarelo','verde','azul'))
      AND (complexity IS NULL OR complexity IN ('basica','media_urgencia','media','alta'))
      AND age BETWEEN 0 AND 120
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_assigned_unit_fk') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_assigned_unit_fk
      FOREIGN KEY (assigned_unit_id) REFERENCES units(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS patients_status_idx ON patients (status);
CREATE INDEX IF NOT EXISTS patients_queue_idx ON patients (status, priority, created_at);

-- Trilha de auditoria (LGPD): quem fez o quê e quando.
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  actor_name  TEXT        NOT NULL,
  actor_role  TEXT        NOT NULL,
  actor_id    TEXT,
  action      TEXT        NOT NULL,
  entity      TEXT,
  entity_id   TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);
