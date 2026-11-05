#!/bin/bash

API_URL="http://localhost:3001/api/v1"
LC_ID="LC-1793291045"  # From the previous test

echo "Testing Forex Allocation for LC: $LC_ID"
echo "========================================"

# Get NBE token
echo "1. Authenticating as NBE..."
NBE_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')

if [ -z "$NBE_TOKEN" ] || [ "$NBE_TOKEN" = "null" ]; then
  echo "   ✗ NBE authentication failed"
  exit 1
fi
echo "   ✓ NBE authenticated"

# Check if LC exists
echo ""
echo "2. Checking if LC exists..."
LC_CHECK=$(curl -s -X GET "${API_URL}/banking/lc/${LC_ID}" \
  -H "Authorization: Bearer $NBE_TOKEN")

echo "$LC_CHECK" | jq '.'

if echo "$LC_CHECK" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "   ✓ LC found"
  LC_STATUS=$(echo "$LC_CHECK" | jq -r '.data.Status // .data.status')
  echo "   LC Status: $LC_STATUS"
else
  echo "   ✗ LC not found or error"
  exit 1
fi

# Create forex allocation
echo ""
echo "3. Creating forex allocation..."
FOREX_ID="FOREX-$(date +%s)"
FOREX_DATA='{
  "forexID": "'$FOREX_ID'",
  "contractID": "CONT-1793291581",
  "exporterID": "EXP-TEST-1793291571",
  "lcNumber": "'$LC_ID'",
  "amount": 4250,
  "currency": "USD",
  "status": "pending"
}'

FOREX_RESPONSE=$(curl -s -X POST "${API_URL}/forex" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -d "$FOREX_DATA")

echo "$FOREX_RESPONSE" | jq '.'

if echo "$FOREX_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "   ✓ Forex allocation created: $FOREX_ID"
else
  echo "   ✗ Forex creation failed"
fi

# Allocate forex to LC
echo ""
echo "4. Allocating forex to LC..."
ALLOCATE_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc/${LC_ID}/allocate-forex" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -d '{"forexAllocationId": "'$FOREX_ID'", "exchangeRate": 57.5, "allocatedAmount": 4250}')

echo "$ALLOCATE_RESPONSE" | jq '.'

if echo "$ALLOCATE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo ""
  echo "✅ FOREX ALLOCATED TO LC SUCCESSFULLY!"
else
  echo ""
  echo "❌ FOREX ALLOCATION FAILED"
  ERROR=$(echo "$ALLOCATE_RESPONSE" | jq -r '.error.message')
  echo "Error: $ERROR"
fi
