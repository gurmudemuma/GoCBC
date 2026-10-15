#!/bin/bash

echo "Quick restart with instant contracts fix..."
cd /home/guda/GoCBC/api

echo "Building..."
npm run build 2>&1 | tail -5

echo "Stopping old API..."
pkill -f "node.*dist/server.js"
sleep 2

echo "Starting..."
cd /home/guda/GoCBC
source api/.env 2>/dev/null || true
export JWT_SECRET="${JWT_SECRET:-cecbs-secret-key-change-in-production-use-at-least-32-characters}"
export DOCUMENT_ENCRYPTION_KEY="${DOCUMENT_ENCRYPTION_KEY:-cecbs_document_encryption_key_2026_change_in_production_64chars}"
export NODE_ENV="production"
export DATABASE_URL="${DATABASE_URL:-postgresql://cecbs:cecbs123@localhost:5432/cecbs}"

cd api
nohup node dist/server.js > /tmp/api-instant.log 2>&1 &
echo $! > /tmp/cecbs-api.pid
echo "API PID: $(cat /tmp/cecbs-api.pid)"

sleep 5

echo ""
echo "Testing speed..."
TIME_START=$(date +%s%3N)
curl -s http://localhost:3001/api/v1/contracts \
  -H "Authorization: Bearer $(curl -s http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.token')" \
  | jq '{count: (.data | length), first_contract: .data[0].contractId}' 2>/dev/null
TIME_END=$(date +%s%3N)
DURATION=$((TIME_END - TIME_START))

echo ""
echo "⚡ Response time: ${DURATION}ms"
echo ""
if [ $DURATION -lt 1000 ]; then
  echo "✓✓✓ SUCCESS! Contracts load instantly (under 1 second)!"
else
  echo "⚠ Still slow (over 1 second)"
fi
echo ""
echo "Refresh your browser - contracts should appear INSTANTLY now!"
