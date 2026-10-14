-- Add missing columns to exporter_applications table for approval workflow
-- These columns are needed for the approval process

-- Add account_created flag
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS account_created BOOLEAN DEFAULT false;

-- Add license fields
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS ecta_license_number VARCHAR(100);

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS license_issued_date TIMESTAMP;

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS license_expiry_date TIMESTAMP;

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS digital_signature TEXT;

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exporter_applications_account_created 
ON exporter_applications(account_created);

CREATE INDEX IF NOT EXISTS idx_exporter_applications_license_number 
ON exporter_applications(license_number);
