#!/bin/bash

echo "=== TESTING API ==="
echo ""

# Login as exp001
echo "1. Logging in as exp001..."
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"exp001","password":"password123"}' | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed"
  exit 1
fi

echo "✓ Login successful"
echo "Token: ${TOKEN:0:30}..."
echo ""

# Get contracts
echo "2. Fetching contracts for exp001..."
RESPONSE=$(curl -s http://localhost:3001/api/v1/exporters/contracts \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq '.'
echo ""

COUNT=$(echo "$RESPONSE" | jq '.count // 0')
echo "Result: $COUNT contracts found"

if [ "$COUNT" -eq 0 ]; then
  echo ""
  echo "=== DEBUGGING ==="
  echo "3. Checking database directly..."
  docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
    SELECT contract_id, exporter_id, status 
    FROM contracts 
    WHERE UPPER(exporter_id) = 'EXP001' 
    LIMIT 3;
  "
fi
