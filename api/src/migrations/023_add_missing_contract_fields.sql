-- Migration: Add missing contract fields
-- Description: Adds buyer_name, shipping, certification, and other missing columns
-- Date: 2026-10-21
-- Version: 1.0

-- Add missing columns to contracts table
DO $$ 
BEGIN
    -- buyer_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'buyer_name'
    ) THEN
        ALTER TABLE contracts ADD COLUMN buyer_name VARCHAR(255);
        RAISE NOTICE 'Added buyer_name column';
    END IF;

    -- organic_certified
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'organic_certified'
    ) THEN
        ALTER TABLE contracts ADD COLUMN organic_certified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added organic_certified column';
    END IF;

    -- fair_trade_certified
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'fair_trade_certified'
    ) THEN
        ALTER TABLE contracts ADD COLUMN fair_trade_certified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added fair_trade_certified column';
    END IF;

    -- port_of_loading
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'port_of_loading'
    ) THEN
        ALTER TABLE contracts ADD COLUMN port_of_loading VARCHAR(255);
        RAISE NOTICE 'Added port_of_loading column';
    END IF;

    -- port_of_destination
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'port_of_destination'
    ) THEN
        ALTER TABLE contracts ADD COLUMN port_of_destination VARCHAR(255);
        RAISE NOTICE 'Added port_of_destination column';
    END IF;

    -- delivery_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'delivery_date'
    ) THEN
        ALTER TABLE contracts ADD COLUMN delivery_date DATE;
        RAISE NOTICE 'Added delivery_date column';
    END IF;

    -- incoterm
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'incoterm'
    ) THEN
        ALTER TABLE contracts ADD COLUMN incoterm VARCHAR(10);
        RAISE NOTICE 'Added incoterm column';
    END IF;

    -- special_instructions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'special_instructions'
    ) THEN
        ALTER TABLE contracts ADD COLUMN special_instructions TEXT;
        RAISE NOTICE 'Added special_instructions column';
    END IF;

    RAISE NOTICE 'Missing contract fields migration complete';
END $$;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_name ON contracts(buyer_name);
CREATE INDEX IF NOT EXISTS idx_contracts_delivery_date ON contracts(delivery_date);
CREATE INDEX IF NOT EXISTS idx_contracts_organic ON contracts(organic_certified) WHERE organic_certified = true;
CREATE INDEX IF NOT EXISTS idx_contracts_fair_trade ON contracts(fair_trade_certified) WHERE fair_trade_certified = true;

-- Add comments
COMMENT ON COLUMN contracts.buyer_name IS 'Name of the buyer company';
COMMENT ON COLUMN contracts.organic_certified IS 'Whether the coffee is organic certified';
COMMENT ON COLUMN contracts.fair_trade_certified IS 'Whether the coffee is fair trade certified';
COMMENT ON COLUMN contracts.port_of_loading IS 'Port where coffee will be loaded for shipment';
COMMENT ON COLUMN contracts.port_of_destination IS 'Destination port for the shipment';
COMMENT ON COLUMN contracts.delivery_date IS 'Expected delivery date';
COMMENT ON COLUMN contracts.incoterm IS 'International commercial term (FOB, CIF, etc.)';
COMMENT ON COLUMN contracts.special_instructions IS 'Additional instructions or notes for the contract';
