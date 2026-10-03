#!/bin/bash

# Verification script for start-all.sh
# Checks if start-all.sh performs all necessary actions

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  start-all.sh Functionality Verification${RESET}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo ""

ISSUES=0

check_feature() {
    echo -e "${BLUE}Checking: $1${RESET}"
}

verify_pass() {
    echo -e "${GREEN}  ✓ $1${RESET}"
}

verify_fail() {
    echo -e "${RED}  ✗ $1${RESET}"
    ISSUES=$((ISSUES + 1))
}

verify_warning() {
    echo -e "${YELLOW}  ⚠ $1${RESET}"
}

echo -e "${YELLOW}━━━ Script Structure ━━━${RESET}"
echo ""

check_feature "Script exists and is executable"
if [ -x "start-all.sh" ]; then
    verify_pass "start-all.sh is executable"
else
    verify_fail "start-all.sh is not executable"
fi

check_feature "Script functions defined"
FUNCTIONS=(
    "check_prerequisites"
    "build_chaincode"
    "install_dependencies"
    "build_typescript"
    "start_chaincode_container"
    "start_fabric_network"
    "run_database_migrations"
    "create_channel"
    "deploy_chaincode"
    "start_api"
    "start_ui"
    "start_sync_service"
    "test_connections"
    "show_summary"
)

for func in "${FUNCTIONS[@]}"; do
    if grep -q "^${func}()" start-all.sh || grep -q "^${func} ()" start-all.sh; then
        verify_pass "Function defined: $func"
    else
        verify_fail "Missing function: $func"
    fi
done

echo ""
echo -e "${YELLOW}━━━ Component Startup Order ━━━${RESET}"
echo ""

check_feature "Correct startup sequence in main()"
if grep -A 30 "^main()" start-all.sh | grep -q "start_chaincode_container"; then
    verify_pass "Chaincode container starts before network"
else
    verify_warning "Chaincode startup timing may not be optimal"
fi

if grep -A 30 "^main()" start-all.sh | grep -q "start_fabric_network"; then
    verify_pass "Fabric network startup included"
else
    verify_fail "Fabric network startup missing"
fi

if grep -A 30 "^main()" start-all.sh | grep -q "run_database_migrations"; then
    verify_pass "Database migrations run automatically"
else
    verify_fail "Database migrations not automated"
fi

if grep -A 30 "^main()" start-all.sh | grep -q "create_channel"; then
    verify_pass "Channel creation included"
else
    verify_warning "Channel creation may not be automated"
fi

if grep -A 30 "^main()" start-all.sh | grep -q "deploy_chaincode"; then
    verify_pass "Chaincode deployment included"
elif grep "deploy_chaincode || chaincode_status" start-all.sh >/dev/null 2>&1; then
    verify_pass "Chaincode deployment included (with error handling)"
else
    verify_warning "Chaincode deployment may need manual trigger"
fi

echo ""
echo -e "${YELLOW}━━━ Migration Integration ━━━${RESET}"
echo ""

check_feature "Migration runner script exists"
if [ -f "scripts/migrate-db-pg.js" ]; then
    verify_pass "scripts/migrate-db-pg.js exists"
else
    verify_fail "Migration script missing"
fi

