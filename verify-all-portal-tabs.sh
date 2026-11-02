#!/bin/bash

# Comprehensive Portal Tabs Data Verification & Population Script
# Tests every tab and subtab, populates missing data

set -e

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Comprehensive Portal Tabs Verification & Data Population    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

TABS_TESTED=0
TABS_WITH_DATA=0
TABS_EMPTY=0
TABS_ERROR=0

# Function to test endpoint and check for data
test_endpoint() {
    local portal="$1"
    local tab="$2"
    local endpoint="$3"
    
    TABS_TESTED=$((TABS_TESTED + 1))
    
    response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL$endpoint" 2>/dev/null)
    
    if [ -z "$response" ]; then
        echo -e "${RED}  ✗ $portal → $tab${NC} - No response"
        TABS_ERROR=$((TABS_ERROR + 1))
        echo "$portal|$tab|$endpoint|ERROR|No response" >> /tmp/tabs-status.csv
        return 1
    fi
    
    success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [ "$success" != "true" ]; then
        error_msg=$(echo "$response" | jq -r '.error.message // .error // "Unknown error"' 2>/dev/null)
        echo -e "${RED}  ✗ $portal → $tab${NC} - Error: $error_msg"
        TABS_ERROR=$((TABS_ERROR + 1))
        echo "$portal|$tab|$endpoint|ERROR|$error_msg" >> /tmp/tabs-status.csv
        return 1
    fi
    
    # Check for data
    count=$(echo "$response" | jq -r '.data | length // 0' 2>/dev/null)
    
    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}  ✓ $portal → $tab${NC} - $count records"
        TABS_WITH_DATA=$((TABS_WITH_DATA + 1))
        echo "$portal|$tab|$endpoint|HAS_DATA|$count" >> /tmp/tabs-status.csv
        return 0
    else
        echo -e "${YELLOW}  ⚠ $portal → $tab${NC} - No data (endpoint works)"
        TABS_EMPTY=$((TABS_EMPTY + 1))
        echo "$portal|$tab|$endpoint|EMPTY|0" >> /tmp/tabs-status.csv
        return 2
    fi
}

