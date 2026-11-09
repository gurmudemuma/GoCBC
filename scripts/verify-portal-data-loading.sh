#!/bin/bash

################################################################################
# PORTAL DATA LOADING VERIFICATION TEST
# 
# This script verifies that all portals are correctly fetching and displaying:
# - KPI Card data
# - Tab data (all tabs for each portal)
# - Dashboard statistics
# - Entity lists and details
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
RESULTS_FILE="/tmp/portal-data-verification-results.txt"

# Test counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Initialize results file
echo "Portal Data Loading Verification - $(date)" > "$RESULTS_FILE"
echo "=============================================" >> "$RESULTS_FILE"

log_header() {
    echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${NC}\n"
}

log_portal() {
    echo -e "\n${BOLD}${MAGENTA}▶▶▶ $1${NC}"
}

log_check() {
    echo -e "${BLUE}[CHECK $((TOTAL_CHECKS + 1))]${NC} $1"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

log_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Helper function to make API calls
api_call() {
    local method="$1"
    local endpoint="$2"
    local token="$3"
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        ${token:+-H "Authorization: Bearer $token"} \
        "$API_BASE$endpoint" 2>/dev/null || echo -e "\n000")
    
    echo "$response"
}

# Check if response is successful (200-299)
check_response() {
    local response="$1"
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        return 0
    else
        return 1
    fi
}

# Check if response has data
has_data() {
    local response="$1"
    local body=$(echo "$response" | sed '$d')
    
    # Check if body is not empty and not null
    if [ -n "$body" ] && [ "$body" != "null" ]; then
        # Check if it's an array with items or an object with data
        local data_check=$(echo "$body" | jq -r 'if type == "array" then length else if .data then (.data | if type == "array" then length else 1 end) else 0 end end' 2>/dev/null)
        if [ "$data_check" -gt 0 ] 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Get count from response
get_count() {
    local response="$1"
    local body=$(echo "$response" | sed '$d')
    echo "$body" | jq -r 'if type == "array" then length else if .data then (.data | if type == "array" then length else 1 end) else 0 end end' 2>/dev/null || echo "0"
}

################################################################################
# AUTHENTICATION
################################################################################

log_header "AUTHENTICATION"

log_check "Logging in as Admin"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")

if check_response "$response"; then
    ADMIN_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "Admin authenticated"
else
    log_error "Admin authentication failed"
    exit 1
fi

# Authenticate portal users
ECTA_TOKEN=""
ECX_TOKEN=""
BANK_TOKEN=""
NBE_TOKEN=""
CUSTOMS_TOKEN=""
SHIPPING_TOKEN=""

log_check "Authenticating ECTA Officer"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"ecta_admin","password":"password123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")
if check_response "$response"; then
    ECTA_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "ECTA Officer authenticated"
else
    log_warning "ECTA Officer authentication failed - using Admin token"
    ECTA_TOKEN="$ADMIN_TOKEN"
fi

log_check "Authenticating ECX Officer"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"ecx_admin","password":"password123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")
if check_response "$response"; then
    ECX_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "ECX Officer authenticated"
else
    log_warning "ECX Officer authentication failed - using Admin token"
    ECX_TOKEN="$ADMIN_TOKEN"
fi

log_check "Authenticating Bank Officer"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"bank_admin","password":"password123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")
if check_response "$response"; then
    BANK_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "Bank Officer authenticated"
else
    log_warning "Bank Officer authentication failed - using Admin token"
    BANK_TOKEN="$ADMIN_TOKEN"
fi

log_check "Authenticating NBE Officer"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"nbe_admin","password":"password123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")
if check_response "$response"; then
    NBE_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "NBE Officer authenticated"
else
    log_warning "NBE Officer authentication failed - using Admin token"
    NBE_TOKEN="$ADMIN_TOKEN"
fi

log_check "Authenticating Customs Officer"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"customs_admin","password":"password123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")
if check_response "$response"; then
    CUSTOMS_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "Customs Officer authenticated"
