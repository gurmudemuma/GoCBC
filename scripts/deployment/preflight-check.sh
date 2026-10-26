#!/bin/bash

# CECBS Pre-Flight Checklist
# Verifies the system is ready for user management testing

echo "═══════════════════════════════════════════════════════════════════"
echo "  CECBS User Management System - Pre-Flight Checklist"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

ERRORS=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking Backend Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check routes
if [ -f "api/src/routes/users.ts" ]; then
    check_pass "User management routes exist"
else
    check_fail "User management routes NOT FOUND"
fi

if [ -f "api/src/routes/crypto-users.ts" ]; then
    check_pass "Crypto-users routes exist"
else
    check_fail "Crypto-users routes NOT FOUND"
fi

# Check services
if [ -f "api/src/services/cryptoUserService.ts" ]; then
    check_pass "Cryptographic service exists"
else
    check_fail "Cryptographic service NOT FOUND"
fi

# Check compiled files
if [ -f "api/dist/routes/users.js" ]; then
    check_pass "User routes compiled"
else
    check_fail "User routes NOT compiled - run: cd api && npm run build"
fi

if [ -f "api/dist/routes/crypto-users.js" ]; then
    check_pass "Crypto-users routes compiled"
else
    check_fail "Crypto-users routes NOT compiled - run: cd api && npm run build"
fi

if [ -f "api/dist/services/cryptoUserService.js" ]; then
    check_pass "Cryptographic service compiled"
else
    check_fail "Cryptographic service NOT compiled - run: cd api && npm run build"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Database Migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/migrate-user-management-postgres.sql" ]; then
    check_pass "User management migration exists"
    LINES=$(wc -l < scripts/migrate-user-management-postgres.sql)
    check_info "  Migration has $LINES lines"
else
    check_fail "User management migration NOT FOUND"
fi

if [ -f "scripts/add-blockchain-identities.sql" ]; then
    check_pass "Blockchain identities migration exists"
else
    check_fail "Blockchain identities migration NOT FOUND"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "api/.env" ]; then
    check_pass ".env file exists"
    
    if grep -q "DATABASE_URL" api/.env; then
        check_pass "DATABASE_URL configured"
        DB_URL=$(grep "DATABASE_URL" api/.env | cut -d'=' -f2)
        check_info "  $DB_URL"
    else
        check_warn "DATABASE_URL not set - will use SQLite"
    fi
    
    if grep -q "KEY_PASSPHRASE" api/.env; then
        check_pass "KEY_PASSPHRASE configured"
    else
        check_fail "KEY_PASSPHRASE not set - required for crypto operations"
    fi
    
    if grep -q "JWT_SECRET" api/.env; then
        check_pass "JWT_SECRET configured"
    else
        check_fail "JWT_SECRET not set"
    fi
else
    check_fail ".env file NOT FOUND"
    check_info "  Copy api/.env.example to api/.env"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Documentation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "USER-MANAGEMENT-SYSTEM.md" ]; then
    check_pass "Complete documentation exists"
else
    check_warn "USER-MANAGEMENT-SYSTEM.md not found"
fi

if [ -f "USER-MANAGEMENT-QUICKSTART.md" ]; then
    check_pass "Quick start guide exists"
else
    check_warn "USER-MANAGEMENT-QUICKSTART.md not found"
fi

if [ -f "IMPLEMENTATION-STATUS.md" ]; then
    check_pass "Implementation status exists"
else
    check_warn "IMPLEMENTATION-STATUS.md not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Checking Test Suite..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "tests/test-user-management.js" ]; then
    check_pass "Test suite exists"
    TEST_LINES=$(wc -l < tests/test-user-management.js)
    check_info "  Test suite has $TEST_LINES lines"
else
    check_fail "Test suite NOT FOUND"
fi

# Check if node is available
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed ($NODE_VERSION)"
else
    check_fail "Node.js NOT installed"
fi

# Check if npm packages are installed
if [ -d "node_modules" ] || [ -d "api/node_modules" ]; then
    check_pass "NPM packages installed"
else
    check_warn "NPM packages may not be installed - run: cd api && npm install"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Checking Docker Services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v docker &> /dev/null; then
    check_pass "Docker installed"
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        check_pass "Docker daemon running"
        
        # Check PostgreSQL
        if docker ps | grep -q cecbs-postgres; then
            check_pass "PostgreSQL container running"
        else
            check_warn "PostgreSQL container NOT running - start with: bash start-all.sh"
        fi
        
        # Check if blockchain is running
        PEER_COUNT=$(docker ps | grep -c "peer[0-9].*.cecbs.et" || true)
        if [ "$PEER_COUNT" -ge 6 ]; then
            check_pass "Blockchain network running ($PEER_COUNT peers)"
        else
            check_warn "Blockchain network NOT fully running - start with: bash start-all.sh"
        fi
    else
        check_warn "Docker daemon NOT running"
    fi
else
    check_fail "Docker NOT installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Checking API Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if API is responding
if curl -s http://localhost:3001/health &> /dev/null; then
    check_pass "API server is responding"
    
    # Check health endpoint
    HEALTH=$(curl -s http://localhost:3001/health)
    if echo "$HEALTH" | grep -q "healthy"; then
        check_pass "API health check passed"
    fi
else
    check_warn "API server NOT responding - start with: cd api && npm start"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Checking Crypto Directories..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "api/crypto-keys" ]; then
    check_pass "Crypto keys directory exists"
    PERMS=$(stat -c %a api/crypto-keys 2>/dev/null || stat -f %A api/crypto-keys 2>/dev/null)
    check_info "  Permissions: $PERMS (should be 700)"
else
    check_warn "Crypto keys directory doesn't exist (will be created on first use)"
fi

if [ -d "api/certificates" ]; then
    check_pass "Certificates directory exists"
else
    check_warn "Certificates directory doesn't exist (will be created on first use)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Pre-Flight Check Summary"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo ""
    echo "System is ready for testing!"
    echo ""
    echo "Next steps:"
    echo "  1. Start the system: bash start-all.sh"
    echo "  2. Run tests: node tests/test-user-management.js"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "System should work, but check warnings above."
    echo ""
else
    echo -e "${RED}✗ CHECKS FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Fix errors above before proceeding."
    echo ""
fi

exit $ERRORS
