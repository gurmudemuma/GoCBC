#!/bin/bash
# Comprehensive Portal Workflow Testing Script
# Tests all portals with blockchain integration

API_URL="http://localhost:3001/api/v1"
OUTPUT_FILE="/tmp/portal-test-results.txt"

echo "=====================================================================" > $OUTPUT_FILE
echo "CECBS COMPREHENSIVE PORTAL TESTING" >> $OUTPUT_FILE
echo "Test Date: $(date)" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    
    echo "Testing: $name" >> $OUTPUT_FILE
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -H "Authorization: Bearer $token" \
            "$API_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
            -X $method \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" \
            "$API_URL$endpoint" 2>&1)
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
    body=$(echo "$response" | grep -v "HTTP_CODE")
    
    echo "  Status: $http_code" >> $OUTPUT_FILE
    
    # Check for blockchain txId in response
    if echo "$body" | grep -q "txId\|TxId\|transaction"; then
        echo "  ✅ Blockchain: Transaction ID present" >> $OUTPUT_FILE
    fi
    
    # Check success field
    if echo "$body" | grep -q '"success":true'; then
        echo "  ✅ Success: true" >> $OUTPUT_FILE
    elif echo "$body" | grep -q '"success":false'; then
        echo "  ❌ Success: false" >> $OUTPUT_FILE
        echo "  Error: $(echo $body | grep -o '"message":"[^"]*"' | head -1)" >> $OUTPUT_FILE
    fi
    
    echo "" >> $OUTPUT_FILE
}

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 1: AUTHENTICATION TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Test admin login
echo "1.1 Testing Admin Login..." >> $OUTPUT_FILE
admin_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>&1)

if echo "$admin_response" | grep -q '"token"'; then
    ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Admin Login Successful" >> $OUTPUT_FILE
    echo "   Token: ${ADMIN_TOKEN:0:30}..." >> $OUTPUT_FILE
else
    echo "❌ Admin Login Failed" >> $OUTPUT_FILE
    echo "$admin_response" >> $OUTPUT_FILE
    exit 1
fi
echo "" >> $OUTPUT_FILE

# Test ECTA login
echo "1.2 Testing ECTA Admin Login..." >> $OUTPUT_FILE
ecta_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"ecta_admin","password":"password123"}' 2>&1)

if echo "$ecta_response" | grep -q '"token"'; then
    ECTA_TOKEN=$(echo "$ecta_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ ECTA Admin Login Successful" >> $OUTPUT_FILE
else
    echo "❌ ECTA Admin Login Failed" >> $OUTPUT_FILE
fi
echo "" >> $OUTPUT_FILE

# Test Bank login
echo "1.3 Testing Bank Admin Login..." >> $OUTPUT_FILE
bank_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"bank_admin","password":"password123"}' 2>&1)

if echo "$bank_response" | grep -q '"token"'; then
    BANK_TOKEN=$(echo "$bank_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Bank Admin Login Successful" >> $OUTPUT_FILE
else
    echo "❌ Bank Admin Login Failed" >> $OUTPUT_FILE
fi
echo "" >> $OUTPUT_FILE

# Test NBE login
echo "1.4 Testing NBE Admin Login..." >> $OUTPUT_FILE
nbe_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"nbe_admin","password":"password123"}' 2>&1)

if echo "$nbe_response" | grep -q '"token"'; then
    NBE_TOKEN=$(echo "$nbe_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ NBE Admin Login Successful" >> $OUTPUT_FILE
else
    echo "❌ NBE Admin Login Failed" >> $OUTPUT_FILE
fi
echo "" >> $OUTPUT_FILE

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 2: BLOCKCHAIN HEALTH CHECK" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Blockchain Network Status" "GET" "/blockchain/network" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 3: ECTA PORTAL TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get All Contracts" "GET" "/contracts?limit=10" "$ECTA_TOKEN" ""
test_endpoint "Get Contract Statistics" "GET" "/contracts/statistics" "$ECTA_TOKEN" ""

# Create a test contract
CONTRACT_DATA='{
  "exporterId": "EXP001",
  "contractNumber": "TEST-CONTRACT-'$(date +%s)'",
  "buyerName": "Test Buyer Corp",
  "buyerCountry": "USA",
  "coffeeType": "Arabica",
  "quantity": 1000,
  "pricePerKg": 5.50,
  "totalValue": 5500,
  "currency": "USD",
  "deliveryTerms": "FOB"
}'

