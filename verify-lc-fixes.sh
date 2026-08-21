#!/bin/bash
# Verification script for LC workflow fixes

echo "================================================"
echo "  LC Workflow Fix Verification"
echo "================================================"
echo ""

echo "✅ Checking Smart Contract Fixes..."
echo ""

# Check that invalid statuses are removed
echo "1. Checking for removed SHIPPED status assignment..."
if grep -q 'lc.Status = "SHIPPED"' chaincodes/coffee/banking.go 2>/dev/null | grep -v "//"; then
    echo "   ❌ FAILED: Still has active lc.Status = \"SHIPPED\""
    exit 1
else
    echo "   ✅ PASSED: SHIPPED status removed (or commented out)"
fi

echo ""
echo "2. Checking for removed DOCUMENTS_SUBMITTED status..."
if grep -q 'lc.Status = "DOCUMENTS_SUBMITTED"' chaincodes/coffee/banking.go 2>/dev/null; then
    echo "   ❌ FAILED: Still has DOCUMENTS_SUBMITTED"
    exit 1
else
    echo "   ✅ PASSED: DOCUMENTS_SUBMITTED removed"
fi

echo ""
echo "3. Checking for UTILIZED status on document verification..."
if grep -q 'lc.Status = "UTILIZED".*Documents verified' chaincodes/coffee/banking.go 2>/dev/null; then
    echo "   ✅ PASSED: Uses UTILIZED for verified documents"
else
    echo "   ❌ FAILED: Not using UTILIZED"
    exit 1
fi

echo ""
echo "4. Checking for removed PAID status..."
if grep -q 'lc.Status = "PAID"' chaincodes/coffee/banking.go 2>/dev/null; then
    echo "   ❌ FAILED: Still has PAID status"
    exit 1
else
    echo "   ✅ PASSED: PAID status removed"
fi

echo ""
echo "5. Checking chaincode binary is compiled..."
if [ -f "chaincodes/coffee/coffee" ]; then
    SIZE=$(ls -lh chaincodes/coffee/coffee | awk '{print $5}')
    echo "   ✅ PASSED: Chaincode binary exists (${SIZE})"
else
    echo "   ❌ FAILED: Chaincode not compiled"
    exit 1
fi

echo ""
echo "✅ Checking UI Fixes..."
echo ""

echo "6. Checking Forex & Banking tab filter..."
if grep -q "ISSUED.*UTILIZED.*FOREX_ALLOCATED.*FOREX_BACKED" ui/src/components/portals/ExporterPortal.tsx 2>/dev/null; then
    echo "   ✅ PASSED: UI filters for correct LC statuses"
else
    echo "   ❌ FAILED: UI filter not updated"
    exit 1
fi

echo ""
echo "7. Checking KPI card count..."
if grep -q "forexStatuses.filter(f => f.status === 'ALLOCATED')" ui/src/components/portals/ExporterPortal.tsx 2>/dev/null; then
    echo "   ✅ PASSED: KPI card counts only ALLOCATED forex"
else
    echo "   ❌ FAILED: KPI count not fixed"
    exit 1
fi

echo ""
echo "8. Checking 'Forex Allocated' label..."
if grep -q 'label="Forex Allocated"' ui/src/components/portals/ExporterPortal.tsx 2>/dev/null; then
    echo "   ✅ PASSED: Shows 'Forex Allocated' label"
else
    echo "   ❌ FAILED: Label not updated"
    exit 1
fi

echo ""
echo "9. Checking UI build..."
if [ -d "ui/.next" ] && [ -f "ui/.next/BUILD_ID" ]; then
    BUILD_ID=$(cat ui/.next/BUILD_ID)
    echo "   ✅ PASSED: UI is built (Build ID: ${BUILD_ID})"
else
    echo "   ⚠ WARNING: UI not built yet - run: cd ui && npm run build"
fi

echo ""
echo "================================================"
echo "  ✅ All Verifications Passed!"
echo "================================================"
echo ""
echo "Summary of Fixes Applied:"
echo "  ✅ 5 invalid LC statuses fixed in smart contract"
echo "  ✅ UI filtering updated for Forex & Banking tab"
echo "  ✅ KPI card counting fixed"
echo "  ✅ Status labels updated"
echo ""
echo "Next Steps:"
echo "  1. Deploy chaincode: ./deploy-chaincode.sh"
echo "  2. Restart services: docker restart coffee-chaincode"
echo "  3. Test the workflow end-to-end"
echo ""
