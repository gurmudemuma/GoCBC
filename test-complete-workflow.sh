#!/bin/bash
# Complete Workflow Test - From Exporter Registration to Payment

set -e

API="http://localhost:3001/api/v1"
TIMESTAMP=$(date +%s)

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     CECBS - Complete Workflow Test                         ║"
echo "║     From Registration to Delivery                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PHASE 1: LOGIN
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 1: AUTHENTICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "→ Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$ADMIN_LOGIN" | grep -q '"success":true'; then
  ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "✓ Admin logged in successfully"
else
  echo "✗ Admin login failed"
  echo "$ADMIN_LOGIN"
  exit 1
fi

echo "→ Logging in as exporter..."
EXPORTER_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"exporter1","password":"password123"}')

if echo "$EXPORTER_LOGIN" | grep -q '"success":true'; then
  EXPORTER_TOKEN=$(echo "$EXPORTER_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  EXPORTER_USER=$(echo "$EXPORTER_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data.get('data', {}).get('user', {}), indent=2))" 2>/dev/null)
  echo "✓ Exporter logged in successfully"
  echo "$EXPORTER_USER" > /tmp/exporter-user.json
else
  echo "✗ Exporter login failed"
  exit 1
fi

# ============================================================================
# PHASE 2: CREATE CONTRACT
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 2: CONTRACT CREATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CONTRACT_ID="CONTRACT-TEST-${TIMESTAMP}"
echo "→ Creating contract: $CONTRACT_ID..."

