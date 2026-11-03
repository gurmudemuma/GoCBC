-- Migration 051: Extend payments table for E2E workflow
-- Add missing columns required by PaymentService

-- Add lc_id (distinct from lc_number)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS lc_id VARCHAR(100);

-- Add forex_id
ALTER TABLE payments ADD COLUMN IF NOT EXISTS forex_id VARCHAR(100);

-- Add retention_rate
ALTER TABLE payments ADD COLUMN IF NOT EXISTS retention_rate INTEGER;

-- Add retention_amount
ALTER TABLE payments ADD COLUMN IF NOT EXISTS retention_amount DECIMAL(15,2);

-- Add release_amount
ALTER TABLE payments ADD COLUMN IF NOT EXISTS release_amount DECIMAL(15,2);

-- Add swift_reference
ALTER TABLE payments ADD COLUMN IF NOT EXISTS swift_reference VARCHAR(100);

-- Add payer_name
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_name VARCHAR(255);

-- Add payer_bank
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_bank VARCHAR(255);

-- Add blockchain_tx_id (if not already added by migration 026)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(100);

-- Add amount_usd (distinct from amount)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(15,2);

-- Add exporter_id
ALTER TABLE payments ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100);

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_payments_lc_id ON payments(lc_id);
CREATE INDEX IF NOT EXISTS idx_payments_forex_id ON payments(forex_id);
CREATE INDEX IF NOT EXISTS idx_payments_exporter_id ON payments(exporter_id);
