-- Migration: Extend quality_inspections table with missing columns
-- Description: Adds contract_id, coffee_type, quantity, sample_size, requested_date, blockchain_tx_id columns
-- Date: 2026-10-14

ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS coffee_type VARCHAR(100);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS sample_size DECIMAL(10,2);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS requested_date TIMESTAMP;
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS blockchain_tx_id VARCHAR(255);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS certification_number VARCHAR(100);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS remarks TEXT;

COMMENT ON COLUMN quality_inspections.contract_id IS 'Associated contract ID';
COMMENT ON COLUMN quality_inspections.coffee_type IS 'Type/variety of coffee';
COMMENT ON COLUMN quality_inspections.quantity IS 'Quantity of coffee being inspected (kg)';
COMMENT ON COLUMN quality_inspections.sample_size IS 'Sample size taken for inspection (kg)';
COMMENT ON COLUMN quality_inspections.requested_date IS 'Date inspection was requested';
COMMENT ON COLUMN quality_inspections.blockchain_tx_id IS 'Blockchain transaction ID';
COMMENT ON COLUMN quality_inspections.certification_number IS 'Quality certificate number if issued';
COMMENT ON COLUMN quality_inspections.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN quality_inspections.remarks IS 'Additional remarks or notes';
