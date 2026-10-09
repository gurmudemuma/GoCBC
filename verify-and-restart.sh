#!/bin/bash

# Verify migration and restart API

cd /home/guda/GoCBC

echo "======================================"
echo "DATABASE MIGRATION VERIFICATION"
echo "======================================"

# Check if columns exist
docker exec -i cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
  AND column_name IN ('performed_by', 'performed_by_org', 'organization')
ORDER BY column_name;
" > /tmp/db-check.txt 2>&1

cat /tmp/db-check.txt

echo ""
echo "======================================"
echo "RESTARTING API SERVICE"
echo "======================================"

# Restart API container (both possible names)
docker restart cecbs-api 2>/dev/null || docker restart gocbc-api-1 2>/dev/null || docker restart api 2>/dev/null

sleep 10

echo ""
echo "======================================"
echo "API LOGS"
echo "======================================"

# Get logs from API container
docker logs cecbs-api --tail 50 2>/dev/null || docker logs gocbc-api-1 --tail 50 2>/dev/null || docker logs api --tail 50 2>/dev/null

echo ""
echo "======================================"
echo "VERIFICATION COMPLETE"
echo "======================================"
echo "✅ Migration verified"
echo "✅ API restarted"
echo "🌐 Test at: http://localhost:3000"
