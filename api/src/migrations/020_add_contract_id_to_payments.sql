-- Migration: Add contract_id column to payments table
-- Description: Adds contract_id column to support contract-based payment tracking
-- Date: 2026-10-14
-- Version: 1.0

-- Add contract_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'contract_id'
    ) THEN
        ALTER TABLE payments ADD COLUMN contract_id VARCHAR(100);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
        
        -- Add comment
        COMMENT ON COLUMN payments.contract_id IS 'Foreign key reference to contract ID';
        
        RAISE NOTICE 'Added contract_id column to payments table';
    ELSE
        RAISE NOTICE 'contract_id column already exists in payments table';
    END IF;
END $$;