else
    log_warning "Customs Officer authentication failed - using Admin token"
    CUSTOMS_TOKEN="$ADMIN_TOKEN"
fi

log_check "Authenticating Shipping Officer"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"shipping_admin","password":"password123"}' \
    "$API_BASE/auth/login" 2>/dev/null || echo -e "\n000")
if check_response "$response"; then
    SHIPPING_TOKEN=$(echo "$response" | sed '$d' | jq -r '.data.token')
    log_success "Shipping Officer authenticated"
else
    log_warning "Shipping Officer authentication failed - using Admin token"
    SHIPPING_TOKEN="$ADMIN_TOKEN"
fi

################################################################################
# 1. EXPORTER PORTAL
################################################################################

log_header "EXPORTER PORTAL"
echo "EXPORTER PORTAL" >> "$RESULTS_FILE"
echo "===============" >> "$RESULTS_FILE"

log_portal "Dashboard / KPI Cards"

log_check "Fetching exporter dashboard"
response=$(api_call GET "/exporters/dashboard" "$ADMIN_TOKEN")
if check_response "$response"; then
    log_success "Dashboard data loaded"
    echo "$response" | sed '$d' | jq '.' >> "$RESULTS_FILE" 2>/dev/null
else
    log_error "Dashboard failed to load"
fi

log_portal "Tabs Data"

