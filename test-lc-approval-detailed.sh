#!/bin/bash

set -e

API_URL="http://localhost:3001/api/v1"

echo "========================================="
echo "Detailed LC Approval Test"
echo "========================================="

# Authenticate
echo "1. Authenticating as bank..."
BANK_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"cecbs2024"}')

BANK_TOKEN=$(echo "$BANK_RESPONSE" | jq -r '.data.token')

if [ -z "$BANK_TOKEN" ] || [ "$BANK_TOKEN" = "null" ]; then
  echo "   ✗ Authentication failed"
  echo "$BANK_RESPONSE" | jq '.'
  exit 1
fi

echo "   ✓ Authenticated"

# Create a test LC first
echo ""
echo "2. Creating test LC..."
EXPORTER_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"exporter1","password":"password123"}' | jq -r '.data.token')

LC_DATA='{
  "contractID": "CONT-TEST-'$(date +%s)'",
  "exporterID": "EXP-001",
  "buyerName": "Test Buyer Inc.",
  "amount": 50000,
  "currency": "USD",
  "issuingBank": "Commercial Bank of Ethiopia",
  "advisingBank": "Commercial Bank of Ethiopia",
  "beneficiary": "Test Exporter Ltd.",
  "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
}'

LC_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d "$LC_DATA")

LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // .data.id // .data.lc_id')

if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
  echo "   ✗ LC creation failed"
  echo "$LC_RESPONSE" | jq '.'
  exit 1
fi

echo "   ✓ LC created: $LC_ID"

# Now approve it with timeout monitoring
echo ""
echo "3. Approving LC (monitoring for 60s timeout)..."
echo "   Start time: $(date '+%H:%M:%S')"

# Run approval in background and monitor
(
  curl -v -X POST "${API_URL}/banking/lc/${LC_ID}/approve" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BANK_TOKEN" \
    -d '{"notes": "Approved"}' \
    --max-time 60 \
    2>&1
) > /tmp/lc-approval-output.txt &

CURL_PID=$!

# Monitor progress
for i in {1..60}; do
  if ! kill -0 $CURL_PID 2>/dev/null; then
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "   End time: $(date '+%H:%M:%S')"

# Get result
wait $CURL_PID 2>/dev/null
EXIT_CODE=$?

echo ""
echo "4. Result:"
echo "========================================="

if [ $EXIT_CODE -eq 0 ]; then
  cat /tmp/lc-approval-output.txt | grep -A 1000 "^{" | head -1 | jq '.' 2>/dev/null || cat /tmp/lc-approval-output.txt
  
  # Check success
  if grep -q '"success":true' /tmp/lc-approval-output.txt; then
    echo ""
    echo "✅ LC APPROVAL SUCCESSFUL!"
    exit 0
  else
    echo ""
    echo "❌ LC APPROVAL FAILED"
    exit 1
  fi
else
  echo "Request timed out or failed (exit code: $EXIT_CODE)"
  echo "Last output:"
  tail -20 /tmp/lc-approval-output.txt
  exit 1
fi
