-- Add temporary credentials columns to exporter_applications table
-- Allows applicants to login and track their application status

ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS temp_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS temp_credentials_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS license_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS license_issued_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS license_expiry_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS digital_signature TEXT,
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(16);

-- Create index for faster credential lookups
CREATE INDEX IF NOT EXISTS idx_exporter_applications_temp_username 
ON exporter_applications(temp_username);

-- Create index for license number lookups
CREATE INDEX IF NOT EXISTS idx_exporter_applications_license_number 
ON exporter_applications(license_number);

COMMENT ON COLUMN exporter_applications.temp_username IS 'Temporary username for applicant to track application';
COMMENT ON COLUMN exporter_applications.temp_password IS 'Hashed temporary password';
COMMENT ON COLUMN exporter_applications.temp_credentials_sent IS 'Whether temporary credentials were sent to applicant';
COMMENT ON COLUMN exporter_applications.account_created IS 'Whether full exporter account was created upon approval';
COMMENT ON COLUMN exporter_applications.license_number IS 'Generated ECTA license number upon approval';
COMMENT ON COLUMN exporter_applications.license_issued_date IS 'Date when license was issued';
COMMENT ON COLUMN exporter_applications.license_expiry_date IS 'License expiry date';
COMMENT ON COLUMN exporter_applications.digital_signature IS 'Digital signature of the license document';
COMMENT ON COLUMN exporter_applications.verification_code IS 'Verification code for license authenticity';
