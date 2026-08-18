-- Webhooks table for external system integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  retry_attempts INTEGER DEFAULT 3,
  timeout INTEGER DEFAULT 10000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id VARCHAR(255) NOT NULL,
  event VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  status_code INTEGER,
  error TEXT,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

-- SMS notifications log
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);

-- Email notifications log (enhanced)
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  webhook_enabled BOOLEAN DEFAULT false,
  events JSONB NOT NULL DEFAULT '{}',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System alerts for monitoring
CREATE TABLE IF NOT EXISTS system_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON system_alerts(resolved);
