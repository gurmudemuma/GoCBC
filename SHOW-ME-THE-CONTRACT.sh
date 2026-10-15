#!/bin/bash

echo "========================================"
echo "FINDING THE REGISTERED CONTRACT"
echo "========================================"
echo ""

echo "1. Most recent contract in database:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT 
  contract_id,
  exporter_id,
  buyer_id,
  status,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
FROM contracts
ORDER BY created_at DESC
LIMIT 1;
" 2>&1 | head -20

echo ""
echo "2. Count of contracts by status:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT status, COUNT(*) as count
FROM contracts
GROUP BY status;
" 2>&1 | head -20

echo ""
echo "3. Testing ECTA API (GET /contracts):"
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.token // empty' 2>/dev/null)

if [ -n "$TOKEN" ]; then
  echo "✓ Logged in as ecta_admin"
  
  CONTRACTS=$(curl -s http://localhost:3001/api/v1/contracts \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  
  COUNT=$(echo "$CONTRACTS" | jq '.data | length // 0' 2>/dev/null)
  echo "✓ API returned $COUNT contracts"
  
  if [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "Most recent contract from API:"
    echo "$CONTRACTS" | jq '.data[0]' 2>/dev/null
  fi
else
  echo "✗ Login failed"
fi

echo ""
echo "4. Testing Exporter API (GET /exporters/contracts):"
TOKEN_EXP=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"exp001","password":"password123"}' | jq -r '.token // empty' 2>/dev/null)

if [ -n "$TOKEN_EXP" ]; then
  echo "✓ Logged in as exp001"
  
  EXP_CONTRACTS=$(curl -s http://localhost:3001/api/v1/exporters/contracts \
    -H "Authorization: Bearer $TOKEN_EXP" 2>/dev/null)
  
  EXP_COUNT=$(echo "$EXP_CONTRACTS" | jq '.count // 0' 2>/dev/null)
  echo "✓ Exporter API returned $EXP_COUNT contracts"
  
  if [ "$EXP_COUNT" -gt 0 ]; then
    echo ""
    echo "Sample exporter contract:"
    echo "$EXP_CONTRACTS" | jq '.data[0] | {contractId, status, exporterId, buyerId}' 2>/dev/null
  fi
fi

echo ""
echo "========================================"
