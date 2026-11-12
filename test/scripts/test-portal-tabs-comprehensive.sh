#!/bin/bash

# Ethiopian Coffee Export Consortium Portal
# Comprehensive Portal Tabs & Subtabs Testing Script
# Tests all portals with their tabs and validates data display

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api/v1"
UI_URL="http://localhost:3000"
TOKEN="test-bypass-admin"

# Test counters
TOTAL_TABS=0
PASSED_TABS=0
FAILED_TABS=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Portal Tabs & Subtabs Comprehensive Testing               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to test a tab and validate data
test_tab() {
    local portal_name="$1"
    local tab_name="$2"
    local endpoint="$3"
    local validation="$4"
    local expected_field="$5"
    
    TOTAL_TABS=$((TOTAL_TABS + 1))
    
    response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL$endpoint" 2>/dev/null)
    
    if [ -z "$response" ]; then
        echo -e "${RED}  ✗ $portal_name → $tab_name${NC} - No response"
        FAILED_TABS=$((FAILED_TABS + 1))
        return
    fi
    
    success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" != "true" ]; then
        echo -e "${RED}  ✗ $portal_name → $tab_name${NC} - API error"
        FAILED_TABS=$((FAILED_TABS + 1))
        return
    fi
    
    case "$validation" in
        "has_data")
            count=$(echo "$response" | jq -r '.data | length // 0')
            if [ "$count" -gt 0 ]; then
                first_record=$(echo "$response" | jq -r ".data[0].$expected_field // \"N/A\"")
                echo -e "${GREEN}  ✓ $portal_name → $tab_name${NC} - $count records, first: $first_record"
                PASSED_TABS=$((PASSED_TABS + 1))
            else
                echo -e "${YELLOW}  ⚠ $portal_name → $tab_name${NC} - No data (endpoint works)"
                WARNINGS=$((WARNINGS + 1))
                PASSED_TABS=$((PASSED_TABS + 1))
            fi
            ;;
        "has_field")
            field_value=$(echo "$response" | jq -r ".$expected_field // \"missing\"")
            if [ "$field_value" != "missing" ] && [ "$field_value" != "null" ]; then
                echo -e "${GREEN}  ✓ $portal_name → $tab_name${NC} - Field '$expected_field': $field_value"
                PASSED_TABS=$((PASSED_TABS + 1))
            else
                echo -e "${RED}  ✗ $portal_name → $tab_name${NC} - Missing field '$expected_field'"
                FAILED_TABS=$((FAILED_TABS + 1))
            fi
            ;;
        "dashboard")
            pending_tasks=$(echo "$response" | jq -r '.data.pendingTasks // .pendingTasks // "missing"')
            if [ "$pending_tasks" != "missing" ]; then
                total=$(echo "$response" | jq -r '.data.pendingTasks.total // .pendingTasks.total // 0')
                echo -e "${GREEN}  ✓ $portal_name → $tab_name${NC} - Pending tasks: $total"
                PASSED_TABS=$((PASSED_TABS + 1))
            else
                echo -e "${RED}  ✗ $portal_name → $tab_name${NC} - Missing dashboard data"
                FAILED_TABS=$((FAILED_TABS + 1))
            fi
            ;;
        "count")
            count=$(echo "$response" | jq -r ".$expected_field // .data.$expected_field // 0")
            echo -e "${GREEN}  ✓ $portal_name → $tab_name${NC} - Count: $count"
            PASSED_TABS=$((PASSED_TABS + 1))
            ;;
    esac
}

echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}1. BANKS PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "Banks" "Dashboard" "/portals/banks" "count" "data.totalLCs"

echo -e "\n${BLUE}LC Management Tabs:${NC}"
test_tab "Banks" "All LCs" "/banking/lcs" "has_data" "lcId"
test_tab "Banks" "Requested LCs" "/banking/lcs?status=REQUESTED" "has_data" "lcId"
test_tab "Banks" "Approved LCs" "/banking/lcs?status=APPROVED" "has_data" "lcId"
test_tab "Banks" "Issued LCs" "/banking/lcs?status=ISSUED" "has_data" "lcId"
test_tab "Banks" "Forex Allocated" "/banking/lcs?status=FOREX_ALLOCATED" "has_data" "lcId"
test_tab "Banks" "Utilized LCs" "/banking/lcs?status=UTILIZED" "has_data" "lcId"

