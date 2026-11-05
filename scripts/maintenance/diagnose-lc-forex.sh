#!/bin/bash

# Diagnostic script to identify LC and Forex API response issues

API_URL="http://localhost:3001/api/v1"

echo "================================================================"
echo "  LC and Forex API Response Diagnostic"
echo "================================================================"
echo ""

# Authenticate
echo "1. Authenticating..."
ECTA_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')

BANK_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')

if [ -z "$ECTA_TOKEN" ] || [ "$ECTA_TOKEN" = "null" ]; then
  echo "❌ Authentication failed"
  exit 1
fi

echo "✓ Authentication successful"
echo ""

# First, create a contract
echo "2. Creating Test Contract..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CONTRACT_ID="CONT-DIAG-$(date +%s)"
CONTRACT_DATA="{
  \"contractID\": \"$CONTRACT_ID\",
  \"exporterID\": \"EXP-TEST-001\",
  \"buyerID\": \"BUYER-001\",
  \"buyerName\": \"Test Buyer\",
  \"buyerCountry\": \"USA\",
  \"buyerBank\": \"Bank of America\",
  \"exporterBank\": \"Commercial Bank of Ethiopia\",
  \"coffeeType\": \"Arabica\",
  \"quantity\": 100,
  \"pricePerKg\": 10,
  \"currency\": \"USD\",
  \"paymentMethod\": \"LC\",
  \"eudrRequired\": true,
  \"deliveryTerms\": \"FOB\",
  \"expectedShipDate\": \"$(date -d '+30 days' +%Y-%m-%d)\"
}"

echo "Creating contract: $CONTRACT_ID"
CONTRACT_RESPONSE=$(curl -s -X POST "${API_URL}/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$CONTRACT_DATA")

echo "Contract Response:"
echo "$CONTRACT_RESPONSE" | jq '.'
echo ""

# Test LC Request
echo "3. Testing LC Request..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LC_NUMBER="LC-DIAG-$(date +%s)"
LC_DATA="{
  \"lcID\": \"$LC_NUMBER\",
  \"contractID\": \"$CONTRACT_ID\",
  \"exporterID\": \"EXP-TEST-001\",
  \"bankName\": \"Commercial Bank of Ethiopia\",
  \"amount\": 1000,
  \"currency\": \"USD\",
  \"expiryDate\": \"$(date -d '+90 days' +%Y-%m-%d)\"
}"

echo "Request:"
echo "$LC_DATA" | jq '.'
echo ""

LC_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc/request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$LC_DATA")

echo "Response:"
echo "$LC_RESPONSE" | jq '.'
echo ""

# Extract LC ID with all possible variations
LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // .data.lcId // .data.id // .data.lc_id // empty')
echo "Extracted LC ID: '$LC_ID'"
echo ""

if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
  echo "❌ ISSUE: Cannot extract LC ID from response"
  echo "   Expected fields: .data.lcID or .data.lcId"
  echo "   Actual structure: $(echo $LC_RESPONSE | jq -r '.data | keys')"
else
  echo "✓ LC ID extracted successfully: $LC_ID"
  
  # Test LC Approval
  echo ""
  echo "4. Testing LC Approval..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  APPROVE_DATA='{"notes": "Diagnostic test approval"}'
  echo "Request:"
  echo "$APPROVE_DATA" | jq '.'
  echo ""
  
  APPROVE_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc/${LC_ID}/approve" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BANK_TOKEN" \
    -d "$APPROVE_DATA")
  
  echo "Response:"
  echo "$APPROVE_RESPONSE" | jq '.'
  echo ""
  
  SUCCESS=$(echo "$APPROVE_RESPONSE" | jq -r '.success // false')
  echo "Success field: $SUCCESS"
  
  if [ "$SUCCESS" = "true" ]; then
    echo "✓ LC approval successful"
  else
    echo "❌ ISSUE: LC approval did not return success:true"
    echo "   Expected: .success = true"
    echo "   Actual: .success = $SUCCESS"
  fi
fi

echo ""
echo "5. Testing Forex Request..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FOREX_NUMBER="FOREX-DIAG-$(date +%s)"
FOREX_DATA="{
  \"forexID\": \"$FOREX_NUMBER\",
  \"contractID\": \"$CONTRACT_ID\",
  \"exporterID\": \"EXP-TEST-001\",
  \"lcNumber\": \"$LC_ID\",
  \"amount\": 1000,
  \"currency\": \"USD\",
  \"status\": \"pending\"
}"

echo "Request:"
echo "$FOREX_DATA" | jq '.'
echo ""

FOREX_RESPONSE=$(curl -s -X POST "${API_URL}/forex" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d "$FOREX_DATA")

echo "Response:"
echo "$FOREX_RESPONSE" | jq '.'
echo ""

# Extract Forex ID with all possible variations
FOREX_ID=$(echo "$FOREX_RESPONSE" | jq -r '.data.forexID // .data.forexId // .data.id // .data.forex_id // empty')
echo "Extracted Forex ID: '$FOREX_ID'"
echo ""

if [ -z "$FOREX_ID" ] || [ "$FOREX_ID" = "null" ]; then
  echo "❌ ISSUE: Cannot extract Forex ID from response"
  echo "   Expected fields: .data.forexID or .data.forexId"
  echo "   Actual structure: $(echo $FOREX_RESPONSE | jq -r '.data | keys')"
else
  echo "✓ Forex ID extracted successfully: $FOREX_ID"
fi

echo ""
echo "================================================================"
echo "  Diagnostic Summary"
echo "================================================================"
echo ""
echo "Issues Found:"
echo ""

# Check LC issues
if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
  echo "1. ❌ LC Request Response:"
  echo "   - Field name mismatch in response"
  echo "   - Need to verify API returns: .data.lcID"
  echo ""
fi

if [ "$SUCCESS" != "true" ]; then
  echo "2. ❌ LC Approval Response:"
  echo "   - Does not return {success: true}"
  echo "   - Need to fix response format"
  echo ""
fi

if [ -z "$FOREX_ID" ] || [ "$FOREX_ID" = "null" ]; then
  echo "3. ❌ Forex Request Response:"
  echo "   - Field name mismatch in response"
  echo "   - Need to verify API returns: .data.forexID"
  echo ""
fi

echo "Check the API route handlers:"
echo "  - /home/guda/GoCBC/api/src/routes/banking.ts (LC routes)"
echo "  - /home/guda/GoCBC/api/src/routes/forex.ts (Forex routes)"
echo ""
