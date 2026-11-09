#!/bin/bash

################################################################################
# COMPREHENSIVE PORTAL DATA LOADING VERIFICATION
# Tests ALL 61+ tabs and subtabs across 7 portals
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
API_BASE="http://localhost:3001/api/v1"

# Test counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

log_header() {
    echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${NC}\n"
}

log_section() {
    echo -e "\n${BOLD}${MAGENTA}▶▶▶ $1${NC}"
}

test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local token="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    local response=$(curl -s -H "Authorization: Bearer $token" "$API_BASE$endpoint")
    local success=$(echo "$response" | jq -r '.success' 2>/dev/null || echo "false")
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}  ✓${NC} $name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}  ✗${NC} $name - $endpoint"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

################################################################################
# MAIN
################################################################################

log_header "COMPREHENSIVE PORTAL DATA LOADING VERIFICATION"
echo "Testing ALL 61+ tabs and subtabs across 7 portals"
echo ""

# Authenticate
echo "🔐 Authenticating..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo ""

################################################################################
# 1. EXPORTER PORTAL (8 tabs)
################################################################################

log_header "1. EXPORTER PORTAL (8 tabs)"

log_section "Tab 0: Dashboard"
test_endpoint "Dashboard" "/portals/exporters/dashboard" "$TOKEN"

log_section "Tab 1: Contracts"
test_endpoint "Contracts list" "/contracts?exporter=true" "$TOKEN"

log_section "Tab 2: Forex & Banking"
test_endpoint "Forex allocations" "/exporters/forex" "$TOKEN"
test_endpoint "LC status" "/exporters/lc" "$TOKEN"

log_section "Tab 3: Shipments"
test_endpoint "Shipments list" "/shipments" "$TOKEN"

log_section "Tab 4: Customs"
test_endpoint "Customs declarations" "/customs/declarations" "$TOKEN"

log_section "Tab 5: LC & Payments"
test_endpoint "LCs" "/banking/lc" "$TOKEN"
test_endpoint "Payments" "/payments" "$TOKEN"

log_section "Tab 6: Reports"
test_endpoint "Analytics/Reports" "/analytics/dashboard" "$TOKEN"

log_section "Tab 7: Audit Trail"
test_endpoint "Audit log" "/audit/activities" "$TOKEN"

################################################################################
# 2. ECTA PORTAL (10 tabs + 5 subtabs)
################################################################################

log_header "2. ECTA PORTAL (10 tabs + 5 Quality Control subtabs)"

log_section "Tab 0: Pending Applications"
test_endpoint "Pending applications" "/exporters?status=pending" "$TOKEN"

log_section "Tab 1: Approved Exporters"
test_endpoint "Approved exporters" "/exporters?status=approved" "$TOKEN"

log_section "Tab 2: Sales Contracts"
test_endpoint "Contracts" "/contracts" "$TOKEN"

log_section "Tab 3: Quality Control (+ 5 subtabs)"
test_endpoint "All inspections" "/quality/inspections" "$TOKEN"
test_endpoint "Subtab - PENDING" "/quality/inspections?status=PENDING" "$TOKEN"
test_endpoint "Subtab - SCHEDULED" "/quality/inspections?status=SCHEDULED" "$TOKEN"
test_endpoint "Subtab - UNDER_REVIEW" "/quality/inspections?status=UNDER_REVIEW" "$TOKEN"
test_endpoint "Subtab - APPROVED" "/quality/inspections?status=APPROVED" "$TOKEN"
test_endpoint "Subtab - REJECTED" "/quality/inspections?status=REJECTED" "$TOKEN"

log_section "Tab 4: License Renewals"
test_endpoint "Expiring licenses" "/exporters?licenses_expiring=true" "$TOKEN"

log_section "Tab 5: Analytics"
test_endpoint "ECTA analytics" "/analytics/dashboard" "$TOKEN"

log_section "Tab 6: Pre-shipment Inspection"
test_endpoint "Pre-shipment inspections" "/quality/inspections?type=pre-shipment" "$TOKEN"

log_section "Tab 7: User Management"
test_endpoint "Users list" "/users" "$TOKEN"

log_section "Tab 8: Audit Trail"
test_endpoint "Audit log" "/audit/activities" "$TOKEN"

