#!/bin/bash

echo "=== CHECKING CONTRACTS IN DATABASE ==="
echo ""

echo "1. Most recent contracts:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT 
  contract_id, 
  exporter_id, 
  buyer_id, 
  status,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
FROM contracts 
ORDER BY created_at DESC 
LIMIT 5;
"

echo ""
echo "2. Count by status:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT status, COUNT(*) as count 
FROM contracts 
GROUP BY status;
"

echo ""
echo "3. Count by exporter:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT exporter_id, COUNT(*) as count 
FROM contracts 
GROUP BY exporter_id 
ORDER BY count DESC;
"

echo ""
echo "4. Testing exporter contracts API:"
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"exp001","password":"password123"}' | jq -r '.token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✓ Logged in as exp001"
  
  CONTRACTS=$(curl -s http://localhost:3001/api/v1/exporters/contracts \
    -H "Authorization: Bearer $TOKEN")
  
  COUNT=$(echo "$CONTRACTS" | jq '.count // 0')
  echo "✓ API returned $COUNT contracts"
  
  if [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "First contract:"
    echo "$CONTRACTS" | jq '.data[0]'
  else
    echo "✗ No contracts returned by API"
    echo "Response:"
    echo "$CONTRACTS" | jq .
  fi
else
  echo "✗ Login failed"
fi

echo ""
echo "5. Testing ECTA contracts API:"
TOKEN_ECTA=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.token')

if [ -n "$TOKEN_ECTA" ] && [ "$TOKEN_ECTA" != "null" ]; then
  echo "✓ Logged in as ecta_admin"
  
  ECTA_CONTRACTS=$(curl -s http://localhost:3001/api/v1/contracts \
    -H "Authorization: Bearer $TOKEN_ECTA")
  
  ECTA_COUNT=$(echo "$ECTA_CONTRACTS" | jq '.data | length // 0')
  echo "✓ ECTA API returned $ECTA_COUNT contracts"
else
  echo "✗ ECTA login failed"
fi
