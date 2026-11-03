-- Migration: Add missing quality inspection columns
-- Description: Adds inspector_name and screen_size columns that the API code expects
-- Date: 2026-11-03

ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS screen_size INTEGER;

COMMENT ON COLUMN quality_inspections.inspector_name IS 'Name of the inspector or inspection lab';
COMMENT ON COLUMN quality_inspections.screen_size IS 'Screen size of the coffee beans';
