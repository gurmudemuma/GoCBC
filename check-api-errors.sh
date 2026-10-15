#!/bin/bash

echo "=== Checking API Status ==="
ps aux | grep -E "node.*api|ts-node" | grep -v grep

echo ""
echo "=== API Log (last 100 lines) ==="
tail -100 /tmp/cecbs-api.log 2>/dev/null || echo "No API log found"

echo ""
echo "=== Testing API endpoints ==="
curl -s http://localhost:3001/health | jq . || echo "Health endpoint failed"

echo ""
echo "=== Testing contracts endpoint ==="
curl -s http://localhost:3001/api/v1/exporters/contracts \
  -H "Authorization: Bearer $(curl -s http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"exp001","password":"password123"}' | jq -r .token)" \
  | jq . || echo "Contracts endpoint failed"

echo ""
echo "=== Database connection test ==="
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT COUNT(*) as contract_count FROM contracts WHERE UPPER(exporter_id) = 'EXP001';" 2>&1

echo ""
echo "=== Check compiled API code ==="
ls -lh /home/guda/GoCBC/api/dist/routes/exporters.js 2>&1 | tail -2
grep -n "UPPER(exporter_id)" /home/guda/GoCBC/api/dist/routes/exporters.js 2>&1 | head -3 || echo "Pattern not found in compiled code"
