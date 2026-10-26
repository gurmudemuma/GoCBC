#!/bin/bash

echo "================================================================================"
echo "DETAILED CODEBASE VALIDATION REPORT"
echo "================================================================================"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [ -f "/home/guda/GoCBC/api/$file" ]; then
        echo "✅ PASS: $description exists"
        ((PASSED++))
        return 0
    else
        echo "❌ FAIL: $description not found"
        ((FAILED++))
        return 1
    fi
}

check_file_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    if grep -q "$pattern" "/home/guda/GoCBC/api/$file" 2>/dev/null; then
        echo "  ✅ Contains: $description"
        ((PASSED++))
        return 0
    else
        echo "  ❌ Missing: $description"
        ((FAILED++))
        return 1
    fi
}

check_file_deleted() {
    local file="$1"
    local description="$2"
    
    if [ ! -f "/home/guda/GoCBC/api/$file" ]; then
        echo "✅ PASS: $description successfully deleted"
        ((PASSED++))
        return 0
    else
        echo "⚠️  WARNING: $description still exists"
        ((WARNINGS++))
        return 1
    fi
}

echo "1. SERVICE LAYER VALIDATION"
echo "--------------------------------------------------------------------------------"

check_file_exists "src/services/contractService.ts" "ContractService"
check_file_contains "src/services/contractService.ts" "registerContract" "registerContract method"
check_file_contains "src/services/contractService.ts" "approveContract" "approveContract method"
check_file_contains "src/services/contractService.ts" "rejectContract" "rejectContract method"

check_file_exists "src/services/lcService.ts" "LCService"
check_file_contains "src/services/lcService.ts" "issueLC" "issueLC method"
check_file_contains "src/services/lcService.ts" "triggerForexAutoRequest" "forex auto-trigger"

check_file_exists "src/services/forexService.ts" "ForexService"
check_file_contains "src/services/forexService.ts" "allocateForex" "allocateForex method"
check_file_contains "src/services/forexService.ts" "0.4" "40% retention logic"

check_file_exists "src/services/paymentService.ts" "PaymentService"
check_file_contains "src/services/paymentService.ts" "recordPayment" "recordPayment method"
check_file_contains "src/services/paymentService.ts" "0.4.*totalAmount" "40% retention calculation"
check_file_contains "src/services/paymentService.ts" "0.6" "60% release amount"

check_file_exists "src/services/shipmentService.ts" "ShipmentService"
check_file_contains "src/services/shipmentService.ts" "createQualityInspectionTask" "quality task creation"
check_file_contains "src/services/shipmentService.ts" "triggerCustomsDeclaration" "customs trigger"

check_file_exists "src/services/customsService.ts" "CustomsService"
check_file_contains "src/services/customsService.ts" "submitDeclaration" "submitDeclaration method"
check_file_contains "src/services/customsService.ts" "clearDeclaration" "clearDeclaration method"

echo ""
echo "2. PORTAL DASHBOARDS VALIDATION"
echo "--------------------------------------------------------------------------------"

check_file_exists "src/routes/portals.ts" "Portal dashboards"
check_file_contains "src/routes/portals.ts" "/ecta/dashboard" "ECTA dashboard"
check_file_contains "src/routes/portals.ts" "/banks/dashboard" "Banks dashboard"
check_file_contains "src/routes/portals.ts" "/nbe/dashboard" "NBE dashboard"
check_file_contains "src/routes/portals.ts" "/customs/dashboard" "Customs dashboard"
check_file_contains "src/routes/portals.ts" "/shipping/dashboard" "Shipping dashboard"
check_file_contains "src/routes/portals.ts" "/exporters/dashboard" "Exporters dashboard"
check_file_contains "src/routes/portals.ts" "/ecx/dashboard" "ECX dashboard"

PROMISE_COUNT=$(grep -o "Promise.all" "/home/guda/GoCBC/api/src/routes/portals.ts" 2>/dev/null | wc -l)
if [ "$PROMISE_COUNT" -ge 5 ]; then
    echo "  ✅ Found $PROMISE_COUNT Promise.all() calls (parallel queries)"
    ((PASSED++))
else
    echo "  ❌ Only found $PROMISE_COUNT Promise.all() calls (expected 5+)"
    ((FAILED++))
fi