log_section "Tab 9: Post-Delivery Audits"
test_endpoint "Post-delivery audits" "/quality/post-delivery-audits" "$TOKEN"

################################################################################
# 3. ECX PORTAL (4 tabs)
################################################################################

log_header "3. ECX PORTAL (4 tabs)"

log_section "Tab 0: Coffee Lots"
test_endpoint "Coffee lots" "/ecx/lots" "$TOKEN"

log_section "Tab 1: Market Prices"
test_endpoint "Market prices" "/ecx/prices" "$TOKEN"

log_section "Tab 2: Grading Standards"
test_endpoint "Grading standards" "/ecx/grading-standards" "$TOKEN"

log_section "Tab 3: User Management"
test_endpoint "Users list" "/users" "$TOKEN"

################################################################################
# 4. BANKS PORTAL (4 parent + 9 child tabs + 4 payment method subtabs)
################################################################################

log_header "4. BANKS PORTAL (4 parent + 9 child + 4 payment method subtabs)"

log_section "Parent 1: Payment Operations"

log_section "  Child 0: Payment Methods (+ 4 subtabs)"
test_endpoint "All LCs" "/banking/lc" "$TOKEN"
test_endpoint "Payment Method - LC" "/banking/lc?type=LC" "$TOKEN"
test_endpoint "Payment Method - CAD" "/contracts?payment_type=CAD" "$TOKEN"
test_endpoint "Payment Method - ADVANCE" "/payments?type=ADVANCE" "$TOKEN"
test_endpoint "Payment Method - CONSIGNMENT" "/contracts?payment_type=CONSIGNMENT" "$TOKEN"

log_section "  Child 2: Document Examination"
test_endpoint "Documents to examine" "/banking/lc?status=DOCUMENTS_SUBMITTED" "$TOKEN"

log_section "  Child 3: Payment Release"
test_endpoint "Payments to release" "/payments?status=APPROVED" "$TOKEN"

log_section "  Child 9: LC Discrepancies"
test_endpoint "LC discrepancies" "/banking/lc/discrepancies" "$TOKEN"

log_section "Parent 2: Forex & Settlements"

log_section "  Child 1: Forex Allocations"
test_endpoint "Forex allocations" "/banking/forex" "$TOKEN"

log_section "  Child 5: LC Settlements"
test_endpoint "LC settlements" "/banking/lc?status=SETTLED" "$TOKEN"

log_section "Parent 3: Communication & Issues"

log_section "  Child 4: SWIFT Messages"
test_endpoint "SWIFT messages" "/payments/swift" "$TOKEN"

log_section "Parent 4: System Management"

log_section "  Child 6: Analytics"
test_endpoint "Banking analytics" "/analytics/dashboard" "$TOKEN"

log_section "  Child 7: User Management"
test_endpoint "Users list" "/users" "$TOKEN"

log_section "  Child 8: Audit Trail"
test_endpoint "Audit log" "/audit/activities" "$TOKEN"

################################################################################
# 5. NBE PORTAL (8 tabs + 9 subtabs)
################################################################################

log_header "5. NBE PORTAL (8 tabs + 9 subtabs)"

log_section "Tab 0: Forex Monitoring (+ 3 subtabs)"
test_endpoint "All forex" "/banking/forex" "$TOKEN"
test_endpoint "Subtab - Allocated" "/banking/forex?status=ALLOCATED" "$TOKEN"
test_endpoint "Subtab - Requested" "/banking/forex?status=REQUESTED" "$TOKEN"

log_section "Tab 1: Exchange Rates"
test_endpoint "Exchange rates" "/forex/rates" "$TOKEN"

log_section "Tab 2: SWIFT Monitoring (+ 3 subtabs)"
test_endpoint "All SWIFT messages" "/payments/swift" "$TOKEN"
test_endpoint "Subtab - Analytics" "/payments/swift/analytics" "$TOKEN"
test_endpoint "Subtab - Compliance" "/payments/swift/compliance" "$TOKEN"

log_section "Tab 3: Forex Repatriation"
test_endpoint "Forex repatriation" "/payments/repatriation" "$TOKEN"

