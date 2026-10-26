-- Migration: Add blockchain_tx_id column to payments table
-- Description: Adds blockchain_tx_id column to track blockchain transaction IDs
-- Date: 2026-10-14

ALTER TABLE payments ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);

COMMENT ON COLUMN payments.blockchain_tx_id IS 'Blockchain transaction ID for payment recording';
