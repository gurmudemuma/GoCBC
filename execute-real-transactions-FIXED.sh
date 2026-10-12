#!/bin/bash

# ============================================================================
# GoCBC Real Transaction Test - FIXED VERSION
# Tests actual blockchain functions with corrected endpoints and field names
# ============================================================================

set -e

API_BASE="http://localhost:3001/api/v1"
LOG_FILE="real-transactions-fixed.log"
RESULTS_FILE="real-transactions-fixed-results.json"

echo "==================================================================="
echo "GoCBC Real Transaction Test - FIXED VERSION"
echo "==================================================================="
echo ""
echo "Corrections applied:"
echo "  ✓ Using correct endpoint: /exporter-applications (not /exporters/register)"
echo "  ✓ Using uppercase IDs: contractID, shipmentID, exporterID"
echo "  ✓ Using application_id format: APP-XXXXX"
echo ""
date > "$LOG_FILE"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to log and test
test_endpoint() {
    local NAME="$1"
    local METHOD="$2"
    local ENDPOINT="$3"
    local DATA="$4"
    local EXPECTED_STATUS="$5"
    local TOKEN="$6"
    
    echo "----------------------------------------"
    echo "TEST: $NAME"
    echo "Endpoint: $METHOD $ENDPOINT"
    
    if [ -n "$DATA" ]; then
        echo "Payload:" >> "$LOG_FILE"
        echo "$DATA" | jq '.' >> "$LOG_FILE" 2>/dev/null || echo "$DATA" >> "$LOG_FILE"
    fi
    
    # Build curl command
    CURL_CMD="curl -s -w '\n%{http_code}' -X $METHOD '$ENDPOINT'"
    
    if [ -n "$TOKEN" ]; then
        CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $TOKEN'"
    fi
    
    if [ -n "$DATA" ]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/json' -d '$DATA'"
    fi
    
    # Execute request
    RESPONSE=$(eval $CURL_CMD 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "Response Code: $HTTP_CODE"
    echo "Response Body: $BODY" | head -c 500
    echo ""
    
    # Log full response
    echo "=== $NAME ===" >> "$LOG_FILE"
    echo "HTTP $HTTP_CODE" >> "$LOG_FILE"
    echo "$BODY" | jq '.' >> "$LOG_FILE" 2>/dev/null || echo "$BODY" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    # Check result
    if [ "$HTTP_CODE" = "$EXPECTED_STATUS" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "✓ PASS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$BODY"
        return 0
    else
        echo "✗ FAIL (Expected $EXPECTED_STATUS, got $HTTP_CODE)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
        return 1
    fi
}

# ============================================================================
# PHASE 1: Authentication
# ============================================================================

echo ""
echo "==================================================================="
echo "PHASE 1: Authentication"
echo "==================================================================="
echo ""

# Get auth token (use existing admin user from database)
AUTH_RESPONSE=$(test_endpoint \
    "Login as Admin" \
    "POST" \
    "$API_BASE/auth/login" \
    '{"username":"admin","password":"admin123"}' \
    "200" \
    "")

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "⚠️  WARNING: Could not extract auth token. Some tests will fail."
    echo "Attempting to continue with test user credentials..."
    
    # Try creating a test user
    test_endpoint \
        "Create Test User" \
        "POST" \
        "$API_BASE/users/register" \
        '{"username":"testuser","email":"test@example.com","password":"Test123!","role":"EXPORTER","exporterId":"TEST-EXP-001"}' \
        "201" \
        ""
    
    AUTH_RESPONSE=$(test_endpoint \
        "Login as Test User" \
        "POST" \
        "$API_BASE/auth/login" \
        '{"username":"testuser","password":"Test123!"}' \
        "200" \
        "")
    
    TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null || echo "")
fi

echo ""
echo "Auth Token: ${TOKEN:0:50}..."
echo ""

# ============================================================================
# PHASE 2: Exporter Application (CORRECTED ENDPOINT)
# ============================================================================

echo ""
echo "==================================================================="
echo "PHASE 2: Exporter Application"
echo "==================================================================="
echo ""

TIMESTAMP=$(date +%s)
EXPORTER_ID="EXP-TEST-$TIMESTAMP"
APP_ID="APP-$TIMESTAMP"

# ✅ FIX: Use correct endpoint /exporters/exporter-applications (router prefix + route path)
EXPORTER_PAYLOAD='{
  "companyName": "Test Coffee Exporter Ltd",
  "licenseNumber": "LIC-'$TIMESTAMP'",
  "address": "Addis Ababa, Ethiopia",
  "phone": "+251911234567",
  "email": "exporter-'$TIMESTAMP'@test.com",
  "tinNumber": "TIN-'$TIMESTAMP'",
  "businessType": "Coffee Exporter",
  "establishedYear": 2020,
  "exportCapacity": 5000,
  "certifications": ["Organic", "Fair Trade"]
}'

EXPORTER_RESPONSE=$(test_endpoint \
    "Submit Exporter Application (CORRECTED)" \
    "POST" \
    "$API_BASE/exporters/exporter-applications" \
    "$EXPORTER_PAYLOAD" \
    "201" \
    "")

# Extract application ID from response
APPLICATION_ID=$(echo "$EXPORTER_RESPONSE" | jq -r '.data.applicationId // .data.application_id // .applicationId // empty' 2>/dev/null || echo "")

