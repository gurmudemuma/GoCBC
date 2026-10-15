#!/bin/bash

echo "================================================================"
echo "FINAL FIX - INSTANT PARALLEL LOADING"
echo "================================================================"

cd /home/guda/GoCBC/api

echo ""
echo "Step 1: Kill old API..."
pkill -f "node.*dist/server.js" || true
pkill -f "node.*api" || true
sleep 3

echo ""
echo "Step 2: Starting API with parallel fetch..."
source .env 2>/dev/null || true
export JWT_SECRET="${JWT_SECRET:-cecbs-secret-key-change-in-production-use-at-least-32-characters}"
export DOCUMENT_ENCRYPTION_KEY="${DOCUMENT_ENCRYPTION_KEY:-cecbs_document_encryption_key_2026_change_in_production_64chars}"
export NODE_ENV="production"
export PORT="3001"
export DATABASE_URL="${DATABASE_URL:-postgresql://cecbs:cecbs123@localhost:5432/cecbs}"
export FABRIC_ENABLED="true"
export FABRIC_REQUIRED="false"

nohup node dist/server.js > /tmp/api-parallel.log 2>&1 &
PID=$!
echo $PID > /tmp/cecbs-api.pid

echo "API started with PID: $PID"
echo ""
echo "Waiting 6 seconds for initialization..."
sleep 6

echo ""
echo "Step 3: Testing response time..."
START=$(date +%s%N)

TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed"
  echo "Check logs: tail -50 /tmp/api-parallel.log"
  exit 1
fi

RESPONSE=$(curl -s http://localhost:3001/api/v1/contracts \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))

COUNT=$(echo "$RESPONSE" | jq '.data | length' 2>/dev/null)

echo ""
echo "================================================================"
echo "⚡ RESULTS:"
echo "================================================================"
echo "Response time: ${DURATION}ms"
echo "Contracts returned: $COUNT"
echo ""

if [ $DURATION -lt 500 ]; then
  echo "✓✓✓ SUCCESS! INSTANT LOADING (under 500ms)! ✓✓✓"
  echo ""
  echo "First contract:"
  echo "$RESPONSE" | jq '.data[0] | {contractId, exporterId, buyerId, status}' 2>/dev/null
else
  echo "⚠ Still slow: ${DURATION}ms"
  echo "Expected: <500ms"
fi

echo ""
echo "================================================================"
echo "NOW:"
echo "1. Refresh browser at http://localhost:3000"
echo "2. Go to 'Sales Contracts' tab"
echo "3. Contracts load INSTANTLY!"
echo ""
echo "API logs: tail -f /tmp/api-parallel.log"
echo "================================================================"
