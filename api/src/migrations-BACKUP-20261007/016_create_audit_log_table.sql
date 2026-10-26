-- Migration: Create audit_log table for API audit capture
-- Description: Unified audit log table for capturing all user actions
-- Created: 2026-09-07

-- ====================================================================
-- AUDIT LOG TABLE (API Level)
-- ====================================================================

-- Enhance audit_log table (basic version exists from base schema)
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD COLUMN IF NOT EXISTS username VARCHAR(100),
ADD COLUMN IF NOT EXISTS action VARCHAR(50),
ADD COLUMN IF NOT EXISTS details JSONB,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_details ON audit_log USING GIN (details);

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
  u.username as user_full_name,
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
