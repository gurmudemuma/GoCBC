#!/bin/bash

# ============================================================================
# GoCBC Workflow Testing Script
# Tests each workflow component individually before running full E2E test
# ============================================================================

set -e

API_BASE="http://localhost:3001/api/v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $(printf '%-62s' "$1") ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_test() {
    echo -e "${BLUE}▶ Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    PASSED=$((PASSED + 1))
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    FAILED=$((FAILED + 1))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# ============================================================================
# TEST 1: Infrastructure
# ============================================================================
print_header "TEST 1: Infrastructure Status"

print_test "Docker containers running"
CONTAINER_COUNT=$(docker ps 2>/dev/null | grep -c "Up" || echo "0")
if [ "$CONTAINER_COUNT" -ge 10 ]; then
    print_pass "Docker infrastructure ($CONTAINER_COUNT containers running)"
else
    print_fail "Not enough containers running ($CONTAINER_COUNT)"
fi

print_test "PostgreSQL connectivity"
if docker exec cecbs-postgres pg_isready -U cecbs 2>/dev/null | grep -q "accepting"; then
    print_pass "PostgreSQL is ready"
else
    print_fail "PostgreSQL not accessible"
fi

print_test "API server health"
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null || echo "")
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    print_pass "API server is healthy"
else
    print_fail "API server not responding"
fi

# ============================================================================
# TEST 2: Authentication
# ============================================================================
print_header "TEST 2: Authentication Workflow"

print_test "Admin user login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_pass "Admin login successful (token received)"
else
    print_fail "Admin login failed"
    echo "$LOGIN_RESPONSE" | head -5
    echo ""
    echo "Exiting - cannot proceed without authentication"
    exit 1
fi

print_test "ECTA user login"
ECTA_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' 2>/dev/null)

