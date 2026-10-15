#!/bin/bash

echo "================================================================"
echo "RESTARTING API WITH CONTRACT FIX"
echo "================================================================"
echo ""

cd /home/guda/GoCBC/api

echo "Step 1: Building API with latest changes..."
npm run build
echo "✓ Build complete"
echo ""

echo "Step 2: Stopping old API..."
pkill -f "node.*dist/server.js" || true
pkill -f "node.*api" || true
sleep 3
echo "✓ Old processes stopped"
echo ""

echo "Step 3: Starting API..."
cd /home/guda/GoCBC
source api/.env 2>/dev/null || true

# Ensure required vars are set
export JWT_SECRET="${JWT_SECRET:-cecbs-secret-key-change-in-production-use-at-least-32-characters}"
export DOCUMENT_ENCRYPTION_KEY="${DOCUMENT_ENCRYPTION_KEY:-cecbs_document_encryption_key_2026_change_in_production_64chars}"
export NODE_ENV="${NODE_ENV:-production}"
export DATABASE_URL="${DATABASE_URL:-postgresql://cecbs:cecbs123@localhost:5432/cecbs}"

cd api
nohup node dist/server.js > /tmp/api-final.log 2>&1 &
API_PID=$!
echo $API_PID > /tmp/cecbs-api.pid
echo "✓ API started with PID: $API_PID"
echo ""

echo "Step 4: Waiting for API to initialize..."
sleep 6

echo "Step 5: Testing..."
curl -s http://localhost:3001/health | jq .
echo ""

echo "Step 6: Testing contracts endpoint..."
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✓ Logged in successfully"
  
  CONTRACTS=$(curl -s http://localhost:3001/api/v1/contracts \
    -H "Authorization: Bearer $TOKEN")
  
  COUNT=$(echo "$CONTRACTS" | jq '.data | length')
  echo "✓ API returned $COUNT contracts"
  
  if [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "================================================================"
    echo "✓✓✓ SUCCESS! CONTRACTS ARE NOW VISIBLE! ✓✓✓"
    echo "================================================================"
    echo ""
    echo "Now:"
    echo "1. Go to browser: http://localhost:3000"
    echo "2. You're already logged in as admin"
    echo "3. Go to 'Sales Contracts (0)' tab"
    echo "4. Click 'ALL CONTRACTS' card"
    echo "5. You should see $COUNT contracts!"
    echo ""
    echo "First contract:"
    echo "$CONTRACTS" | jq '.data[0] | {contractId, exporterId, buyerId, status, contractStatus}'
  else
    echo "✗ Still no contracts"
    echo "Response:"
    echo "$CONTRACTS" | jq .
  fi
else
  echo "✗ Login failed"
fi

echo ""
echo "API logs: tail -f /tmp/api-final.log"
echo "================================================================"
