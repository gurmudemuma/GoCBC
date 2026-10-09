-- Fix Audit Trail Table - Add ALL Missing Columns
-- Comprehensive migration to ensure all required columns exist

-- Add entity_type column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'entity_type') THEN
        ALTER TABLE audit_trail ADD COLUMN entity_type VARCHAR(100);
        RAISE NOTICE 'Added entity_type column';
    ELSE
        RAISE NOTICE 'entity_type column already exists';
    END IF;
END$$;

-- Add entity_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'entity_id') THEN
        ALTER TABLE audit_trail ADD COLUMN entity_id VARCHAR(255);
        RAISE NOTICE 'Added entity_id column';
    ELSE
        RAISE NOTICE 'entity_id column already exists';
    END IF;
END$$;

-- Add action column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'action') THEN
        ALTER TABLE audit_trail ADD COLUMN action VARCHAR(100);
        RAISE NOTICE 'Added action column';
    ELSE
        RAISE NOTICE 'action column already exists';
    END IF;
END$$;

-- Add performed_by column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'performed_by') THEN
        ALTER TABLE audit_trail ADD COLUMN performed_by VARCHAR(255);
        RAISE NOTICE 'Added performed_by column';
    ELSE
        RAISE NOTICE 'performed_by column already exists';
    END IF;
END$$;

-- Add performed_by_org column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'performed_by_org') THEN
        ALTER TABLE audit_trail ADD COLUMN performed_by_org VARCHAR(255);
        RAISE NOTICE 'Added performed_by_org column';
    ELSE
        RAISE NOTICE 'performed_by_org column already exists';
    END IF;
END$$;

-- Add organization column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'organization') THEN
        ALTER TABLE audit_trail ADD COLUMN organization VARCHAR(255);
        RAISE NOTICE 'Added organization column';
    ELSE
        RAISE NOTICE 'organization column already exists';
    END IF;
END$$;

-- Add old_value column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'old_value') THEN
        ALTER TABLE audit_trail ADD COLUMN old_value TEXT;
        RAISE NOTICE 'Added old_value column';
    ELSE
        RAISE NOTICE 'old_value column already exists';
    END IF;
END$$;

-- Add new_value column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'new_value') THEN
        ALTER TABLE audit_trail ADD COLUMN new_value TEXT;
        RAISE NOTICE 'Added new_value column';
    ELSE
        RAISE NOTICE 'new_value column already exists';
    END IF;
END$$;

-- Add reason column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'reason') THEN
        ALTER TABLE audit_trail ADD COLUMN reason TEXT;
        RAISE NOTICE 'Added reason column';
    ELSE
        RAISE NOTICE 'reason column already exists';
    END IF;
END$$;

-- Add metadata column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'metadata') THEN
        ALTER TABLE audit_trail ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata column';
    ELSE
        RAISE NOTICE 'metadata column already exists';
    END IF;
END$$;

-- Add ip_address column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'ip_address') THEN
        ALTER TABLE audit_trail ADD COLUMN ip_address VARCHAR(45);
        RAISE NOTICE 'Added ip_address column';
    ELSE
        RAISE NOTICE 'ip_address column already exists';
    END IF;
END$$;

-- Add created_at column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'created_at') THEN
        ALTER TABLE audit_trail ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);

-- Show final table structure
\echo ''
\echo '==============================================='
\echo 'FINAL AUDIT_TRAIL TABLE STRUCTURE'
\echo '==============================================='
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
ORDER BY ordinal_position;
