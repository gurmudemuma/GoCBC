#!/bin/bash
# Critical Path Test - Essential workflow verification

API="http://localhost:3001/api/v1"

echo "============================================"
echo "CRITICAL PATH TEST"
echo "============================================"
echo ""

# Test 1: Login
echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   ✓ Login successful"
  echo "   Token: ${TOKEN:0:30}..."
else
  echo "   ✗ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

# Test 2: Create Contract
echo ""
echo "2. Testing Contract Creation..."
TIMESTAMP=$(date +%s)
CONTRACT_RESPONSE=$(curl -s -X POST "$API/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"contractNumber\": \"TEST-$TIMESTAMP\",
    \"buyerName\": \"Test Buyer Ltd\",
    \"buyerCountry\": \"Germany\",
    \"quantity\": 100,
    \"unit\": \"tons\",
    \"pricePerUnit\": 3500,
    \"currency\": \"USD\",
    \"totalValue\": 350000,
    \"coffeeType\": \"Arabica\",
    \"quality\": \"Grade 1\",
    \"deliveryTerms\": \"FOB\",
    \"paymentTerms\": \"LC at sight\",
    \"shipmentDeadline\": \"2026-12-31T00:00:00Z\"
  }")

echo "$CONTRACT_RESPONSE" > /tmp/contract-response.json

if echo "$CONTRACT_RESPONSE" | grep -q '"success":true\|contractId\|TEST-'; then
  CONTRACT_ID=$(echo "$CONTRACT_RESPONSE" | grep -o '"contractId":"[^"]*' | cut -d'"' -f4 || echo "")
  if [ -z "$CONTRACT_ID" ]; then
    CONTRACT_ID=$(echo "$CONTRACT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
  fi
  echo "   ✓ Contract created: $CONTRACT_ID"
else
  echo "   ⚠ Contract creation response unclear"
  echo "   Response saved to /tmp/contract-response.json"
fi

# Test 3: Create LC
echo ""
echo "3. Testing LC Creation..."
if [ -n "$CONTRACT_ID" ]; then
  LC_RESPONSE=$(curl -s -X POST "$API/lcs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"contractId\": \"$CONTRACT_ID\",
      \"amount\": 350000,
      \"currency\": \"USD\",
      \"beneficiary\": \"Test Exporter\",
      \"issuingBank\": \"Commercial Bank of Ethiopia\",
      \"advisingBank\": \"Deutsche Bank\",
      \"expiryDate\": \"2026-12-31T00:00:00Z\",
      \"latestShipmentDate\": \"2026-12-15T00:00:00Z\",
      \"termsAndConditions\": \"Standard terms\"
    }")
  
  echo "$LC_RESPONSE" > /tmp/lc-response.json
  
  if echo "$LC_RESPONSE" | grep -q '"success":true\|lcId\|lcNumber'; then
    LC_ID=$(echo "$LC_RESPONSE" | grep -o '"lcId":"[^"]*' | cut -d'"' -f4 || echo "")
    echo "   ✓ LC created: $LC_ID"
  else
    echo "   ⚠ LC creation response unclear"
    echo "   Response saved to /tmp/lc-response.json"
  fi
else
  echo "   ⚠ Skipped (no contract ID)"
fi

# Test 4: Database verification
echo ""
echo "4. Testing Database..."
DB_USERS=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM users;" 2>&1)
DB_CONTRACTS=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts;" 2>&1 || echo "0")

if echo "$DB_USERS" | grep -q "[0-9]"; then
  USER_COUNT=$(echo "$DB_USERS" | tr -d ' ')
  echo "   ✓ Database accessible"
  echo "   Users in DB: $USER_COUNT"
  echo "   Contracts in DB: $DB_CONTRACTS"
else
  echo "   ⚠ Database query issues"
fi

# Test 5: Blockchain check
echo ""
echo "5. Testing Blockchain..."
CHAINCODE_RUNNING=$(docker ps | grep -c "coffee-chaincode" || echo "0")
PEER_COUNT=$(docker ps --filter "name=peer" --filter "status=running" | grep -c "peer" || echo "0")

if [ "$CHAINCODE_RUNNING" -gt 0 ]; then
  echo "   ✓ Chaincode container running"
else
  echo "   ✗ Chaincode NOT running"
fi

if [ "$PEER_COUNT" -ge 6 ]; then
  echo "   ✓ All blockchain peers running ($PEER_COUNT/6)"
else
  echo "   ⚠ Only $PEER_COUNT peers running (expected 6)"
fi

# Test 6: UI Check
echo ""
echo "6. Testing UI..."
UI_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000)
UI_CODE=$(echo "$UI_RESPONSE" | tail -n1)

if [ "$UI_CODE" = "200" ]; then
  echo "   ✓ UI accessible on port 3000"
else
  echo "   ✗ UI not accessible (HTTP $UI_CODE)"
fi

# Summary
echo ""
echo "============================================"
echo "CRITICAL PATH TEST COMPLETE"
echo "============================================"
echo ""
echo "Test Data Generated:"
[ -n "$CONTRACT_ID" ] && echo "  Contract ID: $CONTRACT_ID"
[ -n "$LC_ID" ] && echo "  LC ID: $LC_ID"
echo ""
echo "Check detailed responses:"
echo "  Contract: /tmp/contract-response.json"
echo "  LC: /tmp/lc-response.json"
echo ""