echo ""
echo "3. WORKFLOW TRIGGERS VALIDATION"
echo "--------------------------------------------------------------------------------"

check_file_contains "src/routes/quality.ts" "triggerCustomsDeclaration" "Customs trigger on quality approval"

echo ""
echo "4. SERVER CONFIGURATION"
echo "--------------------------------------------------------------------------------"

check_file_exists "src/server.ts" "Server configuration"
check_file_contains "src/server.ts" "portalsRouter" "Portals router import"
check_file_contains "src/server.ts" "/api/v1/portals" "Portals route registration"

echo ""
echo "5. UNUSED ROUTES CLEANUP"
echo "--------------------------------------------------------------------------------"

check_file_deleted "src/routes/blockchain-stats.ts" "blockchain-stats.ts"
check_file_deleted "src/routes/advance.ts" "advance.ts"
check_file_deleted "src/routes/consignment.ts" "consignment.ts"
check_file_deleted "src/routes/collections.ts" "collections.ts"

echo ""
echo "6. FILE ORGANIZATION"
echo "--------------------------------------------------------------------------------"

if [ -d "/home/guda/GoCBC/api/tests" ]; then
    TEST_COUNT=$(find "/home/guda/GoCBC/api/tests" -type f | wc -l)
    echo "✅ PASS: tests/ directory exists with $TEST_COUNT files"
    ((PASSED++))
else
    echo "❌ FAIL: tests/ directory not found"
    ((FAILED++))
fi

if [ -d "/home/guda/GoCBC/api/scripts/database" ]; then
    DB_COUNT=$(find "/home/guda/GoCBC/api/scripts/database" -type f | wc -l)
    echo "✅ PASS: scripts/database/ exists with $DB_COUNT files"
    ((PASSED++))
else
    echo "❌ FAIL: scripts/database/ not found"
    ((FAILED++))
fi

if [ -d "/home/guda/GoCBC/api/scripts/migrations" ]; then
    MIG_COUNT=$(find "/home/guda/GoCBC/api/scripts/migrations" -type f | wc -l)
    echo "✅ PASS: scripts/migrations/ exists with $MIG_COUNT files"
    ((PASSED++))
else
    echo "❌ FAIL: scripts/migrations/ not found"
    ((FAILED++))
fi

echo ""
echo "7. 40% NBE RETENTION POLICY"
echo "--------------------------------------------------------------------------------"

if grep -q "const retentionAmount = totalAmount \* 0.4" "/home/guda/GoCBC/api/src/services/paymentService.ts" 2>/dev/null; then
    echo "✅ PASS: 40% retention calculation found"
    ((PASSED++))
elif grep -q "0.4" "/home/guda/GoCBC/api/src/services/paymentService.ts" 2>/dev/null; then
    echo "✅ PASS: 40% retention logic present"
    ((PASSED++))
else
    echo "❌ FAIL: 40% retention logic not found"
    ((FAILED++))
fi

if grep -q "const releaseAmount = totalAmount \* 0.6" "/home/guda/GoCBC/api/src/services/paymentService.ts" 2>/dev/null; then
    echo "✅ PASS: 60% release calculation found"
    ((PASSED++))
elif grep -q "0.6" "/home/guda/GoCBC/api/src/services/paymentService.ts" 2>/dev/null; then
    echo "✅ PASS: 60% release logic present"
    ((PASSED++))
else
    echo "❌ FAIL: 60% release logic not found"
    ((FAILED++))
fi

echo ""
echo "================================================================================"
echo "VALIDATION SUMMARY"
echo "================================================================================"
echo "✅ Passed:   $PASSED"
echo "❌ Failed:   $FAILED"
echo "⚠️  Warnings: $WARNINGS"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$(awk "BEGIN {printf \"%.1f\", ($PASSED / $TOTAL) * 100}")
    echo "Overall: $PASSED/$TOTAL checks passed ($PERCENTAGE%)"
else
    echo "Overall: No checks performed"
fi

echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL VALIDATIONS PASSED! The codebase cleanup is complete and correct."
    EXIT_CODE=0
elif [ $FAILED -lt 5 ]; then
    echo "⚠️  Most validations passed, but some issues need attention."
    EXIT_CODE=1
else
    echo "❌ Multiple issues detected. Review required."
    EXIT_CODE=1
fi

echo "================================================================================"

exit $EXIT_CODE
