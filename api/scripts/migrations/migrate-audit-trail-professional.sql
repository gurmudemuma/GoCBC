-- Professional Audit Trail Migration
-- Adds missing indexes, constraints, and optimizations

-- 1. Add professional indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performer ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_source ON audit_trail USING gin ((metadata->'source'));
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_created ON audit_trail(entity_type, entity_id, created_at DESC);

-- 2. Add constraints for data integrity (if not exists)
DO $$
BEGIN
    -- Check constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_trail_entity_check') THEN
        ALTER TABLE audit_trail ADD CONSTRAINT audit_trail_entity_check 
        CHECK (entity_type != '' AND entity_id != '');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_trail_action_check') THEN
        ALTER TABLE audit_trail ADD CONSTRAINT audit_trail_action_check 
        CHECK (action != '');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_trail_performer_check') THEN
        ALTER TABLE audit_trail ADD CONSTRAINT audit_trail_performer_check 
        CHECK (performed_by != '');
    END IF;
END$$;

-- 3. Make created_at NOT NULL if it's currently nullable
ALTER TABLE audit_trail ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE audit_trail ALTER COLUMN created_at SET NOT NULL;

-- 4. Set default for metadata if not set
ALTER TABLE audit_trail ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- 5. Add comments for professional documentation
COMMENT ON TABLE audit_trail IS 'Comprehensive audit trail for all system transactions';
COMMENT ON COLUMN audit_trail.id IS 'Unique audit log identifier';
COMMENT ON COLUMN audit_trail.entity_type IS 'Type of entity (EXPORTER, CONTRACT, etc.)';
COMMENT ON COLUMN audit_trail.entity_id IS 'Unique identifier of the entity';
COMMENT ON COLUMN audit_trail.action IS 'Action performed (CREATE, UPDATE, APPROVE, etc.)';
COMMENT ON COLUMN audit_trail.performed_by IS 'User or system that performed the action';
COMMENT ON COLUMN audit_trail.organization IS 'Organization of the performer';
COMMENT ON COLUMN audit_trail.performed_by_org IS 'Organization identifier (MSP ID)';
COMMENT ON COLUMN audit_trail.old_value IS 'Previous state/value';
COMMENT ON COLUMN audit_trail.new_value IS 'New state/value after action';
COMMENT ON COLUMN audit_trail.reason IS 'Reason or description for the action';
COMMENT ON COLUMN audit_trail.metadata IS 'Additional structured data (JSON)';
COMMENT ON COLUMN audit_trail.ip_address IS 'IP address of the performer';
COMMENT ON COLUMN audit_trail.blockchain_tx_id IS 'Blockchain transaction ID (if applicable)';
COMMENT ON COLUMN audit_trail.created_at IS 'Timestamp when action occurred';

-- 6. Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'audit_trail'
ORDER BY indexname;
