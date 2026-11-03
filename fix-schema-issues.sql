-- Fix schema issues for E2E workflow test
-- Run with: psql -U postgres -d cecbs -f fix-schema-issues.sql

\echo '=== Fixing Database Schema Issues ==='
\echo ''

-- 1. Fix audit_trail columns to handle NULL values properly
\echo '1. Fixing audit_trail columns...'
ALTER TABLE audit_trail ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE audit_trail ALTER COLUMN new_value TYPE TEXT;
-- Convert metadata to JSONB if it's not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_trail' 
        AND column_name = 'metadata' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE audit_trail ALTER COLUMN metadata TYPE JSONB USING metadata::jsonb;
    END IF;
END $$;

-- 2. Add missing columns to customs_declarations
\echo '2. Adding missing customs_declarations columns...'
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS exporter_name VARCHAR(200);

-- 3. Add missing columns to payments table
\echo '3. Adding missing payments columns...'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS release_date TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS released_by VARCHAR(200);

-- 4. Verify the changes
\echo ''
\echo '=== Verification ==='
\echo ''
\echo 'Customs declarations columns:'
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'customs_declarations' 
AND column_name IN ('exporter_name', 'exporter_id', 'shipment_id')
ORDER BY column_name;

\echo ''
\echo 'Payments columns:'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('payment_id', 'release_date', 'released_by', 'status')
ORDER BY column_name;

\echo ''
\echo 'Audit trail columns:'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
AND column_name IN ('old_value', 'new_value', 'metadata')
ORDER BY column_name;

\echo ''
\echo '=== Schema fixes completed successfully ==='