test_endpoint "Create Sales Contract (Blockchain)" "POST" "/contracts" "$ECTA_TOKEN" "$CONTRACT_DATA"

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 4: ECX PORTAL TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get ECX Lots" "GET" "/ecx/lots?limit=10" "$ADMIN_TOKEN" ""
test_endpoint "Get ECX Statistics" "GET" "/ecx/statistics" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 5: BANKS PORTAL TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Letters of Credit" "GET" "/letters-of-credit?limit=10" "$BANK_TOKEN" ""
test_endpoint "Get LC Statistics" "GET" "/letters-of-credit/statistics" "$BANK_TOKEN" ""

# Create a test LC
LC_DATA='{
  "lcNumber": "LC-TEST-'$(date +%s)'",
  "contractId": "CONTRACT001",
  "exporterId": "EXP001",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": 10000,
  "currency": "USD",
  "issueDate": "'$(date +%Y-%m-%d)'",
  "expiryDate": "'$(date -d "+90 days" +%Y-%m-%d)'",
  "status": "pending_review"
}'

test_endpoint "Create Letter of Credit (Blockchain)" "POST" "/letters-of-credit" "$BANK_TOKEN" "$LC_DATA"

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 6: NBE PORTAL TESTS (FOREX)" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Forex Applications" "GET" "/forex?limit=10" "$NBE_TOKEN" ""
test_endpoint "Get Forex Statistics" "GET" "/forex/statistics" "$NBE_TOKEN" ""

# Create a test forex application
FOREX_DATA='{
  "exporterId": "EXP001",
  "contractId": "CONTRACT001",
  "applicationNumber": "FOREX-TEST-'$(date +%s)'",
  "requestedAmount": 10000,
  "currency": "USD",
  "purpose": "Coffee Export Payment",
  "status": "pending"
}'

test_endpoint "Create Forex Application (Blockchain)" "POST" "/forex" "$NBE_TOKEN" "$FOREX_DATA"

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 7: CUSTOMS PORTAL TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Customs Declarations" "GET" "/customs?limit=10" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 8: SHIPPING PORTAL TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Shipments" "GET" "/shipments?limit=10" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 9: QUALITY INSPECTION TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Quality Inspections" "GET" "/quality/inspections?limit=10" "$ECTA_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 10: EXPORTER MANAGEMENT TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Exporters List" "GET" "/exporters?limit=10" "$ADMIN_TOKEN" ""
test_endpoint "Get Exporter Applications" "GET" "/exporters/exporter-applications?status=pending" "$ECTA_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 11: DOCUMENT MANAGEMENT TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Documents" "GET" "/documents?limit=10" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 12: AUDIT & TRACEABILITY TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Audit Logs" "GET" "/audit/portal/recent?limit=10" "$ADMIN_TOKEN" ""
test_endpoint "Get System Statistics" "GET" "/traceability/system/statistics" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "STEP 13: USER MANAGEMENT TESTS" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

test_endpoint "Get Users List" "GET" "/users?limit=10" "$ADMIN_TOKEN" ""

echo "=====================================================================" >> $OUTPUT_FILE
echo "TEST SUMMARY" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Count results
total_tests=$(grep -c "Testing:" $OUTPUT_FILE)
successful=$(grep -c "✅" $OUTPUT_FILE)
failed=$(grep -c "❌" $OUTPUT_FILE)

echo "Total Tests: $total_tests" >> $OUTPUT_FILE
echo "Successful: $successful" >> $OUTPUT_FILE
echo "Failed: $failed" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "Test completed at: $(date)" >> $OUTPUT_FILE
echo "=====================================================================" >> $OUTPUT_FILE

# Display results
cat $OUTPUT_FILE
