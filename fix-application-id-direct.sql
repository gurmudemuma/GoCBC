-- Direct SQL fix for missing application_id column
-- Run with: PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -f fix-application-id-direct.sql

\echo '🔧 Adding missing application_id column to exporter_applications table...'
\echo ''

-- Add application_id column
ALTER TABLE exporter_applications 
ADD COLUMN IF NOT EXISTS application_id VARCHAR(100);

-- Generate application_id for existing rows
UPDATE exporter_applications 
SET application_id = 'APP-' || LPAD(id::TEXT, 8, '0')
WHERE application_id IS NULL;

-- Add unique constraint
ALTER TABLE exporter_applications 
ADD CONSTRAINT exporter_applications_application_id_unique 
UNIQUE (application_id);

-- Make it NOT NULL
ALTER TABLE exporter_applications 
ALTER COLUMN application_id SET NOT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_exporter_applications_application_id 
ON exporter_applications(application_id);

\echo '✅ Migration complete!'
\echo ''
\echo 'Verifying the fix...'
\echo ''

-- Verify
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'exporter_applications' 
AND column_name = 'application_id';

\echo ''
\echo 'Sample data:'
\echo ''

SELECT id, application_id, company_name, email, status, submitted_date
FROM exporter_applications 
ORDER BY id
LIMIT 5;

\echo ''
\echo '✅ Fix verified! The application_id column has been added.'
\echo ''