# Initialize CSV
echo "Portal|Tab|Endpoint|Status|Count" > /tmp/tabs-status.csv

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}1. BANKS PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "Banks" "Dashboard" "/portals/banks"
test_endpoint "Banks" "All LCs" "/banking/lcs"
test_endpoint "Banks" "Requested LCs" "/banking/lcs?status=REQUESTED"
test_endpoint "Banks" "Approved LCs" "/banking/lcs?status=APPROVED"
test_endpoint "Banks" "Issued LCs" "/banking/lcs?status=ISSUED"
test_endpoint "Banks" "Forex Allocated" "/banking/lcs?status=FOREX_ALLOCATED"
test_endpoint "Banks" "Utilized LCs" "/banking/lcs?status=UTILIZED"
test_endpoint "Banks" "Retention Dashboard" "/portals/banks/retention"
test_endpoint "Banks" "Retention Payments" "/banking/retention-payments"
test_endpoint "Banks" "Payment Methods" "/payment-methods"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}2. NBE PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "NBE" "Dashboard" "/portals/nbe"
test_endpoint "NBE" "All Forex" "/forex/allocations"
test_endpoint "NBE" "Pending Forex" "/forex/allocations?status=PENDING"
test_endpoint "NBE" "Approved Forex" "/forex/allocations?status=APPROVED"
test_endpoint "NBE" "Exchange Rates" "/exchange-rates"
test_endpoint "NBE" "USD Rate" "/exchange-rates/USD"
test_endpoint "NBE" "Retention Policy" "/retention/policy"
test_endpoint "NBE" "Policy History" "/retention/policy/history"
test_endpoint "NBE" "Compliance Dashboard" "/compliance/dashboard"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}3. EXPORTERS PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "Exporters" "Dashboard" "/portals/exporters/test-admin"
test_endpoint "Exporters" "All Contracts" "/contracts"
test_endpoint "Exporters" "Pending Contracts" "/contracts?status=PENDING"
test_endpoint "Exporters" "Approved Contracts" "/contracts?status=APPROVED"
test_endpoint "Exporters" "Rejected Contracts" "/contracts?status=REJECTED"
test_endpoint "Exporters" "My LCs" "/banking/lcs?exporterId=test-admin"
test_endpoint "Exporters" "All Shipments" "/shipments"
test_endpoint "Exporters" "Pending Shipments" "/shipments?status=pending"
test_endpoint "Exporters" "In Transit" "/shipments?status=in_transit"
test_endpoint "Exporters" "Applications" "/exporters/applications"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}4. ECTA PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "ECTA" "Dashboard" "/portals/ecta"
test_endpoint "ECTA" "Pending Contracts" "/contracts?status=PENDING"
test_endpoint "ECTA" "Approved Contracts" "/contracts?status=APPROVED"
test_endpoint "ECTA" "Rejected Contracts" "/contracts?status=REJECTED"
test_endpoint "ECTA" "All Contracts" "/contracts"
test_endpoint "ECTA" "All Applications" "/applications"
test_endpoint "ECTA" "Pending Applications" "/exporters/applications?status=pending"
test_endpoint "ECTA" "Quality Inspections" "/quality/inspections"
test_endpoint "ECTA" "Completed Inspections" "/quality/inspections?status=completed"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}5. ECX PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "ECX" "Dashboard" "/portals/ecx"
test_endpoint "ECX" "Warehouse Lots" "/warehouse"
test_endpoint "ECX" "Available Lots" "/ecx/lots?status=available"
test_endpoint "ECX" "Released Lots" "/ecx/lots?status=released"
test_endpoint "ECX" "Market Prices" "/market"
test_endpoint "ECX" "Market Trends" "/market/trends"
test_endpoint "ECX" "ECX Market Detail" "/ecx/market"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}6. CUSTOMS PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "Customs" "Dashboard" "/portals/customs"
test_endpoint "Customs" "All Declarations" "/customs/clearance"
test_endpoint "Customs" "Pending Review" "/customs/clearance?status=pending_review"
test_endpoint "Customs" "Approved" "/customs/clearance?status=approved"
test_endpoint "Customs" "Document Verification" "/customs/document-verification"
test_endpoint "Customs" "Risk Assessment" "/customs/risk-assessment"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}7. SHIPPING PORTAL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "Shipping" "Dashboard" "/portals/shipping"
test_endpoint "Shipping" "All Shipments" "/shipping/shipments"
test_endpoint "Shipping" "Pending Pickup" "/shipping/shipments?status=pending"
test_endpoint "Shipping" "In Transit" "/shipping/shipments?status=in_transit"
test_endpoint "Shipping" "Delivered" "/shipping/shipments?status=delivered"
test_endpoint "Shipping" "Land Transport" "/land-transport"
test_endpoint "Shipping" "Active Transports" "/land-transport?status=active"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}8. QUALITY & CERTIFICATES${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

test_endpoint "Quality" "All Inspections" "/quality/inspections"
test_endpoint "Quality" "Pending" "/quality/inspections?status=pending"
test_endpoint "Quality" "Completed" "/quality/inspections?status=completed"
test_endpoint "Certificates" "All Certificates" "/certificates"
test_endpoint "Certificates" "Phytosanitary" "/certificates?type=PHYTOSANITARY"
test_endpoint "Certificates" "Certificate of Origin" "/certificates?type=CERTIFICATE_OF_ORIGIN"
test_endpoint "Documents" "All Documents" "/documents"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    VERIFICATION SUMMARY                        ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║ Total Tabs Tested:     $TABS_TESTED                                          ║${NC}"
echo -e "${BLUE}║ ${GREEN}With Data:             $TABS_WITH_DATA${BLUE}                                          ║${NC}"
echo -e "${BLUE}║ ${YELLOW}Empty (need data):     $TABS_EMPTY${BLUE}                                           ║${NC}"
echo -e "${BLUE}║ ${RED}Errors:                $TABS_ERROR${BLUE}                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${CYAN}Detailed results saved to: /tmp/tabs-status.csv${NC}"
echo ""

# Show tabs that need data population
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}TABS NEEDING DATA POPULATION:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
grep "EMPTY" /tmp/tabs-status.csv | while IFS='|' read -r portal tab endpoint status count; do
    if [ "$portal" != "Portal" ]; then
        echo -e "${YELLOW}  • $portal → $tab${NC}"
        echo -e "    Endpoint: ${CYAN}$endpoint${NC}"
    fi
done

echo ""
if [ $TABS_EMPTY -gt 0 ]; then
    echo -e "${YELLOW}⚠ $TABS_EMPTY tabs need data population${NC}"
    echo -e "${CYAN}Would you like to populate missing data? (Will create sample records)${NC}"
    exit 1
else
    echo -e "${GREEN}✓ ALL TABS HAVE DATA!${NC}"
    exit 0
fi
