-- Migration: Add inspection_id column to quality_inspections table
-- Description: Adds inspection_id unique identifier column
-- Date: 2026-10-14

ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS inspection_id VARCHAR(100);

-- Create unique index on inspection_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_inspections_inspection_id 
ON quality_inspections(inspection_id) 
WHERE inspection_id IS NOT NULL;

COMMENT ON COLUMN quality_inspections.inspection_id IS 'Unique inspection identifier';