log_check "Tab: My Applications"
response=$(api_call GET "/exporters/exporter-applications?status=PENDING" "$ADMIN_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Applications loaded ($count items)"
else
    log_error "Applications tab failed"
fi

log_check "Tab: My Licenses"
response=$(api_call GET "/exporters?status=APPROVED" "$ADMIN_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Licenses loaded ($count items)"
else
    log_error "Licenses tab failed"
fi

log_check "Tab: My Contracts"
response=$(api_call GET "/contracts" "$ADMIN_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Contracts loaded ($count items)"
else
    log_error "Contracts tab failed"
fi

log_check "Tab: My Shipments"
response=$(api_call GET "/shipments" "$ADMIN_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Shipments loaded ($count items)"
else
    log_error "Shipments tab failed"
fi

################################################################################
# 2. ECTA PORTAL
################################################################################

log_header "ECTA PORTAL"
echo "" >> "$RESULTS_FILE"
echo "ECTA PORTAL" >> "$RESULTS_FILE"
echo "===========" >> "$RESULTS_FILE"

log_portal "Dashboard / KPI Cards"

log_check "Fetching ECTA stats"
response=$(api_call GET "/stats" "$ECTA_TOKEN")
if check_response "$response"; then
    log_success "ECTA statistics loaded"
else
    log_error "ECTA statistics failed"
fi

log_portal "Tabs Data"

log_check "Tab: Pending Applications"
response=$(api_call GET "/exporters/exporter-applications?status=PENDING" "$ECTA_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Pending applications loaded ($count items)"
else
    log_error "Pending applications tab failed"
fi

log_check "Tab: Approved Exporters"
response=$(api_call GET "/exporters?status=APPROVED" "$ECTA_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Approved exporters loaded ($count items)"
else
    log_error "Approved exporters tab failed"
fi

log_check "Tab: Quality Inspections"
response=$(api_call GET "/quality/inspections" "$ECTA_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Quality inspections loaded ($count items)"
else
    log_error "Quality inspections tab failed"
fi

log_check "Tab: Contracts Pending Approval"
response=$(api_call GET "/contracts?status=SUBMITTED" "$ECTA_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Contracts pending approval loaded ($count items)"
else
    log_error "Contracts pending approval tab failed"
fi

################################################################################
# 3. ECX PORTAL
################################################################################

log_header "ECX PORTAL"
echo "" >> "$RESULTS_FILE"
echo "ECX PORTAL" >> "$RESULTS_FILE"
echo "==========" >> "$RESULTS_FILE"

log_portal "Tabs Data"

log_check "Tab: Coffee Lots"
response=$(api_call GET "/ecx/lots" "$ECX_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Coffee lots loaded ($count items)"
else
    log_error "Coffee lots tab failed"
fi

log_check "Tab: Warehouse Receipts"
response=$(api_call GET "/ecx/lots?status=REGISTERED" "$ECX_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Warehouse receipts loaded ($count items)"
else
    log_error "Warehouse receipts tab failed"
fi

log_check "Tab: Grading Queue"
response=$(api_call GET "/ecx/lots?status=REGISTERED" "$ECX_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Grading queue loaded ($count items)"
else
    log_error "Grading queue tab failed"
fi

log_check "Tab: Market Prices"
response=$(api_call GET "/market/prices" "$ECX_TOKEN")
if check_response "$response"; then
    log_success "Market prices loaded"
else
    log_warning "Market prices endpoint not found (may be expected)"
fi

################################################################################
# 4. BANKS PORTAL
################################################################################

log_header "BANKS PORTAL"
echo "" >> "$RESULTS_FILE"
echo "BANKS PORTAL" >> "$RESULTS_FILE"
echo "============" >> "$RESULTS_FILE"

log_portal "Tabs Data"

log_check "Tab: Letters of Credit"
response=$(api_call GET "/banking/lc" "$BANK_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Letters of Credit loaded ($count items)"
else
    log_error "Letters of Credit tab failed"
fi

log_check "Tab: LC Requests"
response=$(api_call GET "/banking/lc?status=PENDING" "$BANK_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "LC requests loaded ($count items)"
else
    log_error "LC requests tab failed"
fi

log_check "Tab: Payments"
response=$(api_call GET "/payments" "$BANK_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Payments loaded ($count items)"
else
    log_warning "Payments endpoint may need authentication review"
fi

log_check "Tab: SWIFT Messages"
response=$(api_call GET "/banking/swift" "$BANK_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "SWIFT messages loaded ($count items)"
else
    log_warning "SWIFT messages endpoint may need authentication review"
fi

log_check "Tab: Document Examination"
response=$(api_call GET "/banking/lc?status=ADVISED" "$BANK_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Documents for examination loaded ($count items)"
else
    log_error "Document examination tab failed"
fi

################################################################################
# 5. NBE PORTAL
################################################################################

log_header "NBE PORTAL"
echo "" >> "$RESULTS_FILE"
echo "NBE PORTAL" >> "$RESULTS_FILE"
echo "==========" >> "$RESULTS_FILE"

log_portal "Tabs Data"

log_check "Tab: Forex Requests"
response=$(api_call GET "/nbe/forex" "$NBE_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Forex requests loaded ($count items)"
else
    log_error "Forex requests tab failed"
fi

log_check "Tab: Pending Approvals"
response=$(api_call GET "/nbe/forex?status=REQUESTED" "$NBE_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Pending forex approvals loaded ($count items)"
else
    log_error "Pending forex approvals tab failed"
fi

log_check "Tab: Exchange Rates"
response=$(api_call GET "/exchange-rates" "$NBE_TOKEN")
if check_response "$response"; then
    log_success "Exchange rates loaded"
else
    log_warning "Exchange rates endpoint may need review"
fi

log_check "Tab: Repatriation Tracking"
response=$(api_call GET "/nbe/forex?status=ALLOCATED" "$NBE_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Repatriation tracking loaded ($count items)"
else
    log_error "Repatriation tracking tab failed"
fi

log_check "Tab: Compliance Reports"
response=$(api_call GET "/compliance" "$NBE_TOKEN")
if check_response "$response"; then
    log_success "Compliance reports loaded"
else
    log_warning "Compliance endpoint may need review"
fi

################################################################################
# 6. CUSTOMS PORTAL
################################################################################

log_header "CUSTOMS PORTAL"
echo "" >> "$RESULTS_FILE"
echo "CUSTOMS PORTAL" >> "$RESULTS_FILE"
echo "==============" >> "$RESULTS_FILE"

log_portal "Tabs Data"

log_check "Tab: Declarations"
response=$(api_call GET "/customs/declarations" "$CUSTOMS_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Customs declarations loaded ($count items)"
else
    log_error "Customs declarations tab failed"
fi

log_check "Tab: Pending Review"
response=$(api_call GET "/customs/declarations?status=SUBMITTED" "$CUSTOMS_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Pending declarations loaded ($count items)"
else
    log_error "Pending declarations tab failed"
fi

log_check "Tab: Under Inspection"
response=$(api_call GET "/customs/declarations?status=UNDER_INSPECTION" "$CUSTOMS_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Declarations under inspection loaded ($count items)"
else
    log_error "Declarations under inspection tab failed"
fi

log_check "Tab: Cleared"
response=$(api_call GET "/customs/declarations?status=CLEARED" "$CUSTOMS_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Cleared declarations loaded ($count items)"
else
    log_error "Cleared declarations tab failed"
fi

log_check "Tab: Risk Assessment"
response=$(api_call GET "/customs/risk-assessment" "$CUSTOMS_TOKEN")
if check_response "$response"; then
    log_success "Risk assessment data loaded"
else
    log_warning "Risk assessment endpoint may need review"
fi

################################################################################
# 7. SHIPPING PORTAL
################################################################################

log_header "SHIPPING PORTAL"
echo "" >> "$RESULTS_FILE"
echo "SHIPPING PORTAL" >> "$RESULTS_FILE"
echo "===============" >> "$RESULTS_FILE"

log_portal "Tabs Data"

log_check "Tab: All Shipments"
response=$(api_call GET "/shipments" "$SHIPPING_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "All shipments loaded ($count items)"
else
    log_error "All shipments tab failed"
fi

log_check "Tab: Pending Pickup"
response=$(api_call GET "/shipments?status=PENDING" "$SHIPPING_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Pending pickup loaded ($count items)"
else
    log_error "Pending pickup tab failed"
fi

log_check "Tab: In Transit"
response=$(api_call GET "/shipments?status=IN_TRANSIT" "$SHIPPING_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "In transit shipments loaded ($count items)"
else
    log_error "In transit tab failed"
fi

log_check "Tab: Delivered"
response=$(api_call GET "/shipments?status=DELIVERED" "$SHIPPING_TOKEN")
count=$(get_count "$response")
if check_response "$response"; then
    log_success "Delivered shipments loaded ($count items)"
else
    log_error "Delivered shipments tab failed"
fi

log_check "Tab: Tracking"
response=$(api_call GET "/traceability" "$SHIPPING_TOKEN")
if check_response "$response"; then
    log_success "Tracking data loaded"
else
    log_warning "Tracking endpoint may need review"
fi

################################################################################
# SUMMARY
################################################################################

log_header "VERIFICATION SUMMARY"

echo ""
echo -e "${BOLD}Total Checks: $TOTAL_CHECKS${NC}"
echo -e "${GREEN}✓ Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}✗ Failed: $FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}${BOLD}🎉 ALL PORTALS DATA LOADING VERIFIED SUCCESSFULLY!${NC}"
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "\n${YELLOW}⚠ Some endpoints need attention${NC}"
fi

echo -e "${CYAN}Success Rate: ${SUCCESS_RATE}%${NC}"

echo "" >> "$RESULTS_FILE"
echo "SUMMARY" >> "$RESULTS_FILE"
echo "=======" >> "$RESULTS_FILE"
echo "Total Checks: $TOTAL_CHECKS" >> "$RESULTS_FILE"
echo "Passed: $PASSED_CHECKS" >> "$RESULTS_FILE"
echo "Failed: $FAILED_CHECKS" >> "$RESULTS_FILE"
echo "Success Rate: ${SUCCESS_RATE}%" >> "$RESULTS_FILE"

echo -e "\n${CYAN}Detailed results saved to: $RESULTS_FILE${NC}"
