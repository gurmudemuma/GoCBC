-- Migration: Create audit_log table for API audit capture
-- Description: Unified audit log table for capturing all user actions
-- Created: 2026-09-07

-- ====================================================================
-- AUDIT LOG TABLE (API Level)
-- ====================================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS audit_log CASCADE;

-- Create the audit_log table
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(200) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Create index on JSONB details for faster JSON queries
CREATE INDEX idx_audit_log_details ON audit_log USING GIN (details);

-- ====================================================================
-- VIEW: Recent Audit Activity
-- ====================================================================
CREATE OR REPLACE VIEW v_recent_audit_activity AS
SELECT 
  al.id,
  al.user_id,
  al.username,
  al.action,
  al.entity_type,
  al.entity_id,
  al.details,
  al.ip_address,
  al.created_at,
  u.full_name as user_full_name,
  u.organization
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 100;

-- ====================================================================
-- FUNCTION: Clean up old audit logs (keep last 90 days)
-- ====================================================================
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() 
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- COMMENTS
-- ====================================================================
COMMENT ON TABLE audit_log IS 'API-level audit log capturing all user actions';
COMMENT ON VIEW v_recent_audit_activity IS 'Recent audit activity with user details';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than 90 days';
