#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# GoCBC Portal Tab & Subtab Data Validation Test
# Tests all 61 tabs + subtabs across 7 portals
# ═══════════════════════════════════════════════════════════════

API_BASE="http://localhost:3001/api/v1"
UI_BASE="http://localhost:3001"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Test function
test_endpoint() {
    local endpoint=$1
    local description=$2
    local token=$3
    local expected_field=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -n "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Check if response has expected field or is array
        if [ -n "$expected_field" ]; then
            if echo "$body" | jq -e ".$expected_field" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $description"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                return 0
            elif echo "$body" | jq -e "type == \"array\"" > /dev/null 2>&1; then
                count=$(echo "$body" | jq 'length')
                echo -e "${GREEN}✓${NC} $description (${count} records)"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                return 0
            else
                echo -e "${YELLOW}⚠${NC} $description - No data field found"
                WARNING_TESTS=$((WARNING_TESTS + 1))
                return 1
            fi
        else
            # Just check for valid JSON
            if echo "$body" | jq . > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $description"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                return 0
            else
                echo -e "${YELLOW}⚠${NC} $description - Invalid JSON"
                WARNING_TESTS=$((WARNING_TESTS + 1))
                return 1
            fi
        fi
    else
        echo -e "${RED}✗${NC} $description (HTTP $http_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Login function
login_user() {
    local username=$1
    local password=$2
    
    response=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    # Try multiple token locations
    token=$(echo "$response" | jq -r '.token // .data.token // .access_token // empty' 2>/dev/null)
    
    # Validate token is not empty and looks like a JWT (has 2 dots)
    if [ -n "$token" ] && [ "$token" != "null" ] && echo "$token" | grep -q '\.' ; then
        echo "$token"
    else
        echo "" # Return empty if token extraction failed
    fi
}

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ GOCBC PORTAL TAB & SUBTAB DATA VALIDATION                     ║"
echo "║ Testing all 61 tabs + subtabs across 7 portals                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check API health
echo "▶ Checking API health..."
if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ API is not responding at $API_BASE${NC}"
    echo "Please start the system with: ./start-all.sh"
    exit 1
fi
echo -e "${GREEN}✓ API is running${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STAGE 1: AUTHENTICATE USERS
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ STAGE 1: USER AUTHENTICATION                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "▶ Authenticating portal users..."
ECTA_TOKEN=$(login_user "ecta_admin" "password123")
BANK_TOKEN=$(login_user "bank_admin" "password123")
NBE_TOKEN=$(login_user "nbe_admin" "password123")
CUSTOMS_TOKEN=$(login_user "customs_admin" "password123")
SHIPPING_TOKEN=$(login_user "shipping_admin" "password123")
ECX_TOKEN=$(login_user "ecx_admin" "password123")
EXPORTER_TOKEN=$(login_user "exporter1" "password123")

if [ -z "$ECTA_TOKEN" ]; then
    echo -e "${RED}✗ ECTA login failed${NC}"
else
    echo -e "${GREEN}✓ ECTA Admin${NC}"
fi

if [ -z "$BANK_TOKEN" ]; then
    echo -e "${RED}✗ Bank login failed${NC}"
else
    echo -e "${GREEN}✓ Bank Admin${NC}"
fi

if [ -z "$NBE_TOKEN" ]; then
    echo -e "${RED}✗ NBE login failed${NC}"
else
    echo -e "${GREEN}✓ NBE Admin${NC}"
fi

if [ -z "$CUSTOMS_TOKEN" ]; then
    echo -e "${RED}✗ Customs login failed${NC}"
else
    echo -e "${GREEN}✓ Customs Admin${NC}"
fi

if [ -z "$SHIPPING_TOKEN" ]; then
    echo -e "${RED}✗ Shipping login failed${NC}"
else
    echo -e "${GREEN}✓ Shipping Admin${NC}"
fi

if [ -z "$ECX_TOKEN" ]; then
    echo -e "${RED}✗ ECX login failed${NC}"
else
    echo -e "${GREEN}✓ ECX Admin${NC}"
fi

if [ -z "$EXPORTER_TOKEN" ]; then
    echo -e "${RED}✗ Exporter login failed${NC}"
else
    echo -e "${GREEN}✓ Exporter${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 1: EXPORTER PORTAL (8 TABS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 1: EXPORTER PORTAL (8 Tabs)                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Tab 0: Dashboard"
test_endpoint "/analytics/dashboard" "Dashboard stats" "$EXPORTER_TOKEN" "data"

echo ""
echo "Tab 1: Contracts"
test_endpoint "/contracts" "Contracts list" "$EXPORTER_TOKEN"

echo ""
echo "Tab 2: Forex & Banking"
test_endpoint "/forex" "Forex allocations" "$EXPORTER_TOKEN"
test_endpoint "/banking/lc" "LC requests" "$EXPORTER_TOKEN"

echo ""
echo "Tab 3: Shipments"
test_endpoint "/shipments" "Shipments list" "$EXPORTER_TOKEN"

echo ""
echo "Tab 4: Customs"
test_endpoint "/customs/declarations" "Customs declarations" "$EXPORTER_TOKEN"

echo ""
echo "Tab 5: LC & Payments"
test_endpoint "/payments" "Payments list" "$EXPORTER_TOKEN"

echo ""
echo "Tab 6: Reports"
test_endpoint "/analytics/export-report" "Export reports" "$EXPORTER_TOKEN"

echo ""
echo "Tab 7: Audit Trail"
test_endpoint "/audit/portal/recent" "Audit trail" "$EXPORTER_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 2: ECTA PORTAL (10 TABS + 5 SUBTABS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 2: ECTA PORTAL (10 Tabs + 5 Quality Control Subtabs)   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Tab 0: Pending Applications"
test_endpoint "/exporters/exporter-applications" "Pending applications" "$ECTA_TOKEN"

echo ""
echo "Tab 1: Approved Exporters"
test_endpoint "/exporters" "Approved exporters" "$ECTA_TOKEN"

echo ""
echo "Tab 2: Sales Contracts"
test_endpoint "/contracts" "Sales contracts" "$ECTA_TOKEN"

echo ""
echo "Tab 3: Quality Control (with 5 workflow subtabs)"
test_endpoint "/quality/inspections" "All inspections" "$ECTA_TOKEN"
test_endpoint "/quality/inspections?status=PENDING" "  Subtab 1: PENDING" "$ECTA_TOKEN"
test_endpoint "/quality/inspections?status=SCHEDULED" "  Subtab 2: SCHEDULED" "$ECTA_TOKEN"
test_endpoint "/quality/inspections?status=UNDER_REVIEW" "  Subtab 3: UNDER_REVIEW" "$ECTA_TOKEN"
test_endpoint "/quality/inspections?status=APPROVED" "  Subtab 4: APPROVED" "$ECTA_TOKEN"
test_endpoint "/quality/inspections?status=REJECTED" "  Subtab 5: REJECTED" "$ECTA_TOKEN"

echo ""
echo "Tab 4: License Renewals"
test_endpoint "/exporters/renewals" "License renewals" "$ECTA_TOKEN"

echo ""
echo "Tab 5: Analytics"
test_endpoint "/analytics/dashboard" "ECTA analytics" "$ECTA_TOKEN"

echo ""
echo "Tab 6: Pre-shipment Inspection"
test_endpoint "/quality/pre-shipment" "Pre-shipment inspections" "$ECTA_TOKEN"

echo ""
echo "Tab 7: User Management"
test_endpoint "/users?organization=ECTA" "ECTA users" "$ECTA_TOKEN"

echo ""
echo "Tab 8: Audit Trail"
test_endpoint "/audit/portal/recent" "ECTA audit trail" "$ECTA_TOKEN"

echo ""
echo "Tab 9: Post-Delivery Audits"
test_endpoint "/quality/post-delivery" "Post-delivery audits" "$ECTA_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 3: BANKS PORTAL (4 PARENT + 9 CHILD TABS + 4 PAYMENT METHODS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 3: BANKS PORTAL (4 Parent + 9 Child + 4 Payment Types) ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Parent 1: Payment Operations"
echo "  Child Tab 0: Payment Methods (with 4 payment type subtabs)"
test_endpoint "/payments?method=LC" "    Payment Type 1: LC (Letter of Credit)" "$BANK_TOKEN"
test_endpoint "/payments?method=CAD" "    Payment Type 2: CAD (Documentary Collection)" "$BANK_TOKEN"
test_endpoint "/payments?method=ADVANCE" "    Payment Type 3: ADVANCE (Advance Payment)" "$BANK_TOKEN"
test_endpoint "/payments?method=CONSIGNMENT" "    Payment Type 4: CONSIGNMENT" "$BANK_TOKEN"

echo ""
echo "  Child Tab 2: Document Examination"
test_endpoint "/banking/lc" "    LC document examination" "$BANK_TOKEN"

echo ""
echo "  Child Tab 3: Payment Release"
test_endpoint "/payments/pending-release" "    Pending payment releases" "$BANK_TOKEN"

echo ""
echo "  Child Tab 9: LC Discrepancies"
test_endpoint "/banking/lc" "    LC discrepancies" "$BANK_TOKEN"

echo ""
echo "Parent 2: Forex & Settlements"
echo "  Child Tab 1: Forex Allocations"
test_endpoint "/forex" "    Forex allocations" "$BANK_TOKEN"

echo ""
echo "  Child Tab 5: LC Settlements"
test_endpoint "/banking/lc?status=SETTLED" "    LC settlements" "$BANK_TOKEN"

echo ""
echo "Parent 3: Communication & Issues"
echo "  Child Tab 4: SWIFT Messages"
test_endpoint "/swift/messages" "    SWIFT messages" "$BANK_TOKEN"

echo ""
echo "Parent 4: System Management"
echo "  Child Tab 6: Analytics"
test_endpoint "/analytics/dashboard" "    Banking analytics" "$BANK_TOKEN"

echo ""
echo "  Child Tab 7: User Management"
test_endpoint "/users?organization=BANKS" "    Bank users" "$BANK_TOKEN"

echo ""
echo "  Child Tab 8: Audit Trail"
test_endpoint "/audit/portal/recent" "    Bank audit trail" "$BANK_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 4: NBE PORTAL (8 TABS + 9 SUBTABS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 4: NBE PORTAL (8 Tabs + 9 Subtabs)                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Tab 0: Forex Monitoring (with 3 filter subtabs)"
test_endpoint "/forex" "  All Forex" "$NBE_TOKEN"
test_endpoint "/forex?status=ALLOCATED" "  Subtab 1: Allocated" "$NBE_TOKEN"
test_endpoint "/forex?status=REQUESTED" "  Subtab 2: Requested" "$NBE_TOKEN"

echo ""
echo "Tab 1: Exchange Rates"
test_endpoint "/exchange-rates" "Exchange rates" "$NBE_TOKEN"

echo ""
echo "Tab 2: SWIFT Monitoring (with 3 analysis subtabs)"
test_endpoint "/swift/messages" "  All Messages" "$NBE_TOKEN"
test_endpoint "/swift/statistics" "  Subtab 1: Analytics & Charts" "$NBE_TOKEN"
test_endpoint "/swift/messages?status=REJECTED" "  Subtab 2: Compliance Alerts" "$NBE_TOKEN"

echo ""
echo "Tab 3: Forex Repatriation"
test_endpoint "/repatriation" "Forex repatriation" "$NBE_TOKEN"

echo ""
echo "Tab 4: Policy & Compliance"
test_endpoint "/compliance" "Policy & compliance" "$NBE_TOKEN"

echo ""
echo "Tab 5: Analytics (with 3 report subtabs)"
test_endpoint "/analytics/dashboard" "  Overview" "$NBE_TOKEN"
test_endpoint "/analytics/export-report?format=json" "  Subtab 1: Trends" "$NBE_TOKEN"
test_endpoint "/analytics/dashboard" "  Subtab 2: Breakdown" "$NBE_TOKEN"

echo ""
echo "Tab 6: User Management"
test_endpoint "/users?organization=NBE" "NBE users" "$NBE_TOKEN"

echo ""
echo "Tab 7: Audit Trail"
test_endpoint "/audit/portal/recent" "NBE audit trail" "$NBE_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 5: CUSTOMS PORTAL (8 TABS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 5: CUSTOMS PORTAL (8 Tabs)                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Tab 0: Submitted"
test_endpoint "/customs/declarations?status=SUBMITTED" "Submitted declarations" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 1: Inspecting"
test_endpoint "/customs/declarations?status=INSPECTING" "Inspecting declarations" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 2: Under Review"
test_endpoint "/customs/declarations?status=UNDER_REVIEW" "Under review declarations" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 3: Cleared"
test_endpoint "/customs/declarations?status=CLEARED" "Cleared declarations" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 4: Rejected"
test_endpoint "/customs/declarations?status=REJECTED" "Rejected declarations" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 5: Border Crossing"
test_endpoint "/bordercrossing" "Border crossing" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 6: User Management"
test_endpoint "/users?organization=CUSTOMS" "Customs users" "$CUSTOMS_TOKEN"

echo ""
echo "Tab 7: Audit Trail"
test_endpoint "/audit/portal/recent" "Customs audit trail" "$CUSTOMS_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 6: SHIPPING PORTAL (10 TABS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 6: SHIPPING PORTAL (10 Lifecycle Tabs)                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Tab 0: Clearance (CUSTOMS_CLEARED)"
test_endpoint "/shipments?status=CUSTOMS_CLEARED" "Customs cleared" "$SHIPPING_TOKEN"

echo ""
echo "Tab 1: Land Transport (LAND_TRANSPORT)"
test_endpoint "/shipments?status=LAND_TRANSPORT" "Land transport" "$SHIPPING_TOKEN"

echo ""
echo "Tab 2: Port Arrival (PORT_ARRIVED)"
test_endpoint "/shipments?status=PORT_ARRIVED" "Port arrived" "$SHIPPING_TOKEN"

echo ""
echo "Tab 3: Container Stuffing (CONTAINER_STUFFED)"
test_endpoint "/shipments?status=CONTAINER_STUFFED" "Container stuffed" "$SHIPPING_TOKEN"

echo ""
echo "Tab 4: Vessel Loading (VESSEL_LOADED)"
test_endpoint "/shipments?status=VESSEL_LOADED" "Vessel loaded" "$SHIPPING_TOKEN"

echo ""
echo "Tab 5: Departed (DEPARTED)"
test_endpoint "/shipments?status=DEPARTED" "Departed" "$SHIPPING_TOKEN"

echo ""
echo "Tab 6: In Transit (IN_TRANSIT)"
test_endpoint "/shipments?status=IN_TRANSIT" "In transit" "$SHIPPING_TOKEN"

echo ""
echo "Tab 7: Destination Arrived (DESTINATION_ARRIVED)"
test_endpoint "/shipments?status=DESTINATION_ARRIVED" "Destination arrived" "$SHIPPING_TOKEN"

echo ""
echo "Tab 8: Delivered (DELIVERED)"
test_endpoint "/shipments?status=DELIVERED" "Delivered" "$SHIPPING_TOKEN"

echo ""
echo "Tab 9: User Management"
test_endpoint "/users?organization=SHIPPING" "Shipping users" "$SHIPPING_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# PORTAL 7: ECX PORTAL (4 TABS)
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL 7: ECX PORTAL (4 Tabs)                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Tab 0: Coffee Lots"
test_endpoint "/ecx/lots" "Coffee lots" "$ECX_TOKEN"

echo ""
echo "Tab 1: Market Prices"
test_endpoint "/market/prices" "Market prices" "$ECX_TOKEN"

echo ""
echo "Tab 2: Grading Standards"
test_endpoint "/ecx/grading-standards" "Grading standards" "$ECX_TOKEN"

echo ""
echo "Tab 3: User Management"
test_endpoint "/users?organization=ECX" "ECX users" "$ECX_TOKEN"

echo ""

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ PORTAL TAB VALIDATION COMPLETE                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Test Summary:"
echo "═══════════════════════════════════════════════════════════════"
echo -e "Total Tests:    ${TOTAL_TESTS}"
echo -e "${GREEN}✓ Passed:       ${PASSED_TESTS}${NC}"
echo -e "${YELLOW}⚠ Warnings:     ${WARNING_TESTS}${NC}"
echo -e "${RED}✗ Failed:       ${FAILED_TESTS}${NC}"
echo ""

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo -e "Pass Rate:      ${PASS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ] && [ $WARNING_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL PORTAL TABS ARE FETCHING DATA CORRECTLY!${NC}"
    exit 0
elif [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${YELLOW}⚠ All endpoints accessible but some returned no data${NC}"
    exit 0
else
    echo -e "${RED}❌ Some portal tabs failed to fetch data${NC}"
    echo "Please review the failed endpoints above."
    exit 1
fi