log_section "Tab 4: Policy & Compliance"
test_endpoint "Compliance dashboard" "/compliance/dashboard" "$TOKEN"

log_section "Tab 5: Analytics (+ 3 subtabs)"
test_endpoint "Overview" "/analytics/dashboard" "$TOKEN"
test_endpoint "Subtab - Trends" "/analytics/trends" "$TOKEN"
test_endpoint "Subtab - Breakdown" "/analytics/breakdown" "$TOKEN"

log_section "Tab 6: User Management"
test_endpoint "Users list" "/users" "$TOKEN"

log_section "Tab 7: Audit Trail"
test_endpoint "Audit log" "/audit/activities" "$TOKEN"

################################################################################
# 6. CUSTOMS PORTAL (8 tabs)
################################################################################

log_header "6. CUSTOMS PORTAL (8 tabs)"

log_section "Tab 0: Submitted"
test_endpoint "Submitted declarations" "/customs/declarations?status=SUBMITTED" "$TOKEN"

log_section "Tab 1: Inspecting"
test_endpoint "Inspecting declarations" "/customs/declarations?status=INSPECTING" "$TOKEN"

log_section "Tab 2: Under Review"
test_endpoint "Under review declarations" "/customs/declarations?status=UNDER_REVIEW" "$TOKEN"

log_section "Tab 3: Cleared"
test_endpoint "Cleared declarations" "/customs/declarations?status=CLEARED" "$TOKEN"

log_section "Tab 4: Rejected"
test_endpoint "Rejected declarations" "/customs/declarations?status=REJECTED" "$TOKEN"

log_section "Tab 5: Border Crossing"
test_endpoint "Border crossings" "/customs/border-crossings" "$TOKEN"

log_section "Tab 6: User Management"
test_endpoint "Users list" "/users" "$TOKEN"

log_section "Tab 7: Audit Trail"
test_endpoint "Audit log" "/audit/activities" "$TOKEN"

################################################################################
# 7. SHIPPING PORTAL (10 tabs)
################################################################################

log_header "7. SHIPPING PORTAL (10 tabs - lifecycle based)"

log_section "Tab 0: Clearance"
test_endpoint "Customs cleared" "/shipments?status=CUSTOMS_CLEARED" "$TOKEN"

log_section "Tab 1: Land Transport"
test_endpoint "Land transport" "/shipments?status=LAND_TRANSPORT" "$TOKEN"

log_section "Tab 2: Port Arrival"
test_endpoint "Port arrived" "/shipments?status=PORT_ARRIVED" "$TOKEN"

log_section "Tab 3: Container Stuffing"
test_endpoint "Container stuffed" "/shipments?status=CONTAINER_STUFFED" "$TOKEN"

log_section "Tab 4: Vessel Loading"
test_endpoint "Vessel loaded" "/shipments?status=VESSEL_LOADED" "$TOKEN"

log_section "Tab 5: Departed"
test_endpoint "Departed" "/shipments?status=DEPARTED" "$TOKEN"

log_section "Tab 6: In Transit"
test_endpoint "In transit" "/shipments?status=IN_TRANSIT" "$TOKEN"

log_section "Tab 7: Destination Arrived"
test_endpoint "Destination arrived" "/shipments?status=DESTINATION_ARRIVED" "$TOKEN"

log_section "Tab 8: Delivered"
test_endpoint "Delivered" "/shipments?status=DELIVERED" "$TOKEN"

log_section "Tab 9: Users"
test_endpoint "Users list" "/users" "$TOKEN"

################################################################################
# SUMMARY
################################################################################

log_header "VERIFICATION COMPLETE"

echo -e "${BOLD}Total Endpoints Tested:${NC} $TOTAL_CHECKS"
echo -e "${GREEN}${BOLD}Passed:${NC} $PASSED_CHECKS"
echo -e "${RED}${BOLD}Failed:${NC} $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ ALL PORTAL TABS ARE LOADING DATA SUCCESSFULLY!${NC}"
    exit 0
else
    SUCCESS_RATE=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    echo -e "${YELLOW}${BOLD}⚠️  Success Rate: ${SUCCESS_RATE}%${NC}"
    echo -e "${YELLOW}Some endpoints need attention. Check failed tests above.${NC}"
    exit 1
fi
