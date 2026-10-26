-- Fix Audit Trail Table - Add Missing Columns
-- Run this to ensure audit_trail table has all required columns

-- Add performed_by column if it doesn't exist
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

-- Add performed_by_org column if it doesn't exist
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

-- Add organization column if it doesn't exist (legacy compatibility)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);

-- Show current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
ORDER BY ordinal_position;
