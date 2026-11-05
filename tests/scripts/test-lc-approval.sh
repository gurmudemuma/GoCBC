#!/bin/bash

# Test LC Approval Directly
API_URL="http://localhost:3001/api/v1"

echo "=== Testing LC Approval ==="

# Get bank token
echo "Getting bank token..."
BANK_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"cecbs2024"}' | jq -r '.data.token')

if [ -z "$BANK_TOKEN" ] || [ "$BANK_TOKEN" = "null" ]; then
  echo "❌ Failed to get bank token"
  exit 1
fi

echo "✓ Bank token obtained: ${BANK_TOKEN:0:50}..."

# Use an existing LC ID from the logs or create a new one
LC_ID="LC-1793279154"

echo ""
echo "Approving LC: $LC_ID"

# Call the approve endpoint with verbose output
APPROVE_RESPONSE=$(curl -v -X POST "${API_URL}/banking/lc/${LC_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{"notes": "LC approved by issuing bank"}' 2>&1)

echo ""
echo "=== Response ==="
echo "$APPROVE_RESPONSE"

# Extract just the JSON response
JSON_RESPONSE=$(echo "$APPROVE_RESPONSE" | grep -A 1000 '^{' | head -1)

if echo "$JSON_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo ""
  echo "✅ LC APPROVED SUCCESSFULLY"
  echo "$JSON_RESPONSE" | jq '.'
else
  echo ""
  echo "❌ LC APPROVAL FAILED"
  echo "$JSON_RESPONSE" | jq '.' 2>/dev/null || echo "$JSON_RESPONSE"
fi
