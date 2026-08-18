-- Migration: Update audit_trail table with additional columns for comprehensive logging
-- This adds columns needed for the audit service

-- Add performed_by_org column (alias for organization)
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(100);

-- Add old_value and new_value for tracking state changes
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS new_value TEXT;

-- Add reason for actions
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add metadata as JSONB for flexible storage
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add IP address for security tracking
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Copy organization data to performed_by_org for backward compatibility
UPDATE audit_trail SET performed_by_org = organization WHERE performed_by_org IS NULL;

-- Copy changes to metadata for backward compatibility
UPDATE audit_trail SET metadata = COALESCE(changes, '{}'::jsonb) WHERE metadata = '{}'::jsonb;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_action ON audit_trail(entity_type, action);

-- Add comments for documentation
COMMENT ON COLUMN audit_trail.entity_type IS 'Type of entity (CONTRACT, EXPORTER, LC, PAYMENT, etc.)';
COMMENT ON COLUMN audit_trail.entity_id IS 'Unique identifier of the entity';
COMMENT ON COLUMN audit_trail.action IS 'Action performed (CREATE, UPDATE, APPROVE, REJECT, etc.)';
COMMENT ON COLUMN audit_trail.performed_by IS 'Username/ID of user who performed the action';
COMMENT ON COLUMN audit_trail.performed_by_org IS 'Organization of the user (ECTAMSP, BANKSMSP, etc.)';
COMMENT ON COLUMN audit_trail.old_value IS 'Previous value/state before the action';
COMMENT ON COLUMN audit_trail.new_value IS 'New value/state after the action';
COMMENT ON COLUMN audit_trail.reason IS 'Reason or notes for the action';
COMMENT ON COLUMN audit_trail.metadata IS 'Additional contextual information as JSON';
COMMENT ON COLUMN audit_trail.ip_address IS 'IP address of the user who performed the action';
COMMENT ON COLUMN audit_trail.blockchain_tx_id IS 'Blockchain transaction ID if applicable';
