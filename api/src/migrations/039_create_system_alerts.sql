-- Persist application level alerts used by the notifications and monitoring APIs.
CREATE TABLE IF NOT EXISTS system_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_open_created
  ON system_alerts (created_at DESC, id DESC)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_system_alerts_severity_created
  ON system_alerts (severity, created_at DESC);
