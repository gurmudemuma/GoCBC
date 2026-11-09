#!/bin/bash

# Correct Portal Test - Uses actual portal dashboard architecture
# Each portal has ONE endpoint that returns ALL tab data

set -e

API_BASE="http://localhost:5000/api/v1"
TEST_OUTPUT="/tmp/correct-portal-test.txt"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "════════════════════════════════════════════════════════════════" | tee $TEST_OUTPUT
echo "🔄 CORRECT PORTAL TEST - Dashboard Architecture" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

PASS_COUNT=0
FAIL_COUNT=0

log_pass() {
    echo "   ✅ $1" | tee -a $TEST_OUTPUT
    PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
    echo "   ❌ $1" | tee -a $TEST_OUTPUT
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_info() {
    echo "   ℹ️  $1" | tee -a $TEST_OUTPUT
}

# Login
echo "🔐 Logging in..." | tee -a $TEST_OUTPUT
TOKEN_ECTA=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_ECX=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"ecx_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_BANK=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_NBE=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_CUSTOMS=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_SHIPPING=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')

echo "" | tee -a $TEST_OUTPUT

# Test each portal dashboard
echo "📋 TESTING PORTAL DASHBOARDS" | tee -a $TEST_OUTPUT
echo "────────────────────────────────────────────────────────────────" | tee -a $TEST_OUTPUT

# 1. ECTA Portal
echo "" | tee -a $TEST_OUTPUT
echo "1️⃣  ECTA PORTAL" | tee -a $TEST_OUTPUT
ECTA_DASH=$(curl -s -H "Authorization: Bearer $TOKEN_ECTA" "${API_BASE}/portals/ecta")
if echo "$ECTA_DASH" | jq -e '.success' > /dev/null 2>&1; then
    PENDING_APPS=$(echo "$ECTA_DASH" | jq -r '.data.pendingApplications | length // 0')
    APPROVED=$(echo "$ECTA_DASH" | jq -r '.data.stats.approvedApplications // 0')
    log_pass "ECTA Dashboard loaded"
    log_info "Pending Applications: $PENDING_APPS"
    log_info "Approved Exporters: $APPROVED"
else
    log_fail "ECTA Dashboard failed to load"
fi

# 2. ECX Portal
echo "" | tee -a $TEST_OUTPUT
echo "2️⃣  ECX PORTAL" | tee -a $TEST_OUTPUT
ECX_DASH=$(curl -s -H "Authorization: Bearer $TOKEN_ECX" "${API_BASE}/portals/ecx")
if echo "$ECX_DASH" | jq -e '.success' > /dev/null 2>&1; then
    ACTIVE_CONTRACTS=$(echo "$ECX_DASH" | jq -r '.data.activeContracts | length // 0')
    TOTAL_CONTRACTS=$(echo "$ECX_DASH" | jq -r '.data.stats.totalContracts // 0')
    log_pass "ECX Dashboard loaded"
    log_info "Active Contracts: $ACTIVE_CONTRACTS"
    log_info "Total Contracts: $TOTAL_CONTRACTS"
else
    log_fail "ECX Dashboard failed to load"
fi

# 3. Banking Portal
echo "" | tee -a $TEST_OUTPUT
echo "3️⃣  BANKING PORTAL" | tee -a $TEST_OUTPUT
BANK_DASH=$(curl -s -H "Authorization: Bearer $TOKEN_BANK" "${API_BASE}/portals/banks")
if echo "$BANK_DASH" | jq -e '.success' > /dev/null 2>&1; then
    ACTIVE_LCS=$(echo "$BANK_DASH" | jq -r '.data.activeLCs | length // 0')
    PENDING_LCS=$(echo "$BANK_DASH" | jq -r '.data.pendingLCRequests | length // 0')
    log_pass "Banking Dashboard loaded"
    log_info "Active LCs: $ACTIVE_LCS"
    log_info "Pending LC Requests: $PENDING_LCS"
else
    log_fail "Banking Dashboard failed to load"
fi

# 4. NBE Portal
echo "" | tee -a $TEST_OUTPUT
echo "4️⃣  NBE PORTAL" | tee -a $TEST_OUTPUT
NBE_DASH=$(curl -s -H "Authorization: Bearer $TOKEN_NBE" "${API_BASE}/portals/nbe")
if echo "$NBE_DASH" | jq -e '.success' > /dev/null 2>&1; then
    FOREX_MONITORING=$(echo "$NBE_DASH" | jq -r '.data.forexMonitoring | length // 0')
    LC_MONITORING=$(echo "$NBE_DASH" | jq -r '.data.stats.activeLCs // 0')
    log_pass "NBE Dashboard loaded"
    log_info "Forex Monitoring: $FOREX_MONITORING"
    log_info "LC Monitoring: $LC_MONITORING"
else
    log_fail "NBE Dashboard failed to load"
fi

# 5. Customs Portal
echo "" | tee -a $TEST_OUTPUT
echo "5️⃣  CUSTOMS PORTAL" | tee -a $TEST_OUTPUT
CUSTOMS_DASH=$(curl -s -H "Authorization: Bearer $TOKEN_CUSTOMS" "${API_BASE}/portals/customs")
if echo "$CUSTOMS_DASH" | jq -e '.success' > /dev/null 2>&1; then
    PENDING_DECL=$(echo "$CUSTOMS_DASH" | jq -r '.data.pendingDeclarations | length // 0')
    INSPECTION_QUEUE=$(echo "$CUSTOMS_DASH" | jq -r '.data.inspectionQueue | length // 0')
    log_pass "Customs Dashboard loaded"
    log_info "Pending Declarations: $PENDING_DECL"
    log_info "Inspection Queue: $INSPECTION_QUEUE"
else
    log_fail "Customs Dashboard failed to load"
fi

# 6. Shipping Portal
echo "" | tee -a $TEST_OUTPUT
echo "6️⃣  SHIPPING PORTAL" | tee -a $TEST_OUTPUT
SHIPPING_DASH=$(curl -s -H "Authorization: Bearer $TOKEN_SHIPPING" "${API_BASE}/portals/shipping")
if echo "$SHIPPING_DASH" | jq -e '.success' > /dev/null 2>&1; then
    ACTIVE_SHIPMENTS=$(echo "$SHIPPING_DASH" | jq -r '.data.activeShipments | length // 0')
    IN_TRANSIT=$(echo "$SHIPPING_DASH" | jq -r '.data.inTransitShipments | length // 0')
    log_pass "Shipping Dashboard loaded"
    log_info "Active Shipments: $ACTIVE_SHIPMENTS"
    log_info "In Transit: $IN_TRANSIT"
else
    log_fail "Shipping Dashboard failed to load"
fi

# Summary
echo "" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "📊 SUMMARY" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT
echo "✅ Passed: $PASS_COUNT" | tee -a $TEST_OUTPUT
echo "❌ Failed: $FAIL_COUNT" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 ALL PORTAL DASHBOARDS WORKING!" | tee -a $TEST_OUTPUT
else
    echo "⚠️  Some portals failed" | tee -a $TEST_OUTPUT
fi

exit $FAIL_COUNT
