#!/bin/bash

# Quick test for forex allocation with all required parameters

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo "Testing Forex Allocation with Required Parameters"
echo "=================================================="
echo ""

# Use existing LC
LC_ID="LC-1793296548"
FOREX_ID="FOREX-$(date +%s)"

echo "LC ID: $LC_ID"
echo "Forex ID: $FOREX_ID"
echo ""

# Step 1: Create forex request
echo "Step 1: Creating forex request..."
REQUEST_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"forexId\": \"$FOREX_ID\",
        \"contractId\": \"CONT-1793296520\",
        \"exporterId\": \"EXP-TEST-1793296510\",
        \"amount\": 4250,
        \"currency\": \"USD\"
    }" \
    "$API_URL/forex/request")

echo "$REQUEST_RESPONSE" | jq '.'
REQUEST_SUCCESS=$(echo "$REQUEST_RESPONSE" | jq -r '.success // false')

if [ "$REQUEST_SUCCESS" = "true" ]; then
    echo "✅ Forex request created"
else
    echo "❌ Failed to create forex request"
    exit 1
fi

echo ""
echo "Waiting 5 seconds for blockchain propagation..."
sleep 5
echo ""

# Step 2: Allocate forex with ALL required parameters
echo "Step 2: Allocating forex with required parameters..."
ALLOCATE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"forexId\": \"$FOREX_ID\",
        \"lcId\": \"$LC_ID\",
        \"amount\": 4250,
        \"exchangeRate\": 57.5,
        \"retentionRate\": 0.4,
        \"officer\": \"Bank Officer - Test\",
        \"approvalRef\": \"NBE-FOREX-$(date +%s)\",
        \"expiryDate\": \"2027-12-31\"
    }" \
    "$API_URL/forex/allocate")

echo "$ALLOCATE_RESPONSE" | jq '.'
ALLOCATE_SUCCESS=$(echo "$ALLOCATE_RESPONSE" | jq -r '.success // false')

if [ "$ALLOCATE_SUCCESS" = "true" ]; then
    echo ""
    echo "✅ Forex allocated successfully!"
else
    ERROR_MSG=$(echo "$ALLOCATE_RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
    echo ""
    echo "❌ Forex allocation failed: $ERROR_MSG"
    exit 1
fi

echo ""
echo "Done!"