if echo "$ECTA_LOGIN_RESPONSE" | grep -q '"token"'; then
    ECTA_TOKEN=$(echo "$ECTA_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_pass "ECTA login successful (token received)"
else
    print_fail "ECTA login failed"
    echo "$ECTA_LOGIN_RESPONSE" | head -5
    echo ""
    echo "Warning: ECTA user not available - contract approval may fail"
    ECTA_TOKEN="$ADMIN_TOKEN"
fi

# ============================================================================
# TEST 3: Exporter Registration
# ============================================================================
print_header "TEST 3: Exporter Registration Workflow"

TIMESTAMP=$(date +%s)
APP_ID="APP-TEST-$TIMESTAMP"
EXPORTER_ID="EXP-TEST-$TIMESTAMP"

print_test "Create exporter application"
APP_RESPONSE=$(curl -s -X POST "$API_BASE/exporters/exporter-applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"companyName\": \"Test Exporter $TIMESTAMP\",
    \"tinNumber\": \"TIN$TIMESTAMP\",
    \"email\": \"test$TIMESTAMP@example.com\",
    \"phone\": \"+251911$TIMESTAMP\",
    \"address\": \"Addis Ababa\",
    \"city\": \"Addis Ababa\",
    \"businessType\": \"Coffee Exporter\",
    \"registrationNumber\": \"REG$TIMESTAMP\",
    \"businessLicenseNumber\": \"BL$TIMESTAMP\",
    \"capitalRequirement\": \"25000000\",
    \"professionalTaster\": true,
    \"contactPerson\": \"Test Manager\"
  }" 2>/dev/null)

if echo "$APP_RESPONSE" | grep -qE "applicationId|application_id|success.*true"; then
    print_pass "Exporter application created"
    
    # Extract application ID
    APPLICATION_ID=$(echo "$APP_RESPONSE" | grep -o '"applicationId":"[^"]*' | cut -d'"' -f4)
    if [ -z "$APPLICATION_ID" ]; then
        APPLICATION_ID=$(echo "$APP_RESPONSE" | grep -o '"application_id":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ -n "$APPLICATION_ID" ]; then
        print_info "Application ID: $APPLICATION_ID"
        
        # Approve the application
        print_test "Approving exporter application"
        FUTURE_DATE=$(date -d "+1 year" +%Y-%m-%d 2>/dev/null || date -v +1y +%Y-%m-%d 2>/dev/null || echo "2027-12-31")
        APPROVE_RESPONSE=$(curl -s -X POST "$API_BASE/exporters/exporter-applications/$APPLICATION_ID/approve" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"exporterId\": \"$EXPORTER_ID\",
            \"ectaLicenseNumber\": \"LIC_$TIMESTAMP\",
            \"licenseExpiryDate\": \"$FUTURE_DATE\"
          }" 2>/dev/null)
        
        if echo "$APPROVE_RESPONSE" | grep -qE "success.*true|approved|exporterId"; then
            print_pass "Exporter approved and registered on blockchain"
            sleep 3
        else
            print_fail "Exporter approval failed"
            echo "$APPROVE_RESPONSE" | head -10
        fi
    fi
else
    print_fail "Exporter application creation failed"
    echo "$APP_RESPONSE" | head -10
fi

# ============================================================================
# TEST 4: Contract Management
# ============================================================================
print_header "TEST 4: Contract Management Workflow"

CONTRACT_ID="CONTRACT-TEST-$TIMESTAMP"

print_test "Create export contract"
CONTRACT_RESPONSE=$(curl -s -X POST "$API_BASE/contracts" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"BUYER-TEST\",
    \"buyerName\": \"Test Buyer Inc\",
    \"buyerCountry\": \"USA\",
    \"buyerBank\": \"Chase Bank\",
    \"exporterBank\": \"Commercial Bank of Ethiopia\",
    \"coffeeType\": \"Arabica\",
    \"quantity\": 1000,
    \"pricePerKg\": 5.50,
    \"totalValue\": 5500,
    \"currency\": \"USD\",
    \"deliveryDate\": \"2026-12-31\",
    \"icoNumber\": \"ICO-$TIMESTAMP\",
    \"eudrRequired\": false
  }" 2>/dev/null)

if echo "$CONTRACT_RESPONSE" | grep -qE "contractID|contract_id|success.*true|CONTRACT-TEST"; then
    print_pass "Contract created"
    
    # Approve the contract before LC request
    print_test "Approving contract"
    APPROVE_CONTRACT_RESPONSE=$(curl -s -X POST "$API_BASE/contracts/$CONTRACT_ID/approve" \
      -H "Authorization: Bearer $ECTA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"approvedBy\": \"ectaAdmin\", \"remarks\": \"Test approval\"}" 2>/dev/null)
    
    if echo "$APPROVE_CONTRACT_RESPONSE" | grep -qE "success.*true|approved|APPROVED"; then
        print_pass "Contract approved"
        sleep 2
    else
        print_fail "Contract approval failed (non-blocking)"
        # Don't fail the test, as the contract might be auto-approved or not require approval
    fi
else
    print_fail "Contract creation failed"
    echo "$CONTRACT_RESPONSE" | head -10
fi

# ============================================================================
# TEST 5: Letter of Credit
# ============================================================================
print_header "TEST 5: Letter of Credit Workflow"

LC_NUMBER="LC-TEST-$TIMESTAMP"

print_test "Request Letter of Credit"
LC_RESPONSE=$(curl -s -X POST "$API_BASE/banking/lc/request" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lcID\": \"$LC_NUMBER\",
    \"lcNumber\": \"$LC_NUMBER\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 5500,
    \"currency\": \"USD\",
    \"bankName\": \"Commercial Bank of Ethiopia\",
    \"beneficiaryBank\": \"Commercial Bank of Ethiopia\",
    \"issueDate\": \"2026-11-04\",
    \"expiryDate\": \"2026-12-31\"
  }" 2>/dev/null)

if echo "$LC_RESPONSE" | grep -qE "lcNumber|lc_number|success.*true|LC-TEST"; then
    print_pass "LC request created"
else
    print_fail "LC request failed"
    echo "$LC_RESPONSE" | head -10
fi

# ============================================================================
# TEST 6: Shipment Creation
# ============================================================================
print_header "TEST 6: Shipment Management Workflow"

SHIPMENT_ID="SHIP-TEST-$TIMESTAMP"

print_test "Create shipment"
SHIPMENT_RESPONSE=$(curl -s -X POST "$API_BASE/shipments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"BUYER-TEST\",
    \"quantity\": 1000,
    \"grade\": \"Grade 1\",
    \"channel\": \"ECX\",
    \"ecxLotNumber\": \"LOT-$TIMESTAMP\",
    \"origin\": \"Ethiopia\",
    \"destination\": \"USA\",
    \"shippingLine\": \"Maersk\",
    \"containerNumber\": \"CONT$TIMESTAMP\",
    \"icoNumber\": \"ICO-$TIMESTAMP\",
    \"forexRate\": 57.5,
    \"valueUSD\": 5500,
    \"eudrCompliant\": true
  }" 2>/dev/null)

if echo "$SHIPMENT_RESPONSE" | grep -qE "shipmentID|shipment_id|success.*true|SHIP-TEST"; then
    print_pass "Shipment created"
else
    print_fail "Shipment creation failed"
    echo "$SHIPMENT_RESPONSE" | head -10
fi

# ============================================================================
# TEST 7: Quality Inspection
# ============================================================================
print_header "TEST 7: Quality Inspection Workflow"

INSPECTION_ID="INSP-TEST-$TIMESTAMP"

print_test "Request quality inspection"
INSPECTION_RESPONSE=$(curl -s -X POST "$API_BASE/inspection" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"inspectionID\": \"$INSPECTION_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"coffeeType\": \"Arabica\",
    \"quantity\": 1000,
    \"sampleSize\": 100
  }" 2>/dev/null)

if echo "$INSPECTION_RESPONSE" | grep -qE "inspectionID|inspection_id|success.*true|pending"; then
    print_pass "Quality inspection requested"
else
    print_fail "Quality inspection request failed"
    echo "$INSPECTION_RESPONSE" | head -10
fi

# ============================================================================
# TEST 8: Forex Operations
# ============================================================================
print_header "TEST 8: Forex Management Workflow"

print_test "Check NBE forex policies"
FOREX_RESPONSE=$(curl -s -X GET "$API_BASE/nbe/forex/retention" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null)

if echo "$FOREX_RESPONSE" | grep -qE "retention|policies|COFFEE|success"; then
    print_pass "Forex policies accessible"
else
    print_fail "Forex policies check failed"
    echo "$FOREX_RESPONSE" | head -10
fi

# ============================================================================
# TEST SUMMARY
# ============================================================================
print_header "TEST SUMMARY"

TOTAL=$((PASSED + FAILED))
PASS_RATE=0
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))
fi

echo ""
echo -e "${CYAN}Total Tests: $TOTAL${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Pass Rate: ${PASS_RATE}%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ALL WORKFLOWS PASSED - Ready for E2E Test!                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "You can now run the complete E2E test:"
    echo "  bash complete-e2e-test.sh"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     SOME WORKFLOWS FAILED - Fix issues before E2E test         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
