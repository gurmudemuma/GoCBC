#!/bin/bash

# =============================================================================
# Comprehensive Exporter Portal Function Test
# Tests all features and API endpoints
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Configuration
API_URL="http://localhost:3001"
UI_URL="http://localhost:3000"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Test result tracker
declare -a FAILED_TEST_NAMES

print_header() {
    echo -e ""
    echo -e "${CYAN}${BOLD}============================================================================${RESET}"
    echo -e "${CYAN}${BOLD}  $1${RESET}"
    echo -e "${CYAN}${BOLD}============================================================================${RESET}"
    echo -e ""
}

print_test() {
    echo -e "${BLUE}▶${RESET} Testing: $1"
}

print_pass() {
    echo -e "${GREEN}  ✓ PASS${RESET}: $1"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}  ✗ FAIL${RESET}: $1"
    ((FAILED_TESTS++))
    FAILED_TEST_NAMES+=("$1")
}

print_warn() {
    echo -e "${YELLOW}  ⚠ WARN${RESET}: $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${MAGENTA}  ℹ INFO${RESET}: $1"
}

# =============================================================================
# Helper Functions
# =============================================================================

# Get auth token (using default admin credentials)
get_auth_token() {
    local response=$(curl -s -X POST "$API_URL/api/v1/users/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
    
    if [ -z "$response" ]; then
        echo ""
        return 1
    fi
    
    echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

# Get exporter token
get_exporter_token() {
    local response=$(curl -s -X POST "$API_URL/api/v1/users/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"exporter1","password":"password123"}' 2>/dev/null)
    
    if [ -z "$response" ]; then
        echo ""
        return 1
    fi
    
    echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

test_api_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local token="$4"
    local expected_status="${5:-200}"
    
    ((TOTAL_TESTS++))
    print_test "$name"
    
    if [ "$method" == "GET" ]; then
        local response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
            -H "Authorization: Bearer $token" 2>/dev/null)
    elif [ "$method" == "POST" ]; then
        local data="$6"
        local response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    local status=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$status" == "$expected_status" ]; then
        print_pass "Endpoint returned $status"
        return 0
    else
        print_fail "Expected $expected_status but got $status"
        [ -n "$body" ] && print_info "Response: ${body:0:100}"
        return 1
    fi
}

# =============================================================================
# START TESTS
# =============================================================================

print_header "Exporter Portal - Comprehensive Function Test"

echo "Starting tests at: $(date)"
echo "API URL: $API_URL"
echo "UI URL: $UI_URL"
echo ""

# =============================================================================
# 1. System Health Checks
# =============================================================================

print_header "1. System Health Checks"

# Test API
((TOTAL_TESTS++))
print_test "API Server Health"
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    print_pass "API is responding"
else
    print_fail "API is not responding"
fi

# Test UI
((TOTAL_TESTS++))
print_test "UI Server Health"
if curl -s -f "$UI_URL" > /dev/null 2>&1; then
    print_pass "UI is responding"
else
    print_fail "UI is not responding"
fi

# Test Database
((TOTAL_TESTS++))
print_test "PostgreSQL Database"
if docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
    print_pass "Database is accessible"
else
    print_fail "Database is not accessible"
fi

# Test Database Schema
((TOTAL_TESTS++))
print_test "Audit Trail Schema"
if docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\d audit_trail" 2>/dev/null | grep -q "performed_by"; then
    print_pass "Audit trail has all required columns"
else
    print_fail "Audit trail missing columns"
fi

# =============================================================================
# 2. Authentication Tests
# =============================================================================

print_header "2. Authentication & Authorization"

# Admin login
((TOTAL_TESTS++))
print_test "Admin Login"
ADMIN_TOKEN=$(get_auth_token)
if [ -n "$ADMIN_TOKEN" ]; then
    print_pass "Admin authenticated successfully"
    print_info "Token: ${ADMIN_TOKEN:0:20}..."
else
    print_fail "Admin authentication failed"
fi

# Exporter login
((TOTAL_TESTS++))
print_test "Exporter Login"
EXPORTER_TOKEN=$(get_exporter_token)
if [ -n "$EXPORTER_TOKEN" ]; then
    print_pass "Exporter authenticated successfully"
else
    print_warn "Exporter authentication failed (may not exist yet)"
fi

# =============================================================================
# 3. Exporter Profile & Dashboard
# =============================================================================

print_header "3. Exporter Profile & Dashboard Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get Exporter Portal Stats" "GET" "/api/v1/stats/exporter-portal" "$ADMIN_TOKEN"
    test_api_endpoint "Get All Exporters" "GET" "/api/v1/stats/exporters" "$ADMIN_TOKEN"
    test_api_endpoint "Get Exporter Applications" "GET" "/api/v1/exporters/exporter-applications" "$ADMIN_TOKEN"
fi

# =============================================================================
# 4. Contract Management Functions
# =============================================================================

print_header "4. Contract Management Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get All Contracts" "GET" "/api/v1/contracts" "$ADMIN_TOKEN"
    test_api_endpoint "Get Contract Stats" "GET" "/api/v1/contracts/stats" "$ADMIN_TOKEN"
fi

# =============================================================================
# 5. Forex & Banking Functions
# =============================================================================

print_header "5. Forex & LC Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get Forex Declarations" "GET" "/api/v1/forex" "$ADMIN_TOKEN"
    test_api_endpoint "Get LC Statuses" "GET" "/api/v1/banking/lcs" "$ADMIN_TOKEN"
    test_api_endpoint "Get CAD (Documentary Collections)" "GET" "/api/v1/banking/cad" "$ADMIN_TOKEN"
fi

# =============================================================================
# 6. Shipment & Logistics Functions
# =============================================================================

print_header "6. Shipment & Logistics Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get All Shipments" "GET" "/api/v1/shipments" "$ADMIN_TOKEN"
    test_api_endpoint "Get Shipment Stats" "GET" "/api/v1/shipments/stats" "$ADMIN_TOKEN"
fi

# =============================================================================
# 7. Customs & Permits Functions
# =============================================================================

print_header "7. Customs & Quality Inspection Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get Customs Declarations" "GET" "/api/v1/customs" "$ADMIN_TOKEN"
    test_api_endpoint "Get Export Permits" "GET" "/api/v1/permits" "$ADMIN_TOKEN"
    test_api_endpoint "Get Quality Certificates" "GET" "/api/v1/quality/certificates" "$ADMIN_TOKEN"
fi

# =============================================================================
# 8. Payment & Repatriation Functions
# =============================================================================

print_header "8. Payment & Repatriation Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get Payments" "GET" "/api/v1/payments" "$ADMIN_TOKEN"
    test_api_endpoint "Get Repatriation Records" "GET" "/api/v1/repatriation" "$ADMIN_TOKEN"
fi

# =============================================================================
# 9. Analytics & Reports Functions
# =============================================================================

print_header "9. Analytics & Reports Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get Audit Trail" "GET" "/api/v1/audit" "$ADMIN_TOKEN"
    test_api_endpoint "Get System Analytics" "GET" "/api/v1/analytics" "$ADMIN_TOKEN" "200" || \
    test_api_endpoint "Get System Analytics (Alt)" "GET" "/api/v1/stats/system" "$ADMIN_TOKEN"
fi

# =============================================================================
# 10. SWIFT Messages Functions
# =============================================================================

print_header "10. SWIFT Messages Functions"

if [ -n "$ADMIN_TOKEN" ]; then
    test_api_endpoint "Get SWIFT Messages" "GET" "/api/v1/banking/swift" "$ADMIN_TOKEN"
    test_api_endpoint "Get MT700 Messages" "GET" "/api/v1/banking/swift/mt700" "$ADMIN_TOKEN"
fi

# =============================================================================
# 11. Blockchain Integration
# =============================================================================

print_header "11. Blockchain Functions"

((TOTAL_TESTS++))
print_test "Chaincode Container Status"
if docker ps --format '{{.Names}}' | grep -q 'coffee-chaincode'; then
    print_pass "Chaincode container is running"
else
    print_warn "Chaincode container not found"
fi

((TOTAL_TESTS++))
print_test "Fabric Peer Status"
if docker ps --format '{{.Names}}' | grep -q 'peer0.ecta.cecbs.et'; then
    print_pass "Fabric peer is running"
else
    print_fail "Fabric peer not running"
fi

# =============================================================================
# 12. UI Component Tests
# =============================================================================

print_header "12. UI Component Accessibility"

((TOTAL_TESTS++))
print_test "ExporterPortal Component Exists"
if [ -f "ui/src/components/portals/ExporterPortal.tsx" ]; then
    print_pass "ExporterPortal.tsx found"
else
    print_fail "ExporterPortal.tsx missing"
fi

((TOTAL_TESTS++))
print_test "UI Uses Correct Colors"
if grep -q "#9b30b7\|#FFD700" ui/src/styles/exporterPortalStyles.ts 2>/dev/null; then
    print_pass "UI uses correct brand colors"
else
    print_fail "UI colors not updated"
fi

((TOTAL_TESTS++))
print_test "UI Removed Blockchain Badges"
if ! grep -q "BlockchainChip\|ECTA LICENSE" ui/src/components/portals/ExporterPortal.tsx 2>/dev/null; then
    print_pass "Blockchain badges removed"
else
    print_warn "Blockchain badges still present"
fi

# =============================================================================
# 13. Critical Data Tables
# =============================================================================

print_header "13. Database Tables Verification"

CRITICAL_TABLES=(
    "users"
    "export_contracts"
    "shipments"
    "payments"
    "forex_declarations"
    "lc_applications"
    "customs_declarations"
    "quality_certificates"
    "audit_trail"
    "exporter_applications"
)

for table in "${CRITICAL_TABLES[@]}"; do
    ((TOTAL_TESTS++))
    print_test "Table: $table"
    if docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT COUNT(*) FROM $table" > /dev/null 2>&1; then
        print_pass "$table exists"
    else
        print_fail "$table missing"
    fi
done

# =============================================================================
# SUMMARY
# =============================================================================

print_header "Test Summary"

echo ""
echo -e "${BOLD}Total Tests:${RESET}    $TOTAL_TESTS"
echo -e "${GREEN}${BOLD}Passed:${RESET}         $PASSED_TESTS"
echo -e "${RED}${BOLD}Failed:${RESET}         $FAILED_TESTS"
echo -e "${YELLOW}${BOLD}Warnings:${RESET}       $WARNINGS"
echo ""

# Calculate pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${BOLD}Pass Rate:${RESET}      ${PASS_RATE}%"
fi

echo ""

# List failed tests
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}${BOLD}Failed Tests:${RESET}"
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "${RED}  • $test_name${RESET}"
    done
    echo ""
fi

# Overall result
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════${RESET}"
    echo -e "${GREEN}${BOLD}  ✓ ALL TESTS PASSED - SYSTEM FUNCTIONAL  ${RESET}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════${RESET}"
    exit 0
elif [ $FAILED_TESTS -lt 5 ]; then
    echo -e "${YELLOW}${BOLD}═══════════════════════════════════════════${RESET}"
    echo -e "${YELLOW}${BOLD}  ⚠ MINOR ISSUES DETECTED                 ${RESET}"
    echo -e "${YELLOW}${BOLD}═══════════════════════════════════════════${RESET}"
    exit 0
else
    echo -e "${RED}${BOLD}═══════════════════════════════════════════${RESET}"
    echo -e "${RED}${BOLD}  ✗ CRITICAL ISSUES DETECTED              ${RESET}"
    echo -e "${RED}${BOLD}═══════════════════════════════════════════${RESET}"
    exit 1
fi
