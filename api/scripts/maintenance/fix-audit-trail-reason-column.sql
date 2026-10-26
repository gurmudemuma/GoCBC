-- Fix Audit Trail Table - Add Missing Reason Column
-- Run this to ensure audit_trail table has the reason column

-- Add reason column if it doesn't exist
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

-- Show current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
ORDER BY ordinal_position;
