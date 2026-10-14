-- Add missing columns for approval workflow
-- The code expects these columns but they don't exist in the current schema

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS exporter_id VARCHAR(100);

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS laboratory_certificate_number VARCHAR(100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exporter_applications_approved_at 
ON exporter_applications(approved_at);

CREATE INDEX IF NOT EXISTS idx_exporter_applications_exporter_id 
ON exporter_applications(exporter_id);