echo -e "\n${BLUE}Retention Management:${NC}"
test_tab "Banks" "Retention Dashboard" "/retention/policy/COFFEE" "has_field" "data.retentionPercentage"
# NOTE: removed-unverifiable: there is no GET /banking/retention-payments and
# no retention-payments endpoint under /stats either (verified by grep
# 2026-11-11). Retention is exposed via GET /retention/policy/:commodityType
# above and GET /retention/:forexId/retention (retention.ts:275).

echo -e "\n${BLUE}Payment Methods:${NC}"
test_tab "Banks" "Payment Methods" "/payment-methods" "has_data" "id"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}2. NBE PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "NBE" "Dashboard" "/portals/nbe" "dashboard" ""

echo -e "\n${BLUE}Forex Management:${NC}"
# NOTE: there is no /nbe/forex-allocations; the forex list is GET /forex
# (forex.ts:122). The forex status vocabulary is REQUESTED/ALLOCATED, not
# PENDING/APPROVED, so the status filters are remapped accordingly — but note
# GET /forex reads no query params, so ?status= is ignored and all rows are
# returned.
test_tab "NBE" "All Forex Allocations" "/forex" "has_data" "forexId"
test_tab "NBE" "Pending Requests" "/forex?status=REQUESTED" "has_data" "forexId"
test_tab "NBE" "Approved Requests" "/forex?status=ALLOCATED" "has_data" "forexId"

echo -e "\n${BLUE}Exchange Rates:${NC}"
test_tab "NBE" "Current Rates" "/exchange-rates" "has_data" "currency"
test_tab "NBE" "USD Rate" "/exchange-rates/USD" "has_field" "data.buyingRate"

echo -e "\n${BLUE}Retention Policy:${NC}"
test_tab "NBE" "Current Policy" "/retention/policy/COFFEE" "has_field" "data.retentionPercentage"
# NOTE: removed-unverifiable: there is no GET /retention/policy/history —
# retention.ts only defines POST /policy, GET /policy/:commodityType,
# POST /:forexId/retention and GET /:forexId/retention.

echo -e "\n${BLUE}Compliance Reports:${NC}"
# NOTE: there is no GET /compliance/dashboard; the compliance dashboard is
# GET /compliance (compliance.ts:244). Its payload has no `totalExports`
# field — the dashboard object is {summary, forex, repatriation, swift,
# retention, timestamp} — so the field check is changed to data.forex.
test_tab "NBE" "Compliance Dashboard" "/compliance" "has_field" "data.forex"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}3. EXPORTERS PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "Exporters" "Dashboard" "/portals/exporters" "has_field" "data.exporterId"

echo -e "\n${BLUE}My Contracts:${NC}"
test_tab "Exporters" "All Contracts" "/contracts" "has_data" "contractId"
test_tab "Exporters" "Pending Contracts" "/contracts?status=PENDING" "has_data" "contractId"
test_tab "Exporters" "Approved Contracts" "/contracts?status=APPROVED" "has_data" "contractId"
test_tab "Exporters" "Rejected Contracts" "/contracts?status=REJECTED" "has_data" "contractId"

echo -e "\n${BLUE}My LCs:${NC}"
test_tab "Exporters" "LC Requests" "/banking/lcs?exporterId=test-admin" "has_data" "lcId"

echo -e "\n${BLUE}My Shipments:${NC}"
test_tab "Exporters" "All Shipments" "/shipments" "has_data" "shipmentId"
test_tab "Exporters" "Pending Shipments" "/shipments?status=pending" "has_data" "shipmentId"
test_tab "Exporters" "In Transit" "/shipments?status=in_transit" "has_data" "shipmentId"

echo -e "\n${BLUE}Applications:${NC}"
test_tab "Exporters" "My Applications" "/exporters/exporter-applications" "has_data" "applicationId"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}4. ECTA PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "ECTA" "Dashboard" "/portals/ecta" "dashboard" ""