if [ -z "$APPLICATION_ID" ]; then
    echo "⚠️  Could not extract application ID. Using fallback: $APP_ID"
    APPLICATION_ID="$APP_ID"
fi

echo "Application ID: $APPLICATION_ID"
echo ""

# ============================================================================
# PHASE 3: Database Verification
# ============================================================================

echo ""
echo "==================================================================="
echo "PHASE 3: Database Verification"
echo "==================================================================="
echo ""

echo "Checking PostgreSQL for exporter application..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT application_id, company_name, status, submitted_at FROM exporter_applications WHERE application_id = '$APPLICATION_ID' OR email LIKE '%$TIMESTAMP%';" \
    2>&1 | tee -a "$LOG_FILE"

echo ""
echo "Checking all recent exporter applications..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT application_id, company_name, status, submitted_at FROM exporter_applications ORDER BY submitted_at DESC LIMIT 5;" \
    2>&1 | tee -a "$LOG_FILE"

echo ""

# ============================================================================
# PHASE 4: Contract Creation (CORRECTED FIELD NAMES)
# ============================================================================

echo ""
echo "==================================================================="
echo "PHASE 4: Contract Creation (CORRECTED)"
echo "==================================================================="
echo ""

CONTRACT_ID="CNT-TEST-$TIMESTAMP"
BUYER_ID="BUY-TEST-$TIMESTAMP"

# ✅ FIX: Use uppercase IDs: contractID, exporterID, buyerID
CONTRACT_PAYLOAD='{
  "contractID": "'$CONTRACT_ID'",
  "exporterID": "'$EXPORTER_ID'",
  "buyerID": "'$BUYER_ID'",
  "buyerCountry": "Germany",
  "buyerBank": "Deutsche Bank",
  "exporterBank": "Commercial Bank of Ethiopia",
  "coffeeType": "Arabica Sidamo Grade 2",
  "quantity": 10000,
  "pricePerKg": 5.50,
  "currency": "USD",
  "paymentMethod": "LC",
  "eudrRequired": true,
  "documents": []
}'

CONTRACT_RESPONSE=$(test_endpoint \
    "Create Sales Contract (CORRECTED)" \
    "POST" \
    "$API_BASE/contracts" \
    "$CONTRACT_PAYLOAD" \
    "201" \
    "$TOKEN")

echo ""
echo "Checking PostgreSQL for contract..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT contract_id, exporter_id, buyer_id, status, created_at FROM contracts WHERE contract_id = '$CONTRACT_ID' OR contract_id LIKE '%$TIMESTAMP%';" \
    2>&1 | tee -a "$LOG_FILE"

echo ""

# ============================================================================
# PHASE 5: Shipment Creation (CORRECTED FIELD NAMES)
# ============================================================================

echo ""
echo "==================================================================="
echo "PHASE 5: Shipment Creation (CORRECTED)"
echo "==================================================================="
echo ""

SHIPMENT_ID="SHP-TEST-$TIMESTAMP"

# ✅ FIX: Use uppercase IDs: shipmentID, contractID, exporterID, buyerID
SHIPMENT_PAYLOAD='{
  "shipmentID": "'$SHIPMENT_ID'",
  "contractID": "'$CONTRACT_ID'",
  "exporterID": "'$EXPORTER_ID'",
  "buyerID": "'$BUYER_ID'",
  "origin": "Sidamo, Ethiopia",
  "quantity": 10000,
  "grade": "Grade 2",
  "icoNumber": "ICO-'$TIMESTAMP'",
  "channel": "ECX",
  "ecxLotNumber": "ECX-LOT-'$TIMESTAMP'",
  "forexRate": 55.5,
  "valueUSD": 55000,
  "eudrCompliant": true,
  "documents": []
}'

SHIPMENT_RESPONSE=$(test_endpoint \
    "Create Shipment (CORRECTED)" \
    "POST" \
    "$API_BASE/shipments" \
    "$SHIPMENT_PAYLOAD" \
    "201" \
    "$TOKEN")

echo ""
echo "Checking PostgreSQL for shipment..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT shipment_id, contract_id, exporter_id, status, created_at FROM shipments WHERE shipment_id = '$SHIPMENT_ID' OR shipment_id LIKE '%$TIMESTAMP%';" \
    2>&1 | tee -a "$LOG_FILE"

echo ""

# ============================================================================
# PHASE 6: Blockchain Query Test
# ============================================================================

echo ""
echo "==================================================================="
echo "PHASE 6: Blockchain Query Test"
echo "==================================================================="
echo ""

test_endpoint \
    "Query Contract from Blockchain" \
    "GET" \
    "$API_BASE/contracts/$CONTRACT_ID" \
    "" \
    "200" \
    "$TOKEN"

echo ""

test_endpoint \
    "Query Shipment from Blockchain" \
    "GET" \
    "$API_BASE/shipments/$SHIPMENT_ID" \
    "" \
    "200" \
    "$TOKEN"

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "==================================================================="
echo "TEST SUMMARY"
echo "==================================================================="
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""
echo "Full log: $LOG_FILE"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "✓ ALL TESTS PASSED - System is functional!"
    exit 0
else
    echo "✗ SOME TESTS FAILED - See log for details"
    echo ""
    echo "Common issues:"
    echo "  1. Authentication token not valid"
    echo "  2. User doesn't have correct role/permissions"
    echo "  3. Blockchain network timeout"
    echo "  4. Database connection issues"
    echo ""
    exit 1
fi
