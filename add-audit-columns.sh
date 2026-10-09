#!/bin/bash
echo "Adding performed_by columns to audit_trail table..."

# Try to connect to PostgreSQL and add columns
PGPASSWORD="${POSTGRES_PASSWORD:-cecbs2024!secure}" psql -h localhost -U "${POSTGRES_USER:-cecbs_user}" -d "${POSTGRES_DB:-cecbs_db}" <<'SQL'
-- Add columns if they don't exist
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by_org ON audit_trail(performed_by_org);

-- Verify columns were added
\d audit_trail

-- Show sample data
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
AND column_name IN ('performed_by', 'performed_by_org', 'organization');
SQL

echo ""
echo "Done! Restarting API..."
cd /home/guda/GoCBC && ./restart-api.sh