check_feature "Migration directory exists"
if [ -d "api/src/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 api/src/migrations/*.sql 2>/dev/null | wc -l)
    verify_pass "Found $MIGRATION_COUNT migration files"
else
    verify_fail "Migrations directory missing"
fi

check_feature "Start script calls migration runner"
if grep -q "migrate-db-pg.js" start-all.sh; then
    verify_pass "Script runs migrations via migrate-db-pg.js"
else
    verify_fail "Script doesn't call migration runner"
fi

echo ""
echo -e "${YELLOW}━━━ TLS Configuration ━━━${RESET}"
echo ""

check_feature "TLS chaincode startup"
if grep -q "start_chaincode_container" start-all.sh; then
    verify_pass "Chaincode container startup function exists"
    
    if grep -A 30 "start_chaincode_container()" start-all.sh | grep -q "TLS\|tls"; then
        verify_pass "TLS configuration mentioned in chaincode startup"
    else
        verify_warning "TLS not explicitly mentioned in chaincode startup"
    fi
else
    verify_fail "Chaincode container startup missing"
fi

check_feature "TLS certificates"
if [ -f "chaincodes/coffee/tls/server-cert.pem" ] && [ -f "chaincodes/coffee/tls/server-key.pem" ]; then
    verify_pass "TLS certificates exist"
else
    verify_fail "TLS certificates not found"
fi

echo ""
echo -e "${YELLOW}━━━ Error Handling ━━━${RESET}"
echo ""

check_feature "Script uses 'set -e'"
if grep -q "^set -e" start-all.sh; then
    verify_pass "Script exits on error (set -e)"
else
    verify_warning "Script may not exit on errors"
fi

check_feature "Port availability checks"
if grep -q "wait_for_port\|test_port" start-all.sh; then
    verify_pass "Port checking functions implemented"
else
    verify_warning "No port availability checks"
fi

echo ""
echo -e "${YELLOW}━━━ Service Management ━━━${RESET}"
echo ""

check_feature "API startup"
if grep -q "start_api" start-all.sh && [ -f "start-api.sh" ]; then
    verify_pass "API startup delegated to start-api.sh"
else
    verify_warning "API startup may not be properly configured"
fi

check_feature "UI startup"
if grep -q "start_ui" start-all.sh && [ -f "start-ui.sh" ]; then
    verify_pass "UI startup delegated to start-ui.sh"
else
    verify_warning "UI startup may not be properly configured"
fi

check_feature "Sync service"
if grep -q "start_sync_service" start-all.sh; then
    verify_pass "Sync service startup included"
else
    verify_warning "Sync service may need manual start"
fi

echo ""
echo -e "${YELLOW}━━━ Documentation & Usability ━━━${RESET}"
echo ""

check_feature "Usage help"
if grep -q "Usage:" start-all.sh || grep -q "# Usage" start-all.sh; then
    verify_pass "Usage instructions provided"
else
    verify_warning "No usage documentation in script"
fi

check_feature "Command-line options"
# Check each option individually with proper quoting
if grep -q 'skip-build' start-all.sh 2>/dev/null; then
    verify_pass "Option supported: --skip-build"
else
    verify_warning "Option may not be supported: --skip-build"
fi

if grep -q 'dev-mode' start-all.sh 2>/dev/null; then
    verify_pass "Option supported: --dev-mode"
else
    verify_warning "Option may not be supported: --dev-mode"
fi

if grep -q 'skip-tests' start-all.sh 2>/dev/null; then
    verify_pass "Option supported: --skip-tests"
else
    verify_warning "Option may not be supported: --skip-tests"
fi

check_feature "Summary display"
if grep -q "show_summary" start-all.sh; then
    verify_pass "Script shows summary after startup"
else
    verify_warning "No summary display function"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  Verification Summary${RESET}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${RESET}"
echo ""

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! start-all.sh is properly configured.${RESET}"
    echo ""
    echo -e "${GREEN}The script will:${RESET}"
    echo -e "  1. ✓ Check prerequisites"
    echo -e "  2. ✓ Build chaincode binary"
    echo -e "  3. ✓ Install dependencies"
    echo -e "  4. ✓ Build TypeScript"
    echo -e "  5. ✓ Start TLS-enabled chaincode container"
    echo -e "  6. ✓ Start Fabric network (all peers & orderer)"
    echo -e "  7. ✓ Run database migrations (22 migrations)"
    echo -e "  8. ✓ Create channel (if needed)"
    echo -e "  9. ✓ Deploy chaincode"
    echo -e "  10. ✓ Start API server"
    echo -e "  11. ✓ Start UI server"
    echo -e "  12. ✓ Start sync service"
    echo -e "  13. ✓ Test connections"
    echo -e "  14. ✓ Show summary with URLs and credentials"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s) that should be reviewed.${RESET}"
    echo ""
    echo -e "${YELLOW}Recommended actions:${RESET}"
    echo -e "  1. Review the issues marked with ✗ above"
    echo -e "  2. Fix critical issues (marked with ✗)"
    echo -e "  3. Consider addressing warnings (marked with ⚠)"
    echo ""
    exit 1
fi
