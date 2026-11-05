#!/bin/bash

API_URL="http://localhost:3001/api/v1"

echo "========================================="
echo "Testing Frontend API Endpoints"
echo "========================================="

# Get bank admin token
echo "1. Authenticating as bank_admin..."
BANK_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')

if [ -z "$BANK_TOKEN" ] || [ "$BANK_TOKEN" = "null" ]; then
  echo "   ✗ Authentication failed"
  exit 1
fi
echo "   ✓ Authenticated"

# Test each endpoint the frontend uses
declare -a ENDPOINTS=(
  "/contracts:Contracts"
  "/banking/lc:Letter of Credits"
  "/swift/messages:SWIFT Messages"
  "/forex:Forex Allocations"
  "/shipments:Shipments"
  "/stats/documentary-collections:Documentary Collections"
  "/stats/advance-payments:Advance Payments"
  "/stats/consignment-payments:Consignment Payments"
)

echo ""
echo "2. Testing API endpoints..."
echo "========================================"

for endpoint_info in "${ENDPOINTS[@]}"; do
  IFS=':' read -r endpoint label <<< "$endpoint_info"
  
  echo ""
  echo "Testing: $label ($endpoint)"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}${endpoint}" \
    -H "Authorization: Bearer $BANK_TOKEN")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    # Check if response has data
    COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null || echo "0")
    SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null || echo "false")
    
    if [ "$SUCCESS" = "true" ] || [ "$COUNT" != "null" ]; then
      echo "   ✓ Status: $HTTP_CODE - Data items: $COUNT"
    else
      echo "   ⚠ Status: $HTTP_CODE - No data field found"
      echo "   Response: $(echo "$BODY" | jq -c '.' 2>/dev/null || echo "$BODY" | head -c 100)"
    fi
  else
    echo "   ✗ Status: $HTTP_CODE"
    echo "   Error: $(echo "$BODY" | jq -r '.error.message // .message // "Unknown error"' 2>/dev/null || echo "$BODY" | head -c 200)"
  fi
done

echo ""
echo "========================================="
echo "3. Testing specific LC endpoint..."
echo "========================================"

# Get LC list
LC_RESPONSE=$(curl -s -X GET "${API_URL}/banking/lc" \
  -H "Authorization: Bearer $BANK_TOKEN")

LC_COUNT=$(echo "$LC_RESPONSE" | jq -r '.data | length' 2>/dev/null || echo "0")
echo "Total LCs found: $LC_COUNT"

if [ "$LC_COUNT" != "0" ] && [ "$LC_COUNT" != "null" ]; then
  echo ""
  echo "Sample LC data:"
  echo "$LC_RESPONSE" | jq '.data[0]' 2>/dev/null | head -20
  
  # Get first LC ID
  FIRST_LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data[0].lcId // .data[0].LCID' 2>/dev/null)
  
  if [ ! -z "$FIRST_LC_ID" ] && [ "$FIRST_LC_ID" != "null" ]; then
    echo ""
    echo "Testing individual LC fetch: $FIRST_LC_ID"
    curl -s -X GET "${API_URL}/banking/lc/${FIRST_LC_ID}" \
      -H "Authorization: Bearer $BANK_TOKEN" | jq '.' | head -30
  fi
fi

echo ""
echo "========================================"
echo "✅ API Endpoint Test Complete"
