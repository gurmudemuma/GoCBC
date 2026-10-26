-- Migration: Extend shipments table with additional columns
-- Description: Adds ico_number, ecx_lot_number, channel, forex_rate, value_usd, eudr_compliant, blockchain tracking columns
-- Date: 2026-10-14

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ico_number VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ecx_lot_number VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS channel VARCHAR(50);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS forex_rate DECIMAL(10,4);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS value_usd DECIMAL(15,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS eudr_compliant BOOLEAN DEFAULT false;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS blockchain_synced BOOLEAN DEFAULT false;

COMMENT ON COLUMN shipments.ico_number IS 'International Coffee Organization number';
COMMENT ON COLUMN shipments.ecx_lot_number IS 'Ethiopian Commodity Exchange lot number';
COMMENT ON COLUMN shipments.channel IS 'Export channel (ECX, Direct, etc.)';
COMMENT ON COLUMN shipments.forex_rate IS 'Foreign exchange rate at time of shipment';
COMMENT ON COLUMN shipments.value_usd IS 'Shipment value in USD';
COMMENT ON COLUMN shipments.eudr_compliant IS 'EU Deforestation Regulation compliance status';
COMMENT ON COLUMN shipments.blockchain_tx_id IS 'Blockchain transaction ID';
COMMENT ON COLUMN shipments.blockchain_synced IS 'Whether shipment is synced to blockchain';
