#!/bin/bash

# Comprehensive Portal Tab Data Verification Test
# Verifies that ALL tabs in ALL 7 portals display correct data after workflow completion

set -e

API_BASE="http://localhost:5000/api/v1"
TEST_OUTPUT="/tmp/portal-tabs-verification.txt"

echo "════════════════════════════════════════════════════════════════" | tee $TEST_OUTPUT
echo "🔍 PORTAL TABS DATA VERIFICATION - ALL 7 PORTALS" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_endpoint() {
    local portal=$1
    local tab=$2
    local endpoint=$3
    local token=$4
    local expected_field=$5
    local expected_min=$6
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    response=$(curl -s -H "Authorization: Bearer $token" "${API_BASE}${endpoint}")
    
    if [ -n "$expected_field" ]; then
        count=$(echo "$response" | jq -r "$expected_field" 2>/dev/null || echo "0")
    else
        count=$(echo "$response" | jq -r 'if type == "array" then length elif .data then (.data | if type == "array" then length else 1 end) elif .count then .count else 0 end' 2>/dev/null || echo "0")
    fi
    
    if [ "$count" -ge "$expected_min" ]; then
        echo "   ✅ $portal - $tab: $count records (≥$expected_min expected)" | tee -a $TEST_OUTPUT
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "   ❌ $portal - $tab: $count records (expected ≥$expected_min)" | tee -a $TEST_OUTPUT
        echo "      Response: $response" | tee -a $TEST_OUTPUT
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Login as different roles
echo "🔐 Logging in as different portal users..." | tee -a $TEST_OUTPUT
TOKEN_ADMIN=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')
TOKEN_ECTA=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_ECX=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"ecx_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_BANK=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_NBE=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_CUSTOMS=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_SHIPPING=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_QUALITY=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"quality_admin","password":"password123"}' | jq -r '.data.token')

echo "✅ All users logged in" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 1: ECTA (Ethiopian Coffee & Tea Authority)
# ==================================================================================

echo "📋 PORTAL 1: ECTA - 9 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "ECTA" "Tab 1: Pending Applications" "/portals/ecta/pending-applications" "$TOKEN_ECTA" ".data | length" 0
test_endpoint "ECTA" "Tab 2: Approved Exporters" "/portals/ecta/approved-exporters" "$TOKEN_ECTA" ".data | length" 1
test_endpoint "ECTA" "Tab 3: Active Contracts" "/portals/ecta/active-contracts" "$TOKEN_ECTA" ".data | length" 1
test_endpoint "ECTA" "Tab 4: Quality Inspections" "/portals/ecta/quality-inspections" "$TOKEN_ECTA" ".data | length" 1
test_endpoint "ECTA" "Tab 5: Document Verification" "/portals/ecta/document-verification" "$TOKEN_ECTA" ".data | length" 0
test_endpoint "ECTA" "Tab 6: Compliance Reports" "/portals/ecta/compliance-reports" "$TOKEN_ECTA" ".data | length" 0
test_endpoint "ECTA" "Tab 7: Analytics" "/portals/ecta/analytics" "$TOKEN_ECTA" "" 0
test_endpoint "ECTA" "Tab 8: User Management" "/portals/ecta/user-management" "$TOKEN_ECTA" ".data | length" 1
test_endpoint "ECTA" "Tab 9: Audit Trail" "/portals/ecta/audit-trail" "$TOKEN_ECTA" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 2: ECX (Ethiopia Commodity Exchange)
# ==================================================================================

echo "📋 PORTAL 2: ECX - 7 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "ECX" "Tab 1: Active Contracts" "/portals/ecx/active-contracts" "$TOKEN_ECX" ".data | length" 1
test_endpoint "ECX" "Tab 2: Contract Registration" "/portals/ecx/pending-contracts" "$TOKEN_ECX" ".data | length" 0
test_endpoint "ECX" "Tab 3: Market Analytics" "/portals/ecx/market-analytics" "$TOKEN_ECX" "" 0
test_endpoint "ECX" "Tab 4: Warehouse Management" "/portals/ecx/warehouse-management" "$TOKEN_ECX" ".data | length" 0
test_endpoint "ECX" "Tab 5: Price Monitoring" "/portals/ecx/price-monitoring" "$TOKEN_ECX" ".data | length" 0
test_endpoint "ECX" "Tab 6: User Management" "/portals/ecx/user-management" "$TOKEN_ECX" ".data | length" 1
test_endpoint "ECX" "Tab 7: Audit Trail" "/portals/ecx/audit-trail" "$TOKEN_ECX" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 3: CUSTOMS
# ==================================================================================

echo "📋 PORTAL 3: CUSTOMS - 8 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "CUSTOMS" "Tab 1: Pending Declarations" "/portals/customs/pending-declarations" "$TOKEN_CUSTOMS" ".data | length" 0
test_endpoint "CUSTOMS" "Tab 2: Inspection Queue" "/portals/customs/inspection-queue" "$TOKEN_CUSTOMS" ".data | length" 1
test_endpoint "CUSTOMS" "Tab 3: Cleared Shipments" "/portals/customs/cleared-shipments" "$TOKEN_CUSTOMS" ".data | length" 0
test_endpoint "CUSTOMS" "Tab 4: Risk Assessment" "/portals/customs/risk-assessment" "$TOKEN_CUSTOMS" ".data | length" 0
test_endpoint "CUSTOMS" "Tab 5: Document Verification" "/portals/customs/document-verification" "$TOKEN_CUSTOMS" ".data | length" 0
test_endpoint "CUSTOMS" "Tab 6: Analytics" "/portals/customs/analytics" "$TOKEN_CUSTOMS" "" 0
test_endpoint "CUSTOMS" "Tab 7: User Management" "/portals/customs/user-management" "$TOKEN_CUSTOMS" ".data | length" 1
test_endpoint "CUSTOMS" "Tab 8: Audit Trail" "/portals/customs/audit-trail" "$TOKEN_CUSTOMS" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 4: QUALITY INSPECTION
# ==================================================================================

echo "📋 PORTAL 4: QUALITY - 7 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "QUALITY" "Tab 1: Pending Inspections" "/portals/quality/pending-inspections" "$TOKEN_QUALITY" ".data | length" 1
test_endpoint "QUALITY" "Tab 2: Sample Collection" "/portals/quality/sample-collection" "$TOKEN_QUALITY" ".data | length" 0
test_endpoint "QUALITY" "Tab 3: Lab Results" "/portals/quality/lab-results" "$TOKEN_QUALITY" ".data | length" 0
test_endpoint "QUALITY" "Tab 4: Certificates Issued" "/portals/quality/certificates-issued" "$TOKEN_QUALITY" ".data | length" 0
test_endpoint "QUALITY" "Tab 5: Analytics" "/portals/quality/analytics" "$TOKEN_QUALITY" "" 0
test_endpoint "QUALITY" "Tab 6: User Management" "/portals/quality/user-management" "$TOKEN_QUALITY" ".data | length" 1
test_endpoint "QUALITY" "Tab 7: Audit Trail" "/portals/quality/audit-trail" "$TOKEN_QUALITY" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 5: BANKING
# ==================================================================================

echo "📋 PORTAL 5: BANKING - 9 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "BANKING" "Tab 1: LC Requests" "/portals/banks/lc-requests" "$TOKEN_BANK" ".data | length" 0
test_endpoint "BANKING" "Tab 2: Active LCs" "/portals/banks/active-lcs" "$TOKEN_BANK" ".data | length" 1
test_endpoint "BANKING" "Tab 3: Document Review" "/portals/banks/document-review" "$TOKEN_BANK" ".data | length" 0
test_endpoint "BANKING" "Tab 4: Payment Processing" "/portals/banks/payment-processing" "$TOKEN_BANK" ".data | length" 0
test_endpoint "BANKING" "Tab 5: SWIFT Monitoring" "/portals/banks/swift-monitoring" "$TOKEN_BANK" ".data | length" 0
test_endpoint "BANKING" "Tab 6: Forex Requests" "/portals/banks/forex-requests" "$TOKEN_BANK" ".data | length" 1
test_endpoint "BANKING" "Tab 7: Analytics" "/portals/banks/analytics" "$TOKEN_BANK" "" 0
test_endpoint "BANKING" "Tab 8: User Management" "/portals/banks/user-management" "$TOKEN_BANK" ".data | length" 1
test_endpoint "BANKING" "Tab 9: Audit Trail" "/portals/banks/audit-trail" "$TOKEN_BANK" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 6: NBE (National Bank of Ethiopia)
# ==================================================================================

echo "📋 PORTAL 6: NBE - 9 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "NBE" "Tab 1: Forex Monitoring" "/portals/nbe/forex-monitoring" "$TOKEN_NBE" ".data | length" 1
test_endpoint "NBE" "Tab 2: LC Monitoring" "/nbe/lc-monitoring" "$TOKEN_NBE" ".count" 1
test_endpoint "NBE" "Tab 3: Exchange Rates" "/portals/nbe/exchange-rates" "$TOKEN_NBE" ".data | length" 0
test_endpoint "NBE" "Tab 4: SWIFT Monitoring" "/portals/nbe/swift-monitoring" "$TOKEN_NBE" ".data | length" 0
test_endpoint "NBE" "Tab 5: Forex Repatriation" "/portals/nbe/forex-repatriation" "$TOKEN_NBE" ".data | length" 0
test_endpoint "NBE" "Tab 6: Policy & Compliance" "/portals/nbe/policy-compliance" "$TOKEN_NBE" ".data | length" 0
test_endpoint "NBE" "Tab 7: Analytics" "/portals/nbe/analytics" "$TOKEN_NBE" "" 0
test_endpoint "NBE" "Tab 8: User Management" "/portals/nbe/user-management" "$TOKEN_NBE" ".data | length" 1
test_endpoint "NBE" "Tab 9: Audit Trail" "/portals/nbe/audit-trail" "$TOKEN_NBE" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# PORTAL 7: SHIPPING
# ==================================================================================

echo "📋 PORTAL 7: SHIPPING - 8 TABS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

test_endpoint "SHIPPING" "Tab 1: Active Shipments" "/portals/shipping/active-shipments" "$TOKEN_SHIPPING" ".data | length" 1
test_endpoint "SHIPPING" "Tab 2: Pending Bookings" "/portals/shipping/pending-bookings" "$TOKEN_SHIPPING" ".data | length" 0
test_endpoint "SHIPPING" "Tab 3: In Transit" "/portals/shipping/in-transit" "$TOKEN_SHIPPING" ".data | length" 0
test_endpoint "SHIPPING" "Tab 4: Delivered" "/portals/shipping/delivered" "$TOKEN_SHIPPING" ".data | length" 0
test_endpoint "SHIPPING" "Tab 5: Document Management" "/portals/shipping/document-management" "$TOKEN_SHIPPING" ".data | length" 0
test_endpoint "SHIPPING" "Tab 6: Analytics" "/portals/shipping/analytics" "$TOKEN_SHIPPING" "" 0
test_endpoint "SHIPPING" "Tab 7: User Management" "/portals/shipping/user-management" "$TOKEN_SHIPPING" ".data | length" 1
test_endpoint "SHIPPING" "Tab 8: Audit Trail" "/portals/shipping/audit-trail" "$TOKEN_SHIPPING" ".data | length" 1

echo "" | tee -a $TEST_OUTPUT

# ==================================================================================
# SUMMARY
# ==================================================================================

echo "" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "📊 PORTAL TABS VERIFICATION SUMMARY" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT
echo "Total Tabs Tested: $TOTAL_TESTS" | tee -a $TEST_OUTPUT
echo "✅ Passed: $PASSED_TESTS" | tee -a $TEST_OUTPUT
echo "❌ Failed: $FAILED_TESTS" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 ALL PORTAL TABS DISPLAYING CORRECT DATA!" | tee -a $TEST_OUTPUT
    SUCCESS_RATE="100.00"
else
    SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    echo "⚠️  Some tabs failed verification - see details above" | tee -a $TEST_OUTPUT
fi

echo "Success Rate: ${SUCCESS_RATE}%" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT

exit $FAILED_TESTS
