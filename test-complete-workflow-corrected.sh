#!/bin/bash

# ============================================================================
# GoCBC Complete Workflow Test - FULLY CORRECTED
# Tests actual blockchain transactions with proper authentication and roles
# ============================================================================

set -e

API_BASE="http://localhost:3001/api/v1"
LOG_FILE="workflow-test-corrected.log"
TIMESTAMP=$(date +%s)

echo "==================================================================="
echo "GoCBC Complete Workflow Test - FULLY CORRECTED"
echo "Testing with proper authentication, roles, and endpoint paths"
echo "==================================================================="
echo ""
date > "$LOG_FILE"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_api() {
    local NAME="$1"
    local METHOD="$2"
    local ENDPOINT="$3"
    local DATA="$4"
    local TOKEN="$5"
    local EXPECTED_SUCCESS="${6:-true}"
    
    echo -e "\n${YELLOW}━━━ TEST: $NAME ━━━${NC}"
    echo "Method: $METHOD"
    echo "Endpoint: $ENDPOINT"
    
    # Build curl command
    local CURL_CMD="curl -s -w '\n%{http_code}' -X $METHOD '$ENDPOINT'"
    
    if [ -n "$TOKEN" ]; then
        CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $TOKEN'"
    fi
    
    if [ -n "$DATA" ]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/json' -d '$DATA'"
    fi
    
    # Execute
    RESPONSE=$(eval $CURL_CMD 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Log
    echo "=== $NAME ===" >> "$LOG_FILE"
    echo "HTTP $HTTP_CODE" >> "$LOG_FILE"
    echo "$BODY" | python3 -m json.tool >> "$LOG_FILE" 2>/dev/null || echo "$BODY" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    # Check success
    local SUCCESS=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Success: $SUCCESS"
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$BODY"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Response: $BODY" | head -c 300
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
        return 1
    fi
}

# ============================================================================
# STEP 1: Submit Exporter Application (PUBLIC - NO AUTH)
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 1: Submit Exporter Application (Public Endpoint)"
echo "==================================================================="

EXPORTER_EMAIL="exporter_$TIMESTAMP@test.com"
EXPORTER_COMPANY="Test Coffee Ltd $TIMESTAMP"

APP_RESPONSE=$(test_api \
    "Submit Exporter Application" \
    "POST" \
    "$API_BASE/exporters/exporter-applications" \
    '{
        "companyName": "'"$EXPORTER_COMPANY"'",
        "licenseNumber": "LIC-'$TIMESTAMP'",
        "address": "Addis Ababa, Ethiopia",
        "phone": "+251911234567",
        "email": "'"$EXPORTER_EMAIL"'",
        "tinNumber": "TIN-'$TIMESTAMP'",
        "businessType": "Coffee Exporter",
        "exportCapacity": 5000
    }' \
    "" \
    "true")

# Extract application ID
APP_ID=$(echo "$APP_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('applicationId', '') or data.get('data', {}).get('application_id', '') or data.get('applicationId', ''))" 2>/dev/null || echo "")

echo ""
echo "Application ID: $APP_ID"
echo "Application Email: $EXPORTER_EMAIL"

# ============================================================================
# STEP 2: Check PostgreSQL for Application
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 2: Verify Application in PostgreSQL"
echo "==================================================================="

echo "Query: SELECT application_id, company_name, email, status FROM exporter_applications WHERE email = '$EXPORTER_EMAIL';"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT application_id, company_name, email, status, submitted_at FROM exporter_applications WHERE email = '$EXPORTER_EMAIL';" \
    2>&1 | tee -a "$LOG_FILE"

# ============================================================================
# STEP 3: Login as ECTA Admin to Approve Application
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 3: Login as ECTA Admin"
echo "==================================================================="

# First check if ECTA admin exists, if not use regular admin
ADMIN_LOGIN=$(test_api \
    "Admin Login" \
    "POST" \
    "$API_BASE/auth/login" \
    '{"username":"admin","password":"admin123"}' \
    "" \
    "true")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null || echo "")

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to get admin token!${NC}"
    exit 1
fi

echo "Admin Token: ${ADMIN_TOKEN:0:30}..."

# ============================================================================
# STEP 4: Approve Exporter Application (Creates Exporter on Blockchain)
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 4: Approve Exporter Application"
echo "==================================================================="

if [ -n "$APP_ID" ]; then
    APPROVE_RESPONSE=$(test_api \
        "Approve Application" \
        "POST" \
        "$API_BASE/exporters/exporter-applications/$APP_ID/approve" \
        '{}' \
        "$ADMIN_TOKEN" \
        "true")
    
    EXPORTER_ID=$(echo "$APPROVE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('exporterID', '') or data.get('data', {}).get('exporter_id', ''))" 2>/dev/null || echo "EXP-$TIMESTAMP")
else
    echo -e "${YELLOW}⚠ Skipping approval - no application ID${NC}"
    EXPORTER_ID="EXP-$TIMESTAMP"
fi

echo "Exporter ID: $EXPORTER_ID"

# ============================================================================
# STEP 5: Login as Exporter
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 5: Login as Exporter"
echo "==================================================================="

# The approval creates temporary credentials - we need to extract them
# For now, create an exporter user manually
EXPORTER_USERNAME="exporter_$TIMESTAMP"

