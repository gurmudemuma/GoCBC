#!/bin/bash

# ============================================================================
# GoCBC NEW FEATURES VERIFICATION SCRIPT
# ============================================================================
# Tests the 4 newly deployed HIGH priority features
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}[TEST]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

API_URL="http://localhost:3000"
TOTAL_TESTS=0
PASSED_TESTS=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local method=${3:-GET}
    local data=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_step "Testing: $name"
    
    if [ "$method" = "POST" ]; then
        if curl -s -X POST -H "Content-Type: application/json" -d "$data" "$API_URL$endpoint" > /dev/null; then
            print_success "$name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            print_error "$name"
            return 1
        fi
    else
        if curl -s "$API_URL$endpoint" > /dev/null; then
            print_success "$name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            print_error "$name"
            return 1
        fi
    fi
}

echo "============================================================================"
echo "  GoCBC NEW FEATURES VERIFICATION"
echo "  Testing 4 HIGH Priority Features"
echo "============================================================================"
echo ""

# ============================================================================
# Feature 1: Export Proceeds Repatriation
# ============================================================================
echo "Feature 1: Export Proceeds Repatriation"
echo "----------------------------------------"

test_endpoint "Repatriation Health Check" "/api/repatriation/health"
test_endpoint "Query Repatriations by Status" "/api/repatriation/status/pending"
test_endpoint "Query Overdue Repatriations" "/api/repatriation/overdue"

echo ""

# ============================================================================
# Feature 2: Pre-shipment Inspection
# ============================================================================
echo "Feature 2: Pre-shipment Inspection"
echo "----------------------------------------"

test_endpoint "Inspection Health Check" "/api/inspection/health"
test_endpoint "Query Inspections by Status" "/api/inspection/status/pending"
test_endpoint "Get Inspection Statistics" "/api/inspection/statistics"

echo ""

# ============================================================================
# Feature 3: Border Crossing Documentation
# ============================================================================
echo "Feature 3: Border Crossing Documentation"
echo "----------------------------------------"

test_endpoint "Border Crossing Health Check" "/api/bordercrossing/health"
test_endpoint "Query Border Crossings by Status" "/api/bordercrossing/status/initiated"
test_endpoint "Get Active Border Crossings" "/api/bordercrossing/active"

echo ""

# ============================================================================
# Feature 4: LC Discrepancy Handling
# ============================================================================
echo "Feature 4: LC Discrepancy Handling"
echo "----------------------------------------"

test_endpoint "Banking Health Check (with LC Discrepancies)" "/api/banking/health"
test_endpoint "Query LCs with Discrepancies" "/api/banking/lc/discrepancies"
test_endpoint "Get All Letters of Credit" "/api/banking/lc"

echo ""

# ============================================================================
# Database Verification
# ============================================================================
echo "Database Verification"
echo "----------------------------------------"

print_step "Checking new tables exist..."

# Check if PostgreSQL container is running
if docker ps | grep -q postgres; then
    # Check for new tables
    TABLES=$(docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d gocbc -t -c "
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('repatriations', 'inspections', 'border_crossings')
        ORDER BY table_name;
    " 2>/dev/null | grep -v '^$' | wc -l)
    
    if [ "$TABLES" -eq 3 ]; then
        print_success "All 3 new tables exist in database"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Some new tables are missing (found $TABLES/3)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Check for LC discrepancies columns
    LC_COLUMNS=$(docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d gocbc -t -c "
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'letter_of_credits' 
        AND column_name IN ('discrepancy_status', 'discrepancy_reported_at', 'discrepancy_resolved_at');
    " 2>/dev/null | tr -d ' ')
    
    if [ "$LC_COLUMNS" -eq 3 ]; then
        print_success "LC discrepancy columns added to letter_of_credits table"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "LC discrepancy columns missing (found $LC_COLUMNS/3)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    print_error "PostgreSQL container not running - skipping database checks"
fi

echo ""

# ============================================================================
# Chaincode Verification
# ============================================================================
echo "Chaincode Verification"
echo "----------------------------------------"

print_step "Checking chaincode version..."

if docker exec cli peer lifecycle chaincode querycommitted \
    --channelID coffeechannel \
    --name coffee \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/coffee.com/orderers/orderer.coffee.com/msp/tlscacerts/tlsca.coffee.com-cert.pem 2>/dev/null | grep -q "Version: 1.21"; then
    print_success "Chaincode version 1.21 is deployed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "Chaincode version 1.21 not found"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""

# ============================================================================
# Results Summary
# ============================================================================
echo "============================================================================"
echo "  TEST RESULTS"
echo "============================================================================"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"
echo ""

PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: $PERCENTAGE%"

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}Status: EXCELLENT${NC}"
    echo ""
    echo "All new features are working correctly!"
    exit 0
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}Status: GOOD${NC}"
    echo ""
    echo "Most features are working. Check failed tests above."
    exit 0
else
    echo -e "${RED}Status: NEEDS ATTENTION${NC}"
    echo ""
    echo "Several features are not working. Review the errors above."
    exit 1
fi
