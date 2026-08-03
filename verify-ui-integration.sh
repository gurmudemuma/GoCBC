#!/bin/bash

# CECBS UI Integration Verification Script
# Tests that blockchain identity management UI is properly integrated

echo "============================================"
echo "🔍 CECBS UI Integration Verification"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# ============================================
# 1. Check Files Exist
# ============================================
echo "1. Checking files exist..."

if [ -f "ui/src/components/admin/BlockchainIdentityPanel.tsx" ]; then
    check_pass "BlockchainIdentityPanel.tsx exists"
else
    check_fail "BlockchainIdentityPanel.tsx NOT FOUND"
fi

if [ -f "ui/src/components/admin/UserManagement.tsx" ]; then
    check_pass "UserManagement.tsx exists"
else
    check_fail "UserManagement.tsx NOT FOUND"
fi

echo ""

# ============================================
# 2. Check Component Integration
# ============================================
echo "2. Checking component integration..."

# Check if BlockchainIdentityPanel is imported in UserManagement
if grep -q "import BlockchainIdentityPanel from './BlockchainIdentityPanel'" ui/src/components/admin/UserManagement.tsx; then
    check_pass "BlockchainIdentityPanel imported in UserManagement"
else
    check_fail "BlockchainIdentityPanel NOT imported"
fi

# Check if BlockchainIdentityPanel is used in UserManagement
if grep -q "<BlockchainIdentityPanel" ui/src/components/admin/UserManagement.tsx; then
    check_pass "BlockchainIdentityPanel component used in render"
else
    check_fail "BlockchainIdentityPanel NOT used in render"
fi

# Check if Tabs are imported
if grep -q "Tabs," ui/src/components/admin/UserManagement.tsx && grep -q "'@mui/material'" ui/src/components/admin/UserManagement.tsx; then
    check_pass "Tabs imported from Material-UI"
else
    check_fail "Tabs NOT imported"
fi

# Check if TabPanel component is defined
if grep -q "const TabPanel.*React.FC.*TabPanelProps" ui/src/components/admin/UserManagement.tsx; then
    check_pass "TabPanel component defined"
else
    check_fail "TabPanel component NOT defined"
fi

# Check if detailsTab state is defined
if grep -q "detailsTab.*useState" ui/src/components/admin/UserManagement.tsx; then
    check_pass "detailsTab state defined"
else
    check_fail "detailsTab state NOT defined"
fi

echo ""

# ============================================
# 3. Check API Integration
# ============================================
echo "3. Checking API integration..."

# Check BlockchainIdentityPanel API calls
if grep -q "api.get.*crypto-users.*identity" ui/src/components/admin/BlockchainIdentityPanel.tsx; then
    check_pass "GET identity endpoint used"
else
    check_fail "GET identity endpoint NOT found"
fi

if grep -q "api.post.*crypto-users/enroll" ui/src/components/admin/BlockchainIdentityPanel.tsx; then
    check_pass "POST enroll endpoint used"
else
    check_fail "POST enroll endpoint NOT found"
fi

if grep -q "api.post.*revoke" ui/src/components/admin/BlockchainIdentityPanel.tsx; then
    check_pass "POST revoke endpoint used"
else
    check_fail "POST revoke endpoint NOT found"
fi

if grep -q "api.post.*renew-certificate" ui/src/components/admin/BlockchainIdentityPanel.tsx; then
    check_pass "POST renew certificate endpoint used"
else
    check_fail "POST renew certificate endpoint NOT found"
fi

echo ""

# ============================================
# 4. Check Backend API Routes
# ============================================
echo "4. Checking backend API routes..."

if [ -f "api/src/routes/crypto-users.ts" ]; then
    check_pass "crypto-users.ts route file exists"
    
    # Check endpoints
    if grep -q "router.get.*/:userId/identity" api/src/routes/crypto-users.ts; then
        check_pass "GET /:userId/identity endpoint defined"
    else
        check_fail "GET /:userId/identity endpoint NOT defined"
    fi
    
    if grep -q "router.post.*/enroll" api/src/routes/crypto-users.ts; then
        check_pass "POST /enroll endpoint defined"
    else
        check_fail "POST /enroll endpoint NOT defined"
    fi
    
    if grep -q "router.post.*/:userId/revoke" api/src/routes/crypto-users.ts; then
        check_pass "POST /:userId/revoke endpoint defined"
    else
        check_fail "POST /:userId/revoke endpoint NOT defined"
    fi
    
    if grep -q "router.post.*/:userId/renew-certificate" api/src/routes/crypto-users.ts; then
        check_pass "POST /:userId/renew-certificate endpoint defined"
    else
        check_fail "POST /:userId/renew-certificate endpoint NOT defined"
    fi
else
    check_fail "crypto-users.ts route file NOT FOUND"
fi

echo ""

# ============================================
# 5. Check TypeScript Compilation (if tsc available)
# ============================================
echo "5. Checking TypeScript compilation..."

if command -v tsc &> /dev/null; then
    cd ui
    if tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
        check_fail "TypeScript compilation has errors"
    else
        check_pass "TypeScript compiles successfully"
    fi
    cd ..
else
    check_warn "TypeScript compiler not found (skipping)"
fi

echo ""

# ============================================
# 6. Check Documentation
# ============================================
echo "6. Checking documentation..."

if [ -f "UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md" ]; then
    check_pass "UI integration documentation exists"
else
    check_fail "UI integration documentation NOT FOUND"
fi

if [ -f "UI-INTEGRATION-GUIDE.md" ]; then
    check_pass "UI integration guide exists"
else
    check_fail "UI integration guide NOT FOUND"
fi

if [ -f "PORTAL-ADMIN-FULL-CONTROL.md" ]; then
    check_pass "Portal admin documentation exists"
else
    check_fail "Portal admin documentation NOT FOUND"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "============================================"
echo "📊 Verification Summary"
echo "============================================"
echo ""
echo "Checks Passed: ${CHECKS_PASSED}"
echo "Checks Failed: ${CHECKS_FAILED}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "🎉 UI integration is COMPLETE and ready!"
    echo ""
    echo "Next steps:"
    echo "  1. cd ui && npm install"
    echo "  2. npm start"
    echo "  3. Open http://localhost:3000"
    echo "  4. Login as admin and test User Management"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the failed checks before proceeding."
    echo ""
    exit 1
fi

