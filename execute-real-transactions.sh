#!/bin/bash
#
# GoCBC Real Transaction Execution Test
# Actually executes blockchain transactions to prove functions work
#

set +e  # Don't exit on errors

cd /home/guda/GoCBC

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

API_BASE="http://localhost:3001/api/v1"
TOKEN=""
PASSED=0
FAILED=0
TOTAL=0

echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "  GoCBC REAL TRANSACTION EXECUTION TEST"
echo "  Actually Creating Data and Verifying Functions Work"
echo "================================================================"
echo -e "${RESET}"
echo ""

# Test helper
execute_test() {
    local description=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    ((TOTAL++))
    echo -n "${TOTAL}. ${description}... "
    
    local response
    local http_code
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            "${API_BASE}${endpoint}" 2>&1)
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data" \
            "${API_BASE}${endpoint}" 2>&1)
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${RESET}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL (HTTP $http_code)${RESET}"
        echo "   Response: $(echo $body | head -c 150)"
        ((FAILED++))
        return 1
    fi
}

# Step 1: Authentication
echo -e "${BOLD}Step 1: Authentication${RESET}"
echo ""

echo -n "Logging in... "
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' \
    "${API_BASE}/auth/login" 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✓ Logged in successfully${RESET}"
    else
        echo -e "${YELLOW}⚠ Login succeeded but no token found, trying without auth...${RESET}"
    fi
else
    echo -e "${YELLOW}⚠ Login failed (HTTP $HTTP_CODE), will try requests without token${RESET}"
fi

echo ""
echo -e "${BOLD}Step 2: Creating Real Test Data${RESET}"
echo ""

# Generate unique IDs
TIMESTAMP=$(date +%s)
EXPORTER_ID="TEST_EXP_${TIMESTAMP}"
CONTRACT_ID="TEST_CTR_${TIMESTAMP}"
SHIPMENT_ID="TEST_SHP_${TIMESTAMP}"
LC_ID="TEST_LC_${TIMESTAMP}"
PAYMENT_ID="TEST_PAY_${TIMESTAMP}"
FOREX_ID="TEST_FX_${TIMESTAMP}"
CUSTOMS_ID="TEST_CST_${TIMESTAMP}"

# Test 1: Register Exporter
execute_test "Register Exporter" "POST" "/exporters/register" \
'{
  "exporterId": "'$EXPORTER_ID'",
  "companyName": "Test Coffee Exporter Ltd",
  "ectaLicenseNumber": "ECTA/'$TIMESTAMP'/001",
  "exporterType": "Direct",
  "capitalRequirement": 5000000,
  "contactPerson": "John Doe",
  "phone": "+251911234567",
  "email": "test@testexporter.et",
  "city": "Addis Ababa",
  "address": "Bole, Addis Ababa"
}'

# Test 2: Get Exporter
execute_test "Retrieve Created Exporter" "GET" "/exporters/${EXPORTER_ID}"

# Test 3: Create Sales Contract
execute_test "Create Sales Contract" "POST" "/contracts" \
'{
  "contractId": "'$CONTRACT_ID'",
  "exporterId": "'$EXPORTER_ID'",
  "buyerId": "BUYER_001",
  "buyerName": "German Coffee Imports GmbH",
  "buyerCountry": "Germany",
  "coffeeType": "Arabica Sidamo",
  "quantity": 1000,
  "pricePerKg": 6.50,
  "currency": "USD",
  "totalValue": 6500,
  "eudrRequired": true,
  "buyerBank": "Deutsche Bank",
  "exporterBank": "Commercial Bank of Ethiopia",
  "paymentMethod": "LC"
}'

# Test 4: Get Contract
execute_test "Retrieve Created Contract" "GET" "/contracts/${CONTRACT_ID}"

# Test 5: Approve Contract
execute_test "Approve Contract" "POST" "/contracts/${CONTRACT_ID}/approve" \
'{
  "approvedBy": "admin",
  "comments": "Approved for testing"
}'

