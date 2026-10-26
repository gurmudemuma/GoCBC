-- Migration: Extend contracts table with missing columns
-- Description: Adds columns required for full contract management
-- Date: 2026-10-14
-- Version: 1.0

-- Add missing columns to contracts table
DO $$ 
BEGIN
    -- buyer_country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'buyer_country'
    ) THEN
        ALTER TABLE contracts ADD COLUMN buyer_country VARCHAR(100);
        RAISE NOTICE 'Added buyer_country column';
    END IF;

    -- buyer_bank
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'buyer_bank'
    ) THEN
        ALTER TABLE contracts ADD COLUMN buyer_bank VARCHAR(255);
        RAISE NOTICE 'Added buyer_bank column';
    END IF;

    -- exporter_bank
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'exporter_bank'
    ) THEN
        ALTER TABLE contracts ADD COLUMN exporter_bank VARCHAR(255);
        RAISE NOTICE 'Added exporter_bank column';
    END IF;

    -- coffee_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'coffee_type'
    ) THEN
        ALTER TABLE contracts ADD COLUMN coffee_type VARCHAR(100);
        RAISE NOTICE 'Added coffee_type column';
    END IF;

    -- currency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'currency'
    ) THEN
        ALTER TABLE contracts ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
        RAISE NOTICE 'Added currency column';
    END IF;

    -- payment_method
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE contracts ADD COLUMN payment_method VARCHAR(50) DEFAULT 'LC';
        RAISE NOTICE 'Added payment_method column';
    END IF;

    -- eudr_required
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'eudr_required'
    ) THEN
        ALTER TABLE contracts ADD COLUMN eudr_required BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added eudr_required column';
    END IF;

    -- blockchain_tx_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'blockchain_tx_id'
    ) THEN
        ALTER TABLE contracts ADD COLUMN blockchain_tx_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_contracts_blockchain_tx ON contracts(blockchain_tx_id);
        RAISE NOTICE 'Added blockchain_tx_id column';
    END IF;

    -- blockchain_synced
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'blockchain_synced'
    ) THEN
        ALTER TABLE contracts ADD COLUMN blockchain_synced BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added blockchain_synced column';
    END IF;

    RAISE NOTICE 'Contracts table extension complete';
END $$;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_country ON contracts(buyer_country);
CREATE INDEX IF NOT EXISTS idx_contracts_coffee_type ON contracts(coffee_type);
CREATE INDEX IF NOT EXISTS idx_contracts_eudr ON contracts(eudr_required) WHERE eudr_required = true;

-- Add comments
COMMENT ON COLUMN contracts.buyer_country IS 'Country of the buyer';
COMMENT ON COLUMN contracts.buyer_bank IS 'Issuing bank (buyer side)';
COMMENT ON COLUMN contracts.exporter_bank IS 'Advising bank (exporter side)';
COMMENT ON COLUMN contracts.coffee_type IS 'Type and grade of coffee';
COMMENT ON COLUMN contracts.currency IS 'Contract currency (default: USD)';
COMMENT ON COLUMN contracts.payment_method IS 'Payment method (LC, CAD, TT, etc.)';
COMMENT ON COLUMN contracts.eudr_required IS 'EU Deforestation Regulation compliance required';
COMMENT ON COLUMN contracts.blockchain_tx_id IS 'Blockchain transaction ID';
COMMENT ON COLUMN contracts.blockchain_synced IS 'Whether contract is synced to blockchain';