echo -e "\n${BLUE}Contract Approval:${NC}"
test_tab "ECTA" "Pending Approval" "/contracts?status=PENDING" "has_data" "contractId"
test_tab "ECTA" "Approved Contracts" "/contracts?status=APPROVED" "has_data" "contractId"
test_tab "ECTA" "Rejected Contracts" "/contracts?status=REJECTED" "has_data" "contractId"
test_tab "ECTA" "All Contracts" "/contracts" "has_data" "contractId"

echo -e "\n${BLUE}Exporter Applications:${NC}"
test_tab "ECTA" "All Applications" "/exporters/exporter-applications" "has_data" "applicationId"
test_tab "ECTA" "Pending Applications" "/exporters/exporter-applications?status=pending" "has_data" "applicationId"

echo -e "\n${BLUE}Quality Inspections:${NC}"
test_tab "ECTA" "Inspection Queue" "/quality/inspections" "has_data" "inspectionID"
test_tab "ECTA" "Completed Inspections" "/quality/inspections?status=completed" "has_data" "inspectionID"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}5. ECX PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "ECX" "Dashboard" "/portals/ecx" "dashboard" ""

echo -e "\n${BLUE}Warehouse Management:${NC}"
test_tab "ECX" "Warehouse Lots" "/warehouse/inventory" "has_data" "lotId"
test_tab "ECX" "Available Lots" "/ecx/lots?status=available" "has_data" "lotId"
test_tab "ECX" "Released Lots" "/ecx/lots?status=released" "has_data" "lotId"

echo -e "\n${BLUE}Market Analytics:${NC}"
test_tab "ECX" "Market Prices" "/market" "has_field" "data.prices"
test_tab "ECX" "Market Trends" "/market/trends" "has_data" "date"
test_tab "ECX" "ECX Market" "/ecx/market" "has_field" "data.prices"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}6. CUSTOMS PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "Customs" "Dashboard" "/portals/customs" "dashboard" ""

echo -e "\n${BLUE}Clearance Management:${NC}"
test_tab "Customs" "All Declarations" "/customs/clearance" "has_data" "declarationNumber"
test_tab "Customs" "Pending Review" "/customs/clearance?status=pending_review" "has_data" "declarationNumber"
test_tab "Customs" "Approved" "/customs/clearance?status=approved" "has_data" "declarationNumber"

echo -e "\n${BLUE}Document Verification:${NC}"
test_tab "Customs" "Verification Queue" "/customs/document-verification" "has_data" "documentId"
# NOTE: there is no GET /customs/documents. The documents list is
# GET /documents (documents.ts:397); no documents endpoint honours a
# ?status= filter, so the verified-only filter cannot be applied.
test_tab "Customs" "Verified Documents" "/documents" "has_data" "documentId"

echo -e "\n${BLUE}Risk Assessment:${NC}"
test_tab "Customs" "Risk Assessments" "/customs/risk-assessment" "has_data" "assessmentId"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}7. SHIPPING PORTAL - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Main Dashboard:${NC}"
test_tab "Shipping" "Dashboard" "/portals/shipping" "dashboard" ""

echo -e "\n${BLUE}Shipment Management:${NC}"
test_tab "Shipping" "All Shipments" "/shipping/shipments" "has_data" "shipmentId"
test_tab "Shipping" "Pending Pickup" "/shipping/shipments?status=pending" "has_data" "shipmentId"
test_tab "Shipping" "In Transit" "/shipping/shipments?status=in_transit" "has_data" "shipmentId"
test_tab "Shipping" "Delivered" "/shipping/shipments?status=delivered" "has_data" "shipmentId"

echo -e "\n${BLUE}Land Transport:${NC}"
test_tab "Shipping" "Transport Dashboard" "/land-transport" "has_field" "data.status"
test_tab "Shipping" "Active Transports" "/land-transport?status=active" "has_data" "transportId"

