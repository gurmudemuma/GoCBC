-- Migration: Fix exporter_applications table schema
-- Adds missing columns that the application code expects

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add bank_branch column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='exporter_applications' AND column_name='bank_branch') THEN
        ALTER TABLE exporter_applications ADD COLUMN bank_branch VARCHAR(255);
        RAISE NOTICE 'Added bank_branch column';
    END IF;

    -- Add bank_branch_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='exporter_applications' AND column_name='bank_branch_code') THEN
        ALTER TABLE exporter_applications ADD COLUMN bank_branch_code VARCHAR(50);
        RAISE NOTICE 'Added bank_branch_code column';
    END IF;

    -- Add documents column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='exporter_applications' AND column_name='documents') THEN
        ALTER TABLE exporter_applications ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added documents column';
    END IF;

    -- Add exporter_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='exporter_applications' AND column_name='exporter_type') THEN
        ALTER TABLE exporter_applications ADD COLUMN exporter_type VARCHAR(20) DEFAULT 'company';
        RAISE NOTICE 'Added exporter_type column';
    END IF;

    -- Add laboratory_certificate_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='exporter_applications' AND column_name='laboratory_certificate_number') THEN
        ALTER TABLE exporter_applications ADD COLUMN laboratory_certificate_number VARCHAR(100);
        RAISE NOTICE 'Added laboratory_certificate_number column';
    END IF;

    -- Make taster_certificate nullable (it was NOT NULL before)
    ALTER TABLE exporter_applications ALTER COLUMN taster_certificate DROP NOT NULL;
    RAISE NOTICE 'Made taster_certificate nullable';

END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'exporter_applications'
ORDER BY ordinal_position;
