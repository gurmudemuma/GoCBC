#!/bin/bash

echo "Testing admin access to contracts..."
echo ""

# Login as admin
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed"
  exit 1
fi

echo "✓ Logged in as admin"
echo "Token: ${TOKEN:0:40}..."
echo ""

# Get contracts
echo "Fetching contracts..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3001/api/v1/contracts \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ API responded with 200"
  
  COUNT=$(echo "$BODY" | jq '.data | length // 0')
  echo "Contracts returned: $COUNT"
  
  if [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "First contract:"
    echo "$BODY" | jq '.data[0]'
  else
    echo ""
    echo "✗ No contracts in response!"
    echo "Full response:"
    echo "$BODY" | jq .
  fi
else
  echo "✗ API error"
  echo "Response:"
  echo "$BODY"
fi

echo ""
echo "Database verification:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts;"
