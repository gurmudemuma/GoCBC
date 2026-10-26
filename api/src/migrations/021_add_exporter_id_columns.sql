-- Migration: Add exporter_id columns to payments and quality_inspections tables
-- Description: Adds exporter_id columns needed for workflow processing
-- Date: 2026-10-14
-- Version: 1.0

-- Add exporter_id to payments table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'exporter_id'
    ) THEN
        ALTER TABLE payments ADD COLUMN exporter_id VARCHAR(100);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_payments_exporter ON payments(exporter_id);
        
        -- Add comment
        COMMENT ON COLUMN payments.exporter_id IS 'Foreign key reference to exporter ID';
        
        RAISE NOTICE 'Added exporter_id column to payments table';
    ELSE
        RAISE NOTICE 'exporter_id column already exists in payments table';
    END IF;
END $$;

-- Add exporter_id to quality_inspections table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'quality_inspections'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'quality_inspections' 
            AND column_name = 'exporter_id'
        ) THEN
            ALTER TABLE quality_inspections ADD COLUMN exporter_id VARCHAR(100);
            
            -- Add index for performance
            CREATE INDEX IF NOT EXISTS idx_quality_inspections_exporter ON quality_inspections(exporter_id);
            
            -- Add comment
            COMMENT ON COLUMN quality_inspections.exporter_id IS 'Foreign key reference to exporter ID';
            
            RAISE NOTICE 'Added exporter_id column to quality_inspections table';
        ELSE
            RAISE NOTICE 'exporter_id column already exists in quality_inspections table';
        END IF;
    ELSE
        RAISE NOTICE 'quality_inspections table does not exist, skipping';
    END IF;
END $$;
