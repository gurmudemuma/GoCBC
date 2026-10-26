-- Migration: Add passed column to quality_inspections table
-- Description: Adds passed boolean column to track inspection results
-- Date: 2026-10-14

ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS passed BOOLEAN;

-- Set default based on existing status values
UPDATE quality_inspections 
SET passed = CASE 
    WHEN status = 'approved' THEN true
    WHEN status = 'rejected' THEN false
    ELSE NULL
END
WHERE passed IS NULL;

COMMENT ON COLUMN quality_inspections.passed IS 'Whether the quality inspection passed (true/false)';
