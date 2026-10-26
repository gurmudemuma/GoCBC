-- Migration 015: Add Audit Logs and Notifications Tables
-- Created: 2026-09-01
-- Purpose: Complete system audit trail and notification management

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================
-- Comprehensive audit trail for all system operations
-- Enhance audit_logs table (basic version exists from base schema)
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS event_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS event_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO',
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS organization VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255),
ADD COLUMN IF NOT EXISTS http_method VARCHAR(10),
ADD COLUMN IF NOT EXISTS http_status INTEGER,
ADD COLUMN IF NOT EXISTS old_value JSONB,
ADD COLUMN IF NOT EXISTS new_value JSONB,
ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_block_number BIGINT,
ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add constraints if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'audit_logs_valid_severity'
    ) THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT audit_logs_valid_severity 
        CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'audit_logs_valid_category'
    ) THEN
        ALTER TABLE audit_logs 
        ADD CONSTRAINT audit_logs_valid_category 
        CHECK (event_category IN ('AUTH', 'BLOCKCHAIN', 'DATABASE', 'API', 'SECURITY', 'SYSTEM'));
    END IF;
END $$;

-- Indexes for fast searching (timestamp column exists in base schema, not created_at)
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_desc ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_blockchain_tx ON audit_logs(blockchain_tx_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tags ON audit_logs USING GIN (tags);

COMMENT ON TABLE audit_logs IS 'Comprehensive system audit trail';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (LOGIN, CREATE_CONTRACT, etc.)';
COMMENT ON COLUMN audit_logs.event_category IS 'Category: AUTH, BLOCKCHAIN, DATABASE, API, SECURITY, SYSTEM';
COMMENT ON COLUMN audit_logs.severity IS 'Log severity level';
COMMENT ON COLUMN audit_logs.blockchain_tx_id IS 'Associated Fabric transaction ID if applicable';

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
-- Multi-channel notification management (Email, SMS, Push, In-App, Webhook)
-- Note: Basic notifications table already exists from base schema, will be enhanced by migration 004_webhooks_and_notifications.sql
-- This migration focuses on notification_templates table

-- =============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- =============================================================================
-- Reusable notification templates

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    template_code VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Template Content
    subject_template TEXT,                    -- Email subject with {{variables}}
    body_template TEXT NOT NULL,              -- Message body with {{variables}}
    sms_template TEXT,                        -- SMS-specific template (shorter)
    
    -- Template Variables
    required_variables TEXT[],                -- ['shipmentId', 'exporterName', 'status']
    
    -- Settings
    default_channels TEXT[],
    default_priority VARCHAR(20) DEFAULT 'NORMAL',
    category VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_code ON notification_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable substitution';

-- Insert common notification templates
INSERT INTO notification_templates (template_code, template_name, subject_template, body_template, sms_template, required_variables, default_channels, category) VALUES
('CONTRACT_APPROVED', 'Contract Approval Notification', 
 'Contract {{contractId}} Approved', 
 'Dear {{exporterName}},\n\nYour contract {{contractId}} has been approved by ECTA.\n\nContract Details:\n- Buyer: {{buyerName}}\n- Quantity: {{quantity}} bags\n- Value: {{value}} {{currency}}\n\nYou can now proceed with shipment preparation.\n\nBest regards,\nECTA',
 'Contract {{contractId}} approved. Proceed with shipment preparation.',
 ARRAY['contractId', 'exporterName', 'buyerName', 'quantity', 'value', 'currency'],
 ARRAY['EMAIL', 'SMS', 'IN_APP'],
 'OPERATIONAL'),
 
('SHIPMENT_DELIVERED', 'Shipment Delivery Notification',
 'Shipment {{shipmentId}} Delivered',
 'Dear {{exporterName}},\n\nYour shipment {{shipmentId}} has been successfully delivered to the destination.\n\nDelivery Details:\n- Destination: {{destination}}\n- Delivery Date: {{deliveryDate}}\n\nPost-delivery workflow initiated:\n✓ Payment settlement\n✓ Forex repatriation\n✓ LC settlement\n✓ ECTA final audit\n\nBest regards,\nCECBS System',
 'Shipment {{shipmentId}} delivered to {{destination}}.',
 ARRAY['shipmentId', 'exporterName', 'destination', 'deliveryDate'],
 ARRAY['EMAIL', 'IN_APP'],
 'OPERATIONAL'),
 
('PAYMENT_OVERDUE', 'Payment Overdue Alert',
 'URGENT: Payment Overdue for Shipment {{shipmentId}}',
 'Dear {{exporterName}},\n\nPayment for shipment {{shipmentId}} is overdue.\n\nDetails:\n- Due Date: {{dueDate}}\n- Days Overdue: {{daysOverdue}}\n- Amount: {{amount}} {{currency}}\n\nPlease take immediate action to resolve this issue.\n\nBest regards,\nNBE Compliance Team',
 'URGENT: Payment for {{shipmentId}} is {{daysOverdue}} days overdue.',
 ARRAY['shipmentId', 'exporterName', 'dueDate', 'daysOverdue', 'amount', 'currency'],
 ARRAY['EMAIL', 'SMS', 'IN_APP'],
 'FINANCIAL'),
 
('CUSTOMS_CLEARANCE_APPROVED', 'Customs Clearance Approved',
 'Customs Clearance Approved for {{shipmentId}}',
 'Dear {{exporterName}},\n\nCustoms clearance has been approved for shipment {{shipmentId}}.\n\nClearance Details:\n- Clearance Number: {{clearanceNumber}}\n- Approved By: {{approvedBy}}\n- Approved Date: {{approvedDate}}\n\nYour shipment can now proceed to the next stage.\n\nBest regards,\nEthiopian Customs Authority',
 'Customs cleared: {{shipmentId}}',
 ARRAY['shipmentId', 'exporterName', 'clearanceNumber', 'approvedBy', 'approvedDate'],
 ARRAY['EMAIL', 'IN_APP'],
 'COMPLIANCE')
ON CONFLICT (template_code) DO NOTHING;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Recent audit logs view (base schema uses 'timestamp' not 'created_at')
CREATE OR REPLACE VIEW recent_audit_logs AS
SELECT 
    id,
    event_type,
    event_category,
    severity,
    username,
    user_role,
    action,
    resource_type,
    resource_id,
    ip_address,
    timestamp as created_at
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;

-- Pending notifications view
CREATE OR REPLACE VIEW pending_notifications AS
SELECT 
    id,
    user_id,
    title,
    notification_type,
    priority,
    channels,
    status,
    retry_count,
    scheduled_for,
    created_at
FROM notifications
WHERE status IN ('PENDING', 'RETRY')
  AND (scheduled_for IS NULL OR scheduled_for <= NOW())
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY priority DESC, created_at ASC;

-- User unread notifications view
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.notification_type,
    n.priority,
    n.action_url,
    n.action_label,
    n.resource_type,
    n.resource_id,
    n.created_at
FROM notifications n
WHERE 'IN_APP' = ANY(n.channels)
  AND n.in_app_read = FALSE
  AND n.status IN ('SENT', 'DELIVERED')
ORDER BY n.priority DESC, n.created_at DESC;

-- Notification delivery statistics view
CREATE OR REPLACE VIEW notification_delivery_stats AS
SELECT 
    notification_type,
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE email_sent = TRUE) as emails_sent,
    COUNT(*) FILTER (WHERE sms_sent = TRUE) as sms_sent,
    COUNT(*) FILTER (WHERE webhook_sent = TRUE) as webhooks_sent,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_delivery_time_seconds
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY notification_type, status;

COMMENT ON VIEW recent_audit_logs IS 'Audit logs from the last 30 days';
COMMENT ON VIEW pending_notifications IS 'Notifications pending delivery';
COMMENT ON VIEW user_unread_notifications IS 'Unread in-app notifications per user';
COMMENT ON VIEW notification_delivery_stats IS 'Notification delivery statistics (last 7 days)';

-- Migration completed
SELECT 'Migration 015 completed: audit_logs and notifications tables created' AS status;