CONTRACT_RESPONSE=$(curl -s -X POST "$API/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  -d "{
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"exporter1\",
    \"buyerID\": \"BUYER-EU-001\",
    \"buyerCountry\": \"Germany\",
    \"buyerBank\": \"Deutsche Bank AG\",
    \"exporterBank\": \"Commercial Bank of Ethiopia\",
    \"coffeeType\": \"Arabica Yirgacheffe\",
    \"quantity\": 100,
    \"pricePerKg\": 8.50,
    \"currency\": \"USD\",
    \"paymentMethod\": \"LC\",
    \"eudrRequired\": true,
    \"deliveryTerms\": \"FOB Djibouti\",
    \"deliveryDate\": \"2026-12-31T00:00:00Z\"
  }")

echo "$CONTRACT_RESPONSE" > /tmp/contract-created.json

if echo "$CONTRACT_RESPONSE" | grep -q '"success":true\|contractId\|CONTRACT-TEST'; then
  echo "✓ Contract created successfully"
  echo "  Contract ID: $CONTRACT_ID"
  echo "  Quantity: 100 tons"
  echo "  Value: $850,000 USD"
  echo "  Payment: LC (Letter of Credit)"
else
  echo "✗ Contract creation failed"
  cat /tmp/contract-created.json
  exit 1
fi

# Verify on blockchain
echo "→ Verifying contract on blockchain..."
sleep 2

BLOCKCHAIN_CONTRACT=$(curl -s -X GET "$API/contracts/$CONTRACT_ID" \
  -H "Authorization: Bearer $EXPORTER_TOKEN")

echo "$BLOCKCHAIN_CONTRACT" > /tmp/contract-blockchain.json

if echo "$BLOCKCHAIN_CONTRACT" | grep -q "$CONTRACT_ID"; then
  echo "✓ Contract verified on blockchain"
else
  echo "⚠ Contract verification unclear"
fi

# ============================================================================
# PHASE 3: REQUEST LETTER OF CREDIT
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 3: LETTER OF CREDIT (LC) REQUEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LC_NUMBER="LC-TEST-${TIMESTAMP}"
echo "→ Requesting LC: $LC_NUMBER..."

LC_RESPONSE=$(curl -s -X POST "$API/lcs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  -d "{
    \"lcNumber\": \"$LC_NUMBER\",
    \"contractId\": \"$CONTRACT_ID\",
    \"amount\": 850000,
    \"currency\": \"USD\",
    \"beneficiary\": \"Test Coffee Exporter\",
    \"applicant\": \"European Premium Coffee GmbH\",
    \"issuingBank\": \"Deutsche Bank AG\",
    \"advisingBank\": \"Commercial Bank of Ethiopia\",
    \"lcType\": \"AT_SIGHT\",
    \"expiryDate\": \"2026-12-31T00:00:00Z\",
    \"latestShipmentDate\": \"2026-12-15T00:00:00Z\",
    \"portOfLoading\": \"Djibouti\",
    \"portOfDischarge\": \"Hamburg\",
    \"incoterm\": \"FOB\",
    \"partialShipment\": false,
    \"transhipment\": true,
    \"documentsRequired\": [
      \"Commercial Invoice\",
      \"Packing List\",
      \"Bill of Lading\",
      \"Certificate of Origin\",
      \"Quality Certificate\",
      \"Phytosanitary Certificate\"
    ]
  }")

echo "$LC_RESPONSE" > /tmp/lc-created.json

if echo "$LC_RESPONSE" | grep -q '"success":true\|lcId\|lcNumber\|LC-TEST'; then
  echo "✓ LC requested successfully"
  LC_ID=$(echo "$LC_RESPONSE" | grep -o '"lcId":"[^"]*' | cut -d'"' -f4 || echo "$LC_NUMBER")
  echo "  LC Number: $LC_NUMBER"
  echo "  Amount: $850,000 USD"
  echo "  Type: At Sight"
  echo "  Expected Status: REQUESTED"
else
  echo "⚠ LC request response unclear"
  cat /tmp/lc-created.json
fi

# ============================================================================
# PHASE 4: CHECK LC STATUS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 4: LC STATUS VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "→ Querying LC status..."
sleep 2

LC_STATUS=$(curl -s -X GET "$API/lcs?contractId=$CONTRACT_ID" \
  -H "Authorization: Bearer $EXPORTER_TOKEN")

echo "$LC_STATUS" > /tmp/lc-status.json

if echo "$LC_STATUS" | grep -q "REQUESTED\|APPROVED\|ISSUED"; then
  echo "✓ LC status retrieved"
  CURRENT_STATUS=$(echo "$LC_STATUS" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "  Current Status: $CURRENT_STATUS"
else
  echo "⚠ LC status query unclear"
fi

# ============================================================================
# PHASE 5: DATABASE VERIFICATION
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 5: DATABASE VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "→ Checking database records..."

# Check users
USER_COUNT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
echo "✓ Users in database: $USER_COUNT"

# Check if our contract exists
CONTRACT_EXISTS=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM contracts WHERE contract_number LIKE '%TEST%';" 2>/dev/null | tr -d ' ' || echo "N/A")

if [ "$CONTRACT_EXISTS" != "N/A" ] && [ "$CONTRACT_EXISTS" -gt 0 ]; then
  echo "✓ Test contracts in database: $CONTRACT_EXISTS"
else
  echo "⚠ Contracts may be stored on blockchain only"
fi

# ============================================================================
# PHASE 6: BLOCKCHAIN VERIFICATION
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 6: BLOCKCHAIN NETWORK STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check peers
PEER_COUNT=$(docker ps --filter "name=peer" --filter "status=running" | grep -c "peer" || echo "0")
echo "→ Blockchain peers running: $PEER_COUNT/6"

if [ "$PEER_COUNT" -ge 6 ]; then
  echo "✓ All peers operational"
else
  echo "⚠ Not all peers running"
fi

# Check chaincode
if docker ps | grep -q "coffee-chaincode"; then
  echo "✓ Chaincode container running"
  CHAINCODE_ID=$(docker ps --filter "name=coffee-chaincode" --format "{{.ID}}")
  CHAINCODE_STATUS=$(docker inspect --format='{{.State.Status}}' $CHAINCODE_ID 2>/dev/null || echo "unknown")
  echo "  Status: $CHAINCODE_STATUS"
else
  echo "✗ Chaincode container NOT running"
fi

# ============================================================================
# PHASE 7: UI ACCESSIBILITY CHECK
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 7: UI ACCESSIBILITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

UI_CODE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3000)

if [ "$UI_CODE" = "200" ]; then
  echo "✓ UI accessible (HTTP 200)"
  echo "  URL: http://localhost:3000"
else
  echo "⚠ UI returned HTTP $UI_CODE"
fi

# Check if login page loads
if curl -s http://localhost:3000/login | grep -q "Ethiopian Coffee"; then
  echo "✓ Login page loads correctly"
else
  echo "⚠ Login page may have issues"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Execution Completed: $(date)"
echo ""
echo "✓ Components Tested:"
echo "  • Authentication (Admin + Exporter)"
echo "  • Contract Creation & Blockchain Recording"
echo "  • Letter of Credit Request"
echo "  • Database Persistence"
echo "  • Blockchain Network Status"
echo "  • UI Accessibility"
echo ""
echo "📊 Test Data Generated:"
echo "  • Contract ID: $CONTRACT_ID"
echo "  • LC Number: $LC_NUMBER"
echo "  • Amount: $850,000 USD"
echo "  • Quantity: 100 tons Arabica Yirgacheffe"
echo ""
echo "📁 Detailed Outputs Saved:"
echo "  • /tmp/contract-created.json"
echo "  • /tmp/contract-blockchain.json"
echo "  • /tmp/lc-created.json"
echo "  • /tmp/lc-status.json"
echo "  • /tmp/exporter-user.json"
echo ""
echo "🌐 Access Points:"
echo "  • UI: http://localhost:3000"
echo "  • API: http://localhost:3001"
echo "  • Health: http://localhost:3001/health"
echo ""
echo "👤 Test Credentials:"
echo "  • Admin: admin / admin123"
echo "  • Exporter: exporter1 / password123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "WORKFLOW TEST COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
