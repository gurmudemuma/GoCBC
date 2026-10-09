#!/bin/bash

echo "Testing document retrieval for contract..."
echo ""

# Get the most recent contract ID
CONTRACT_ID=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT contract_id FROM contracts ORDER BY created_at DESC LIMIT 1;" | tr -d ' ')

echo "Most recent contract: $CONTRACT_ID"
echo ""

# Check if any documents exist for this contract
echo "Documents in database for this contract:"
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "
SELECT 
  document_id, 
  contract_id, 
  document_type, 
  file_name,
  uploaded_by,
  TO_CHAR(COALESCE(uploaded_at, upload_date), 'YYYY-MM-DD HH24:MI:SS') as uploaded
FROM documents 
WHERE contract_id = '$CONTRACT_ID'
ORDER BY COALESCE(uploaded_at, upload_date) DESC;
"

echo ""
echo "Testing API endpoint..."

# Login
TOKEN=$(curl -s http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "✗ Login failed"
  exit 1
fi

echo "✓ Logged in"
echo ""

# Get documents via API
echo "Fetching documents via API for contract: $CONTRACT_ID"
RESPONSE=$(curl -s http://localhost:3001/api/v1/contracts/${CONTRACT_ID}/documents \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq .

COUNT=$(echo "$RESPONSE" | jq '.documents | length // 0')

echo ""
if [ "$COUNT" -gt 0 ]; then
  echo "✓✓✓ SUCCESS! Found $COUNT document(s)"
else
  echo "✗ No documents returned by API"
  echo ""
  echo "Check API logs:"
  tail -30 /tmp/api-console-final.log 2>/dev/null || echo "No log file"
fi