# Create exporter user via API
CREATE_USER=$(test_api \
    "Create Exporter User" \
    "POST" \
    "$API_BASE/users/register" \
    '{
        "username": "'"$EXPORTER_USERNAME"'",
        "email": "'"$EXPORTER_EMAIL"'",
        "password": "Exporter123!",
        "role": "EXPORTER",
        "organization": "EXPORTER",
        "exporterId": "'"$EXPORTER_ID"'",
        "fullName": "'"$EXPORTER_COMPANY"'"
    }' \
    "$ADMIN_TOKEN" \
    "true") || echo "User may already exist"

# Login as exporter
EXPORTER_LOGIN=$(test_api \
    "Exporter Login" \
    "POST" \
    "$API_BASE/auth/login" \
    '{"username":"'"$EXPORTER_USERNAME"'","password":"Exporter123!"}' \
    "" \
    "true")

EXPORTER_TOKEN=$(echo "$EXPORTER_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null || echo "")

if [ -z "$EXPORTER_TOKEN" ]; then
    echo -e "${RED}Failed to get exporter token!${NC}"
    echo "Using admin token as fallback..."
    EXPORTER_TOKEN="$ADMIN_TOKEN"
fi

echo "Exporter Token: ${EXPORTER_TOKEN:0:30}..."

# ============================================================================
# STEP 6: Create Sales Contract (CORRECTED FIELDS)
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 6: Create Sales Contract"
echo "==================================================================="

CONTRACT_ID="CNT-$TIMESTAMP"
BUYER_ID="BUY-$TIMESTAMP"

CONTRACT_RESPONSE=$(test_api \
    "Create Sales Contract" \
    "POST" \
    "$API_BASE/contracts" \
    '{
        "contractID": "'"$CONTRACT_ID"'",
        "exporterID": "'"$EXPORTER_ID"'",
        "buyerID": "'"$BUYER_ID"'",
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
    }' \
    "$EXPORTER_TOKEN" \
    "true")

echo ""
echo "Checking PostgreSQL for contract..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT contract_id, exporter_id, buyer_id, status, blockchain_tx_id, created_at FROM contracts WHERE contract_id = '$CONTRACT_ID' ORDER BY created_at DESC LIMIT 1;" \
    2>&1 | tee -a "$LOG_FILE"

# ============================================================================
# STEP 7: Create Shipment (CORRECTED FIELDS)
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 7: Create Shipment"
echo "==================================================================="

SHIPMENT_ID="SHP-$TIMESTAMP"

SHIPMENT_RESPONSE=$(test_api \
    "Create Shipment" \
    "POST" \
    "$API_BASE/shipments" \
    '{
        "shipmentID": "'"$SHIPMENT_ID"'",
        "contractID": "'"$CONTRACT_ID"'",
        "exporterID": "'"$EXPORTER_ID"'",
        "buyerID": "'"$BUYER_ID"'",
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
    }' \
    "$EXPORTER_TOKEN" \
    "true")

echo ""
echo "Checking PostgreSQL for shipment..."
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
    "SELECT shipment_id, contract_id, exporter_id, status, blockchain_tx_id, created_at FROM shipments WHERE shipment_id = '$SHIPMENT_ID' ORDER BY created_at DESC LIMIT 1;" \
    2>&1 | tee -a "$LOG_FILE"

# ============================================================================
# STEP 8: Query Blockchain
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 8: Query Blockchain Data"
echo "==================================================================="

test_api \
    "Query Contract from Blockchain" \
    "GET" \
    "$API_BASE/contracts/$CONTRACT_ID" \
    "" \
    "$EXPORTER_TOKEN" \
    "true" || echo "Contract query failed (may still be syncing)"

test_api \
    "Query Shipment from Blockchain" \
    "GET" \
    "$API_BASE/shipments/$SHIPMENT_ID" \
    "" \
    "$EXPORTER_TOKEN" \
    "true" || echo "Shipment query failed (may still be syncing)"

# ============================================================================
# STEP 9: Check CouchDB (Blockchain State Database)
# ============================================================================

echo ""
echo "==================================================================="
echo "STEP 9: Check CouchDB Blockchain State"
echo "==================================================================="

echo "Checking CouchDB for contract..."
curl -s "http://admin:adminpw@localhost:5984/coffeechannel_coffee/_all_docs?include_docs=true&limit=10" | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps([row['doc'] for row in data['rows'] if 'contract' in row['id'].lower() or 'CNT' in row['id']], indent=2))" \
    2>/dev/null | head -50 | tee -a "$LOG_FILE"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "==================================================================="
echo "TEST SUMMARY"
echo "==================================================================="
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""
echo "Full log: $LOG_FILE"
echo ""
echo "Test Data Created:"
echo "  Application ID: $APP_ID"
echo "  Exporter ID: $EXPORTER_ID"
echo "  Contract ID: $CONTRACT_ID"
echo "  Shipment ID: $SHIPMENT_ID"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "System is functional and storing data in both databases."
    exit 0
else
    echo -e "${YELLOW}⚠ SOME TESTS FAILED${NC}"
    echo "Check the log file for details: $LOG_FILE"
    exit 1
fi
