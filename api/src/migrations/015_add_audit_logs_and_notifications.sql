-- Migration 015: Add Audit Logs and Notifications Tables
-- Created: 2026-09-01
-- Purpose: Complete system audit trail and notification management

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================
-- Comprehensive audit trail for all system operations
-- Records: user actions, blockchain transactions, data changes, security events

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    
    -- Event Identification
    event_type VARCHAR(100) NOT NULL,  -- LOGIN, LOGOUT, CREATE_CONTRACT, UPDATE_SHIPMENT, etc.
    event_category VARCHAR(50) NOT NULL, -- AUTH, BLOCKCHAIN, DATABASE, API, SECURITY
    severity VARCHAR(20) DEFAULT 'INFO', -- DEBUG, INFO, WARN, ERROR, CRITICAL
    
    -- Actor Information
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(255),
    user_role VARCHAR(50),
    organization VARCHAR(100),
    
    -- Action Details
    action VARCHAR(255) NOT NULL,  -- Brief description
    description TEXT,              -- Detailed description
    resource_type VARCHAR(100),    -- CONTRACT, SHIPMENT, USER, DOCUMENT, etc.
    resource_id VARCHAR(255),      -- ID of affected resource
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(255),         -- API endpoint called
    http_method VARCHAR(10),       -- GET, POST, PUT, DELETE
    http_status INTEGER,           -- Response status code
    
    -- Data Changes
    old_value JSONB,               -- Previous state
    new_value JSONB,               -- New state
    changes JSONB,                 -- Specific fields changed
    
    -- Blockchain Integration
    blockchain_tx_id VARCHAR(255), -- Fabric transaction ID
    blockchain_block_number BIGINT,
    blockchain_timestamp TIMESTAMP,
    
    -- Metadata
    metadata JSONB,                -- Additional context
    tags TEXT[],                   -- Searchable tags
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing
    CONSTRAINT valid_severity CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    CONSTRAINT valid_category CHECK (event_category IN ('AUTH', 'BLOCKCHAIN', 'DATABASE', 'API', 'SECURITY', 'SYSTEM'))
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
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

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    
    -- Recipient Information
    user_id INTEGER REFERENCES users(id),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_name VARCHAR(255),
    organization VARCHAR(100),
    
    -- Notification Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(100) NOT NULL, -- CONTRACT_APPROVED, SHIPMENT_DELAYED, PAYMENT_DUE, etc.
    priority VARCHAR(20) DEFAULT 'NORMAL',   -- LOW, NORMAL, HIGH, URGENT
    category VARCHAR(50),                     -- OPERATIONAL, COMPLIANCE, FINANCIAL, SYSTEM
    
    -- Delivery Channels
    channels TEXT[] NOT NULL,                 -- ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK']
    
    -- Email Specific
    email_subject VARCHAR(255),
    email_html TEXT,
    email_attachments JSONB,                  -- [{filename, path, contentType}]
    
    -- SMS Specific
    sms_message TEXT,
    
    -- Push Notification Specific
    push_data JSONB,                          -- Custom payload for mobile push
    
    -- In-App Specific
    in_app_read BOOLEAN DEFAULT FALSE,
    in_app_read_at TIMESTAMP,
    
    -- Webhook Specific
    webhook_url TEXT,
    webhook_payload JSONB,
    webhook_headers JSONB,
    
    -- Action Links
    action_url TEXT,                          -- Deep link to relevant resource
    action_label VARCHAR(100),                -- "View Shipment", "Approve Contract"
    
    -- Related Resources
    resource_type VARCHAR(100),               -- CONTRACT, SHIPMENT, PAYMENT, etc.
    resource_id VARCHAR(255),
    contract_id VARCHAR(255),
    shipment_id VARCHAR(255),
    
    -- Delivery Status
    status VARCHAR(50) DEFAULT 'PENDING',     -- PENDING, SENT, DELIVERED, FAILED, RETRY
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    email_error TEXT,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    sms_error TEXT,
    webhook_sent BOOLEAN DEFAULT FALSE,
    webhook_sent_at TIMESTAMP,
    webhook_response_status INTEGER,
    webhook_error TEXT,
    
    -- Retry Logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    
    -- Scheduling
    scheduled_for TIMESTAMP,                  -- For delayed notifications
    expires_at TIMESTAMP,                     -- Auto-delete after this date
    
    -- Metadata
    metadata JSONB,
    tags TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRY', 'CANCELLED'))
);

-- Indexes for notification management
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_notifications_retry ON notifications(next_retry_at) WHERE status = 'RETRY';
CREATE INDEX IF NOT EXISTS idx_notifications_resource ON notifications(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_notifications_in_app_unread ON notifications(user_id, in_app_read) WHERE in_app_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN (metadata);

COMMENT ON TABLE notifications IS 'Multi-channel notification management system';
COMMENT ON COLUMN notifications.channels IS 'Delivery channels: EMAIL, SMS, PUSH, IN_APP, WEBHOOK';
COMMENT ON COLUMN notifications.priority IS 'Notification priority level';
COMMENT ON COLUMN notifications.status IS 'Delivery status';

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

-- Recent audit logs view
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
    created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

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
