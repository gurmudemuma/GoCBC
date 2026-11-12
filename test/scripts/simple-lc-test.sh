#!/bin/bash

API_URL="http://localhost:3001/api/v1"

echo "========================================="
echo "Simple LC Approval Test"
echo "========================================="

# Clear API logs
docker logs cecbs-api --tail=0 -f > /tmp/api-logs.txt 2>&1 &
LOGS_PID=$!

sleep 1

# Get bank token
echo "1. Getting bank token..."
BANK_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"cecbs2024"}' | jq -r '.data.token')

echo "   Token: ${BANK_TOKEN:0:30}..."

# Use the most recent LC ID from previous test
LC_ID="LC-1793288783"

echo ""
echo "2. Approving LC: $LC_ID"
echo "   Waiting for response (max 120s)..."

START_TIME=$(date +%s)

# Call approval endpoint
RESPONSE=$(timeout 120 curl -s -X POST "${API_URL}/banking/lc/${LC_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{"notes": "LC approved by issuing bank"}')

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "3. Response received after ${ELAPSED}s:"
echo "========================================="
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "4. API Logs (last 50 lines):"
echo "========================================="
kill $LOGS_PID 2>/dev/null
docker logs cecbs-api --tail=50 2>&1 | grep -E "LC APPROVE|ApproveLC|Endorsement|Error|Failed" || echo "No relevant logs found"

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo ""
  echo "✅ LC APPROVAL SUCCESSFUL!"
else
  echo ""
  echo "❌ LC APPROVAL FAILED"
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // "Unknown error"')
  echo "   Error: $ERROR_MSG"
fi
