-- Migration: Extend quality inspection VARCHAR columns
-- Description: Changes cup_quality to TEXT to store JSON data and extends status column
-- Date: 2026-11-03

-- Change cup_quality from VARCHAR(50) to TEXT to store JSON cup quality scores
ALTER TABLE quality_inspections ALTER COLUMN cup_quality TYPE TEXT;

-- Change status to handle longer status values if needed
ALTER TABLE quality_inspections ALTER COLUMN status TYPE VARCHAR(100);

COMMENT ON COLUMN quality_inspections.cup_quality IS 'Cup quality scores stored as JSON text';
