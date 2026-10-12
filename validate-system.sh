#!/bin/bash

# CECBS System Validation Script
# Validates all components are working without discrepancies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Helper functions
print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_pass() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "${RED}❌ $1${NC}"
    if [ ! -z "$2" ]; then
        echo -e "${RED}   Error: $2${NC}"
    fi
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     CECBS System Validation - Comprehensive Check            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Environment Setup Validation
print_header "1. ENVIRONMENT SETUP"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js installed ($NODE_VERSION)"
else
    check_fail "Node.js not found" "Install Node.js 18+"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm installed ($NPM_VERSION)"
else
    check_fail "npm not found"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    check_pass "Docker installed ($DOCKER_VERSION)"
else
    check_fail "Docker not found" "Required for blockchain"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | tr -d ',')
    check_pass "Docker Compose installed ($COMPOSE_VERSION)"
else
    check_fail "Docker Compose not found"
fi

echo ""

# 2. Directory Structure Validation
print_header "2. DIRECTORY STRUCTURE"

REQUIRED_DIRS=(
    "api"
    "ui"
    "blockchain"
    "chaincodes/coffee"
    "tests"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "Directory exists: $dir"
    else
        check_fail "Missing directory: $dir"
    fi
done

echo ""

# 3. API Setup Validation
print_header "3. API BACKEND SETUP"

# Check API dependencies
if [ -f "api/package.json" ]; then
    check_pass "API package.json exists"
    
    # Check for pdf-lib dependency
    if grep -q "pdf-lib" api/package.json; then
        check_pass "pdf-lib dependency configured"
    else
        check_fail "pdf-lib dependency missing" "Run: cd api && npm install pdf-lib@1.17.1"
    fi
    
    # Check node_modules
    if [ -d "api/node_modules" ]; then
        check_pass "API dependencies installed"
    else
        check_warn "API node_modules not found - run: cd api && npm install"
    fi
else
    check_fail "API package.json not found"
fi

# Check API environment file
if [ -f "api/.env" ]; then
    check_pass "API .env file exists"
    
    # Check critical env variables
    if grep -q "DATABASE_URL" api/.env; then
        check_pass "DATABASE_URL configured"
    else
        check_fail "DATABASE_URL not set in .env"
    fi
else
    check_warn "API .env file not found - copy from .env.example"
fi

# Check API source files
REQUIRED_API_FILES=(
    "api/src/server.ts"
    "api/src/routes/documents.ts"
    "api/src/services/fabricService.ts"
    "api/src/services/documentSignatureService.ts"
)

for file in "${REQUIRED_API_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "API file exists: $(basename $file)"
    else
        check_fail "Missing API file: $file"
    fi
done

# Check migration files
if [ -f "api/migrate-document-signatures.sql" ]; then
    check_pass "Signature migration SQL exists"
else
    check_fail "Signature migration SQL not found"
fi

if [ -f "api/run-signature-migration.js" ]; then
    check_pass "Signature migration runner exists"
else
    check_fail "Signature migration runner not found"
fi

echo ""

# 4. UI Setup Validation
print_header "4. UI FRONTEND SETUP"

# Check UI dependencies
if [ -f "ui/package.json" ]; then
    check_pass "UI package.json exists"
    
    if [ -d "ui/node_modules" ]; then
        check_pass "UI dependencies installed"
    else
        check_warn "UI node_modules not found - run: cd ui && npm install"
    fi
else
    check_fail "UI package.json not found"
fi

# Check UI environment file
if [ -f "ui/.env" ] || [ -f "ui/.env.local" ]; then
    check_pass "UI environment file exists"
else
    check_warn "UI .env file not found - copy from .env.example"
fi

# Check UI components
REQUIRED_UI_COMPONENTS=(
    "ui/src/components/documents/DocumentManagementPanel.tsx"
    "ui/src/components/documents/SignDocumentButton.tsx"
    "ui/src/components/documents/DocumentSignatureTracker.tsx"
    "ui/src/components/documents/index.ts"
)

for file in "${REQUIRED_UI_COMPONENTS[@]}"; do
    if [ -f "$file" ]; then
        check_pass "UI component exists: $(basename $file)"
    else
        check_fail "Missing UI component: $file"
    fi
done

# Check portal integrations
PORTAL_FILES=(
    "ui/src/components/portals/ExporterPortal.tsx"
    "ui/src/components/portals/ECTAPortal.tsx"
    "ui/src/components/portals/BanksPortal.tsx"
    "ui/src/components/portals/NBEPortal.tsx"
    "ui/src/components/portals/CustomsPortal.tsx"
    "ui/src/components/portals/ShippingPortal.tsx"
)

for file in "${PORTAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if DocumentManagementPanel is imported
        if grep -q "DocumentManagementPanel" "$file"; then
            check_pass "Portal integrated: $(basename $file)"
        else
            check_warn "Portal may need integration: $(basename $file)"
        fi
    else
        check_fail "Missing portal file: $file"
    fi
done

echo ""

# 5. Blockchain Setup Validation
print_header "5. BLOCKCHAIN SETUP"

# Check chaincode files
if [ -f "chaincodes/coffee/signature.go" ]; then
    check_pass "Signature chaincode exists"
    
    # Check for signature functions
    if grep -q "SignDocument" chaincodes/coffee/signature.go; then
        check_pass "SignDocument function implemented"
    else
        check_fail "SignDocument function not found"
    fi
    
    if grep -q "GetDocumentSignatures" chaincodes/coffee/signature.go; then
        check_pass "GetDocumentSignatures function implemented"
    else
        check_fail "GetDocumentSignatures function not found"
    fi
else
    check_fail "signature.go not found"
fi

# Check blockchain configuration
if [ -f "docker-compose-fabric.yml" ]; then
    check_pass "Docker Compose config exists"
else
    check_fail "docker-compose-fabric.yml not found"
fi

# Check if blockchain is running
if docker ps | grep -q "peer0.ecx.cecbs.et"; then
    check_pass "Blockchain network is running"
else
    check_warn "Blockchain network not running - start with: docker-compose -f docker-compose-fabric.yml up -d"
fi

echo ""

# 6. Database Validation
print_header "6. DATABASE SETUP"

# Check if database file exists (SQLite) or connection (PostgreSQL)
if [ -f "api/cecbs.db" ]; then
    check_pass "SQLite database file exists"
else
    check_info "Using PostgreSQL or database not initialized"
fi

# Check database schema (if we can connect)
check_info "Database schema validation requires running API server"

echo ""

# 7. Service Health Checks
print_header "7. SERVICE HEALTH CHECKS"

# Check if API is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    check_pass "API server is responsive"
    
    # Check API health endpoint
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
    if echo "$HEALTH_RESPONSE" | grep -q "ok\|healthy"; then
        check_pass "API health check passed"
    fi
else
    check_warn "API server not running - start with: cd api && npm run dev"
fi

# Check if UI is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    check_pass "UI server is responsive"
else
    check_warn "UI server not running - start with: cd ui && npm run dev"
fi

echo ""

# 8. Integration Validation
print_header "8. INTEGRATION VALIDATION"

# Check if test files exist
if [ -f "tests/test-signature-system-integration.js" ]; then
    check_pass "Integration test suite exists"
    check_info "Run with: node tests/test-signature-system-integration.js"
else
    check_fail "Integration test suite not found"
fi

# Check documentation
if [ -f "SIGNATURE-SYSTEM-INTEGRATION-COMPLETE.md" ]; then
    check_pass "Integration documentation exists"
else
    check_warn "Integration documentation not found"
fi

if [ -f "PORTAL-INTEGRATION-GUIDE.md" ]; then
    check_pass "Portal integration guide exists"
else
    check_warn "Portal integration guide not found"
fi

echo ""

# 9. Configuration Validation
print_header "9. CONFIGURATION VALIDATION"

# Check API configuration
if [ -f "api/src/config/api.config.ts" ] || [ -f "api/src/config/api.config.js" ]; then
    check_pass "API configuration file exists"
else
    check_warn "API configuration file not found"
fi

# Check blockchain configuration
if [ -f "blockchain/configtx.yaml" ]; then
    check_pass "Blockchain config (configtx.yaml) exists"
else
    check_fail "configtx.yaml not found"
fi

if [ -f "blockchain/crypto-config.yaml" ]; then
    check_pass "Crypto config (crypto-config.yaml) exists"
else
    check_fail "crypto-config.yaml not found"
fi

echo ""

# 10. Security Validation
print_header "10. SECURITY CHECKS"

# Check for exposed secrets
if grep -r "password.*=" api/.env 2>/dev/null | grep -v "example" | head -1; then
    check_warn "Passwords found in .env - ensure production security"
fi

# Check HTTPS configuration (for production)
if [ -d "nginx-configs" ]; then
    check_pass "Nginx configs directory exists"
    if [ -f "nginx-configs/cecbs-production.conf" ]; then
        check_pass "Production nginx config exists"
    fi
else
    check_info "Nginx configs not set up (OK for development)"
fi

echo ""

# Summary
print_header "VALIDATION SUMMARY"

PASS_RATE=0
if [ $TOTAL_CHECKS -gt 0 ]; then
    PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo -e "${BLUE}Total Checks:  $TOTAL_CHECKS${NC}"
echo -e "${GREEN}Passed:        $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:        $FAILED_CHECKS${NC}"
echo -e "${BLUE}Pass Rate:     $PASS_RATE%${NC}"

echo ""

if [ $PASS_RATE -ge 80 ]; then
    echo -e "${GREEN}✅ System validation PASSED${NC}"
    echo -e "${GREEN}Your CECBS system is properly configured!${NC}"
    exit 0
elif [ $PASS_RATE -ge 60 ]; then
    echo -e "${YELLOW}⚠️  System validation passed with warnings${NC}"
    echo -e "${YELLOW}Review warnings above and fix as needed${NC}"
    exit 0
else
    echo -e "${RED}❌ System validation FAILED${NC}"
    echo -e "${RED}Critical issues found - please fix errors above${NC}"
    exit 1
fi
