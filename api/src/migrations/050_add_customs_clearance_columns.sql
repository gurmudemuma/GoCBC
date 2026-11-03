-- Migration: Add missing customs clearance columns
-- Description: Adds cleared_by, clearance_number, duties, taxes, clearance_notes, clearance_date columns
-- Date: 2026-11-03

ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS cleared_by VARCHAR(255);
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS clearance_number VARCHAR(100);
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS duties DECIMAL(15,2);
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS taxes DECIMAL(15,2);
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS clearance_notes TEXT;
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS clearance_date TIMESTAMP;

COMMENT ON COLUMN customs_declarations.cleared_by IS 'Name or ID of customs officer who cleared the shipment';
COMMENT ON COLUMN customs_declarations.clearance_number IS 'Unique clearance reference number';
COMMENT ON COLUMN customs_declarations.duties IS 'Customs duties amount';
COMMENT ON COLUMN customs_declarations.taxes IS 'Tax amount';
COMMENT ON COLUMN customs_declarations.clearance_notes IS 'Notes from customs clearance';
COMMENT ON COLUMN customs_declarations.clearance_date IS 'Date and time of customs clearance';
