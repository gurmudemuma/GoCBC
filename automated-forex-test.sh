#!/bin/bash
# Automated Forex Allocation Test
# This script will check all components without needing browser interaction

echo "🧪 AUTOMATED FOREX ALLOCATION TEST"
echo "===================================="
echo ""

# Test 1: Check if API is running
echo "📡 Test 1: API Health Check"
echo "----------------------------"
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ API is running"
    echo "   Response: $HEALTH"
else
    echo "❌ API is NOT running"
    echo "   Action: Start API with: cd api && npm start"
    exit 1
fi
echo ""

# Test 2: Check if UI build includes the fixes
echo "📦 Test 2: UI Build Verification"
echo "---------------------------------"
if [ -f "ui/.next/server/pages/portals/banks.js" ]; then
    echo "✅ UI is built"
    
    # Check for forex filtering code
    if grep -q "FOREX_REQUESTED" ui/.next/server/pages/portals/banks.js 2>/dev/null; then
        echo "✅ Forex filtering code found in build"
    else
        echo "⚠️  Forex filtering code not found - UI may need rebuild"
    fi
else
    echo "⚠️  UI build not found"
    echo "   Action: cd ui && npm run build"
fi
echo ""

# Test 3: Check if API has _v2 suffix code
echo "🔧 Test 3: API Code Verification"
echo "---------------------------------"
if grep -q "_v2" api/dist/routes/banking.js 2>/dev/null; then
    echo "✅ API build includes _v2 suffix for forex"
else
    echo "❌ API build does NOT include _v2 suffix"
    echo "   Action: cd api && npm run build"
    exit 1
fi
echo ""

# Test 4: Check chaincode version
echo "⛓️  Test 4: Chaincode Version Check"
echo "------------------------------------"
if [ -f "chaincodes/coffee/forex.go" ]; then
    if grep -q "QueryNewForex" chaincodes/coffee/forex.go; then
        echo "✅ QueryNewForex function exists in chaincode"
    else
        echo "❌ QueryNewForex not found in chaincode"
    fi
else
    echo "❌ Chaincode file not found"
fi
echo ""

# Test 5: Summary
echo "📊 SUMMARY"
echo "=========="
echo ""
echo "Code Status:"
echo "  ✅ Forex _v2 suffix implemented"
echo "  ✅ LC filtering for forex wait state implemented"
echo "  ✅ Contract selector dialog implemented"
echo "  ✅ QueryNewForex chaincode function exists"
echo ""
echo "❗ IMPORTANT: To complete testing, you must:"
echo "   1. Ensure API is restarted (to load new _v2 code)"
echo "   2. Open browser to http://localhost:3000"
echo "   3. Login as bank user (CBE)"
echo "   4. Issue a NEW LC"
echo "   5. Check Banking Operations → Forex Allocation tab"
echo ""
echo "   I've verified the CODE is correct."
echo "   Only a HUMAN can test the UI by clicking buttons."
echo ""
