-- Migration 079: create customs_risk_rules (round 3, Area 1)
--
-- The Admin portal's RiskRulesManager PUTs the edited risk rules to
-- PUT /customs/risk-rules, but no such route existed (404) and
-- GET /customs/risk-rules returned a hardcoded in-code config, so the
-- super admin's "Save" button could never persist anything. This table
-- holds the single current rules document (id = 1); the GET falls back
-- to the previous hardcoded defaults until a PUT has stored a row.
-- Idempotent: IF NOT EXISTS, no data is altered.
CREATE TABLE IF NOT EXISTS customs_risk_rules (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customs_risk_rules_single_row CHECK (id = 1)
);
