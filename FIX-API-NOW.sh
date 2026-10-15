#!/bin/bash

echo "================================================================"
echo "FIXING API - Rebuilding and Restarting"
echo "================================================================"

cd /home/guda/GoCBC

# Step 1: Kill all existing API processes
echo ""
echo "Step 1: Stopping all API processes..."
pkill -f "node.*api" || true
pkill -f "ts-node" || true
sleep 2

# Step 2: Rebuild API with latest code
echo ""
echo "Step 2: Rebuilding API..."
cd api
npm run build 2>&1 | tail -20
cd ..

# Step 3: Start API in production mode
echo ""
echo "Step 3: Starting API..."
bash start-api.sh

sleep 3

# Step 4: Check if API is running
echo ""
echo "Step 4: Checking API status..."
ps aux | grep -E "node.*api" | grep -v grep

# Step 5: Test health endpoint
echo ""
echo "Step 5: Testing health endpoint..."
curl -s http://localhost:3001/health | jq . || echo "Health check failed"

# Step 6: Test database direct
echo ""
echo "Step 6: Testing database (10 contracts for exp001)..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT contract_id, exporter_id, buyer_id, status FROM contracts WHERE UPPER(exporter_id) = 'EXP001' LIMIT 5;"

# Step 7: Get login token
echo ""
echo "Step 7: Logging in as exp001..."
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"exp001","password":"password123"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✓ Login successful, got token: ${TOKEN:0:30}..."
  
  # Step 8: Test contracts endpoint
  echo ""
  echo "Step 8: Testing contracts endpoint..."
  curl -s http://localhost:3001/api/v1/exporters/contracts \
    -H "Authorization: Bearer $TOKEN" | jq .
else
  echo "✗ Login failed"
fi

echo ""
echo "================================================================"
echo "DONE - Check output above for errors"
echo "================================================================"
