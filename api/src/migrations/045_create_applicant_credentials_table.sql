-- Migration: Create applicant_credentials table for temporary login access
-- This allows applicants to track their application status before approval

CREATE TABLE IF NOT EXISTS applicant_credentials (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES exporter_applications(id) ON DELETE CASCADE,
    temp_username VARCHAR(100) UNIQUE NOT NULL,
    temp_password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(application_id)
);

CREATE INDEX IF NOT EXISTS idx_applicant_credentials_username 
    ON applicant_credentials(temp_username);

CREATE INDEX IF NOT EXISTS idx_applicant_credentials_application 
    ON applicant_credentials(application_id);

-- Also add temp_username and temp_password columns to exporter_applications
-- for backward compatibility if needed
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS temp_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS temp_credentials_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_exporter_applications_temp_username 
    ON exporter_applications(temp_username);

COMMENT ON TABLE applicant_credentials IS 'Stores temporary login credentials for applicants to track application status';
COMMENT ON COLUMN applicant_credentials.temp_username IS 'Temporary username format: applicant_XXXXX';
COMMENT ON COLUMN applicant_credentials.expires_at IS 'Credentials expire after approval or 90 days';