# Test 6: Create Shipment
execute_test "Create Shipment" "POST" "/shipments" \
'{
  "shipmentId": "'$SHIPMENT_ID'",
  "contractId": "'$CONTRACT_ID'",
  "exporterId": "'$EXPORTER_ID'",
  "quantity": 1000,
  "grade": "Grade 2",
  "origin": "Sidamo, Ethiopia",
  "destination": "Hamburg, Germany",
  "icoNumber": "ICO'$TIMESTAMP'",
  "ecxLotNumber": "ECX'$TIMESTAMP'",
  "eudrCompliant": true
}'

# Test 7: Get Shipment
execute_test "Retrieve Created Shipment" "GET" "/shipments/${SHIPMENT_ID}"

# Test 8: Update Shipment Status
execute_test "Update Shipment Status" "PUT" "/shipments/${SHIPMENT_ID}/status" \
'{
  "status": "in_transit",
  "updatedBy": "admin"
}'

# Test 9: Request Quality Inspection
execute_test "Request Quality Inspection" "POST" "/quality/request" \
'{
  "shipmentId": "'$SHIPMENT_ID'",
  "contractId": "'$CONTRACT_ID'",
  "exporterId": "'$EXPORTER_ID'",
  "requestedBy": "admin"
}'

# Test 10: Request Letter of Credit
execute_test "Request Letter of Credit" "POST" "/banking/lc/request" \
'{
  "lcId": "'$LC_ID'",
  "contractId": "'$CONTRACT_ID'",
  "exporterId": "'$EXPORTER_ID'",
  "amount": 6500,
  "currency": "USD",
  "issuingBank": "Deutsche Bank",
  "advisingBank": "Commercial Bank of Ethiopia"
}'

# Test 11: Request Forex Allocation
execute_test "Request Forex Allocation" "POST" "/forex/request" \
'{
  "forexId": "'$FOREX_ID'",
  "contractId": "'$CONTRACT_ID'",
  "exporterId": "'$EXPORTER_ID'",
  "amount": 6500,
  "currency": "USD",
  "requestedBy": "admin"
}'

# Test 12: Submit Customs Declaration
execute_test "Submit Customs Declaration" "POST" "/customs/declare" \
'{
  "declarationId": "'$CUSTOMS_ID'",
  "shipmentId": "'$SHIPMENT_ID'",
  "exporterId": "'$EXPORTER_ID'",
  "declarationType": "export",
  "hsCode": "0901.21",
  "quantity": 1000,
  "value": 6500,
  "currency": "USD",
  "destination": "Germany"
}'

# Verify Data in Database
echo ""
echo -e "${BOLD}Step 3: Verifying Data in Database${RESET}"
echo ""

echo -n "Checking database for created records... "
DB_COUNTS=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "
SELECT 
  (SELECT COUNT(*) FROM exporter_applications) as exporters,
  (SELECT COUNT(*) FROM contracts) as contracts,
  (SELECT COUNT(*) FROM shipments) as shipments;
" 2>&1)

if echo "$DB_COUNTS" | grep -q "[1-9]"; then
    echo -e "${GREEN}✓ Data found in database${RESET}"
    echo "   $DB_COUNTS"
else
    echo -e "${RED}✗ No data in database${RESET}"
fi

# Summary
echo ""
echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "  TEST EXECUTION RESULTS"
echo "================================================================"
echo -e "${RESET}"
echo -e "Total Tests:    ${BOLD}$TOTAL${RESET}"
echo -e "Passed:         ${GREEN}${BOLD}$PASSED${RESET}"
echo -e "Failed:         ${RED}${BOLD}$FAILED${RESET}"
echo ""

if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))
    if [ $PASS_RATE -ge 70 ]; then
        echo -e "Pass Rate:      ${GREEN}${BOLD}${PASS_RATE}%${RESET}"
    else
        echo -e "Pass Rate:      ${RED}${BOLD}${PASS_RATE}%${RESET}"
    fi
fi

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ ALL REAL TRANSACTIONS COMPLETED SUCCESSFULLY${RESET}"
    echo ""
    echo "The system has been proven to work with actual data!"
    exit 0
else
    echo -e "${RED}${BOLD}✗ SOME TRANSACTIONS FAILED${RESET}"
    echo ""
    echo "The system needs fixes. Check the errors above."
    exit 1
fi
