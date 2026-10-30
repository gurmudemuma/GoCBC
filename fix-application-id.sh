#!/bin/bash
# Quick fix script for missing application_id column

echo "🔧 Fixing missing application_id column in exporter_applications table"
echo ""

# Run the migration
cd /home/guda/GoCBC/api

echo "Step 1: Running migration..."
node scripts/run-migration-016.js

echo ""
echo "Step 2: Verifying the fix..."

# Verify using psql
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs << EOF
-- Check if column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'exporter_applications' 
AND column_name = 'application_id';

-- Show sample data
SELECT id, application_id, company_name, email, status 
FROM exporter_applications 
LIMIT 3;
EOF

echo ""
echo "✅ Fix complete! Now test the API endpoint:"
echo ""
echo "   1. Make sure API server is running:"
echo "      cd /home/guda/GoCBC/api && npm start"
echo ""
echo "   2. Test the endpoint (replace TOKEN with your JWT):"
echo "      curl -H 'Authorization: Bearer TOKEN' http://localhost:3001/api/v1/exporters/exporter-applications"
echo ""
echo "   3. Refresh the ECTA Portal in your browser"
echo ""
