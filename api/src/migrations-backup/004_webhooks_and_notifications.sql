-- Webhooks table for external system integrations
-- Enhance webhooks table (basic version exists from base schema)
ALTER TABLE webhooks
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS retry_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS timeout INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by_user INTEGER;

-- Change id column type if needed (safely)
-- Note: We can't easily change column types, so we'll work with existing structure

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);

-- Webhook delivery logs (removed duplicate, keeping the correct one below with INTEGER webhook_id)
-- SMS notifications log (removed duplicate, keeping the correct one below)

-- Enhance notifications table (basic version exists from base schema)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS organization VARCHAR(100),
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS channels TEXT[],
ADD COLUMN IF NOT EXISTS email_subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_html TEXT,
ADD COLUMN IF NOT EXISTS email_attachments JSONB,
ADD COLUMN IF NOT EXISTS sms_message TEXT,
ADD COLUMN IF NOT EXISTS push_data JSONB,
ADD COLUMN IF NOT EXISTS in_app_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS in_app_read_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_payload JSONB,
ADD COLUMN IF NOT EXISTS webhook_headers JSONB,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100),
ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS shipment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_error TEXT,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sms_error TEXT,
ADD COLUMN IF NOT EXISTS webhook_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS webhook_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS webhook_response_status INTEGER,
ADD COLUMN IF NOT EXISTS webhook_error TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER,
  event VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  status_code INTEGER,
  error TEXT,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Additional indexes for notifications table (enhanced by migration 004)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_resource ON notifications(resource_type, resource_id);
