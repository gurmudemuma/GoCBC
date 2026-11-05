#!/bin/bash

# Portal Test with Existing Data - Tests all portal endpoints that should work
# Uses existing test data instead of creating new entities

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    TOTAL=$((TOTAL + 1))
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}  ✓ $name${NC} (HTTP $response)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}  ✗ $name${NC} (HTTP $response, expected $expected_status)"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Portal Endpoints Test - Using Existing Data            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}PORTAL DASHBOARDS${NC}"
test_endpoint "Exporters Portal" "/portals/exporters"
test_endpoint "ECTA Portal" "/portals/ecta"
test_endpoint "ECX Portal" "/portals/ecx"
test_endpoint "Banks Portal" "/portals/banks"
test_endpoint "NBE Portal" "/portals/nbe"
test_endpoint "Customs Portal" "/portals/customs"
test_endpoint "Shipping Portal" "/portals/shipping"
echo ""

echo -e "${CYAN}CONTRACT ENDPOINTS${NC}"
test_endpoint "All Contracts" "/contracts"
test_endpoint "Pending Contracts" "/contracts?status=PENDING"
test_endpoint "Approved Contracts" "/contracts?status=APPROVED"
echo ""

echo -e "${CYAN}LC MANAGEMENT${NC}"
test_endpoint "All LCs" "/banking/lc"
test_endpoint "Requested LCs" "/banking/lc?status=REQUESTED"
test_endpoint "Approved LCs" "/banking/lc?status=APPROVED"
test_endpoint "Issued LCs" "/banking/lc?status=ISSUED"
test_endpoint "Forex Allocated LCs" "/banking/lc?status=FOREX_ALLOCATED"
test_endpoint "Utilized LCs" "/banking/lc?status=UTILIZED"
echo ""

echo -e "${CYAN}FOREX & NBE${NC}"
test_endpoint "Forex Allocations" "/forex"
test_endpoint "Exchange Rates" "/forex/rates"
test_endpoint "USD Rate" "/forex/rates/USD/current"
test_endpoint "Retention Policy" "/retention/policy/COFFEE"
echo ""

echo -e "${CYAN}QUALITY & INSPECTIONS${NC}"
test_endpoint "Quality Inspections" "/quality-inspections"
test_endpoint "Quality Inspections (query)" "/quality"
echo ""

echo -e "${CYAN}PAYMENTS${NC}"
test_endpoint "All Payments" "/payments"
test_endpoint "Payment Methods" "/payment-methods"
echo ""

echo -e "${CYAN}SHIPPING & LOGISTICS${NC}"
test_endpoint "Shipments" "/shipments"
test_endpoint "Land Transport" "/land-transport"
echo ""

echo -e "${CYAN}CUSTOMS & COMPLIANCE${NC}"
test_endpoint "Customs Clearance" "/customs/clearance"
test_endpoint "Document Verification" "/customs/document-verification"
echo ""

echo -e "${CYAN}CERTIFICATES & DOCUMENTS${NC}"
test_endpoint "Certificates" "/certificates"
test_endpoint "Documents" "/documents"
echo ""

echo -e "${CYAN}WAREHOUSE & ECX${NC}"
test_endpoint "Warehouse" "/warehouse"
test_endpoint "Market Prices" "/market"
echo ""

echo -e "${CYAN}APPLICATIONS${NC}"
test_endpoint "Exporter Applications" "/exporters/exporter-applications"
test_endpoint "Applications (alias)" "/applications"
echo ""

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                                ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║ Total Tests:     $(printf '%3d' $TOTAL)                                            ║${NC}"
echo -e "${BLUE}║ ${GREEN}Passed:          $(printf '%3d' $PASSED)${BLUE}                                            ║${NC}"
echo -e "${BLUE}║ ${RED}Failed:          $(printf '%3d' $FAILED)${BLUE}                                            ║${NC}"
echo -e "${BLUE}║ ${CYAN}Success Rate:    $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%${BLUE}                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL PORTAL ENDPOINTS WORKING!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some endpoints need attention${NC}"
    exit 1
fi