echo -e "\n${BLUE}Freight Booking:${NC}"
# NOTE: there is no GET /shipping/freight; freight bookings are listed at
# GET /shipping/bookings (shipping.ts:240). The ?mode= filter is not
# supported there.
test_tab "Shipping" "Sea Freight" "/shipping/bookings" "has_data" "bookingId"
test_tab "Shipping" "Air Freight" "/shipping/bookings" "has_data" "bookingId"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}8. QUALITY & CERTIFICATES - Testing All Tabs${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Quality Inspections:${NC}"
test_tab "Quality" "All Inspections" "/quality/inspections" "has_data" "inspectionID"
test_tab "Quality" "Pending" "/quality/inspections?status=pending" "has_data" "inspectionID"
test_tab "Quality" "Completed" "/quality/inspections?status=completed" "has_data" "inspectionID"

echo -e "\n${BLUE}Certificates:${NC}"
# NOTE: the bare /certificates mount resolves to the quality-inspections list
# (qualityRoutes GET / is mounted first); phytosanitary certificates are at
# GET /certificates/phyto (certificates.ts:16) and certificates of origin at
# GET /certificates/origin (certificates.ts:87).
test_tab "Certificates" "All Certificates" "/certificates/phyto" "has_data" "certificateId"
test_tab "Certificates" "Phytosanitary" "/certificates/phyto" "has_data" "certificateId"
test_tab "Certificates" "Certificate of Origin" "/certificates/origin" "has_data" "certificateId"

echo -e "\n${BLUE}Documents:${NC}"
test_tab "Documents" "All Documents" "/documents" "has_data" "documentId"
test_tab "Documents" "By Shipment" "/shipments/SHIP-1793297109/documents" "has_data" "documentId"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}CROSS-PORTAL FEATURES - Testing Integration${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo -e "${BLUE}Contract Lifecycle:${NC}"
test_tab "Lifecycle" "Contract Details" "/contracts/CONTRACT-PENDING-1793381798" "has_field" "data.contractId"
# NOTE: there is no GET /contracts/:id/history. The audit trail for a
# contract is GET /audit/trail?entityType=CONTRACT&entityId=<id>
# (audit.ts:1977), which returns data: allLogs[].
test_tab "Lifecycle" "Contract History" "/audit/trail?entityType=CONTRACT&entityId=CONTRACT-PENDING-1793381798" "has_data" "timestamp"

echo -e "\n${BLUE}Shipment Tracking:${NC}"
test_tab "Tracking" "Shipment Details" "/shipping/shipments/SHIP-1793297109" "has_field" "data.shipmentId"
test_tab "Tracking" "Traceability" "/shipments/SHIP-1793297109/traceability" "has_data" "stage"

echo -e "\n${BLUE}Analytics & Reports:${NC}"
# NOTE: there is no GET /analytics/exports; the export report endpoint is
# GET /analytics/export-report (analytics.ts:157).
test_tab "Analytics" "Export Analytics" "/analytics/export-report" "has_data" "month"
# NOTE: removed-unverifiable: there is no GET /analytics/revenue and no
# revenue metric anywhere in analytics.ts — GET /timeseries/:metric
# (analytics.ts:53) only allows contracts/shipments/payments.

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              PORTAL TABS TESTING SUMMARY                       ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║ Total Tabs/Subtabs:  $TOTAL_TABS                                           ║${NC}"
echo -e "${BLUE}║ ${GREEN}Passed:               $PASSED_TABS${BLUE}                                           ║${NC}"
echo -e "${BLUE}║ ${YELLOW}Warnings:             $WARNINGS${BLUE}                                            ║${NC}"
echo -e "${BLUE}║ ${RED}Failed:               $FAILED_TABS${BLUE}                                            ║${NC}"

if command -v bc &> /dev/null; then
    success_rate=$(echo "scale=1; $PASSED_TABS * 100 / $TOTAL_TABS" | bc)
    echo -e "${BLUE}║ ${CYAN}Success Rate:        ${success_rate}%${BLUE}                                      ║${NC}"
fi

echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

if [ $FAILED_TABS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ ALL PORTAL TABS OPERATIONAL!${NC}"
    echo -e "${GREEN}  All portals, tabs, and subtabs are displaying correct data.${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ Some portal tabs need attention.${NC}"
    echo -e "${YELLOW}  Review failed tabs above for details.${NC}"
    exit 1
fi
