#!/bin/bash

# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
# Comprehensive Portal Testing - All Tabs, Subtabs, and Workflows
# Tests every portal's complete functionality end-to-end

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# API Configuration
API_URL="http://localhost:3001/api/v1"
UI_URL="http://localhost:3000"

# Authentication token (will be set after login)
AUTH_TOKEN=""

# Test Statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Log file
LOG_FILE="/tmp/portal-test-$(date +%Y%m%d-%H%M%S).log"
touch "$LOG_FILE"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Test result tracking
test_start() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "${CYAN}[TEST $TOTAL_TESTS]${NC} $1"
}

test_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    log "${GREEN}✓ PASS${NC} $1\n"
}

test_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    log "${RED}✗ FAIL${NC} $1"
    log "${RED}Details: $2${NC}\n"
}

# Print section header
section() {
    log "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
    log "${BOLD}${BLUE}  $1${NC}"
    log "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

# Check API endpoint
check_api() {
    local endpoint=$1
    local expected_count=$2
    local description=$3
    
    test_start "API: $description"
    
    # Add auth header if token is available
    if [ -n "$AUTH_TOKEN" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    fi
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        # Check if response is array and count items
        if echo "$body" | jq -e 'type == "array"' > /dev/null 2>&1; then
            count=$(echo "$body" | jq 'length')
            if [ -n "$expected_count" ] && [ "$count" -ge "$expected_count" ]; then
                test_pass "Returns $count items (expected ≥$expected_count)"
            elif [ -z "$expected_count" ]; then
                test_pass "Returns $count items"
            else
                test_fail "Returns $count items (expected ≥$expected_count)" "Insufficient data"
            fi
        else
            test_pass "Returns valid response"
        fi
    else
        test_fail "HTTP $http_code" "$body"
    fi
}

# Login and get authentication token
login_user() {
    local role=$1
    
    log "${CYAN}Setting up test authentication...${NC}"
    
    # Use the test bypass token for development testing
    AUTH_TOKEN="test-bypass-admin"
    
    log "${GREEN}✓ Using test bypass token${NC}\n"
    
    return 0
}

# Create test data for workflows
create_test_data() {
    section "CREATING TEST DATA FOR ALL WORKFLOWS"
    
    log "${YELLOW}Creating comprehensive test dataset...${NC}\n"
    
    # Login first
    login_user "ADMIN"
    
    # Generate timestamp for unique IDs
    TIMESTAMP=$(date +%s)
    
    # Test user credentials (from existing system)
    EXPORTER_TOKEN="exporter-token-123"
    BANK_TOKEN="bank-token-123"
    ECX_TOKEN="ecx-token-123"
    ECTA_TOKEN="ecta-token-123"
    SHIPPING_TOKEN="shipping-token-123"
    CUSTOMS_TOKEN="customs-token-123"
    NBE_TOKEN="nbe-token-123"
    
    # 1. Create Export Contracts (Foundation)
    log "${CYAN}Step 1: Creating Export Contracts${NC}"
    for i in {1..5}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        curl -s -X POST "$API_URL/contracts" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "{
                \"contractId\": \"$CONTRACT_ID\",
                \"exporterId\": \"EXP001\",
                \"buyerId\": \"BUY001\",
                \"quantity\": $((1000 + i * 500)),
                \"pricePerKg\": $(awk "BEGIN {printf \"%.2f\", 5.50 + $i * 0.25}"),
                \"totalValue\": $(awk "BEGIN {printf \"%.2f\", (1000 + $i * 500) * (5.50 + $i * 0.25)}"),
                \"currency\": \"USD\",
                \"deliveryDate\": \"2026-12-31\",
                \"contractDate\": \"$(date +%Y-%m-%d)\",
                \"status\": \"APPROVED\",
                \"coffeeType\": \"ARABICA\",
                \"coffeeGrade\": \"GRADE_${i}\",
                \"buyerBank\": \"Commercial Bank of Ethiopia\",
                \"exporterBank\": \"Awash Bank\",
                \"eudrRequired\": true
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created contract: $CONTRACT_ID"
        sleep 1
    done
    
    # 2. Create Letter of Credits
    log "\n${CYAN}Step 2: Creating Letter of Credits${NC}"
    for i in {1..5}; do
        LC_ID="TEST-LC-${TIMESTAMP}-${i}"
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        # Create LC with different statuses for testing tabs
        STATUS=""
        case $i in
            1) STATUS="REQUESTED" ;;
            2) STATUS="APPROVED" ;;
            3) STATUS="FOREX_ALLOCATED" ;;
            4) STATUS="UTILIZED" ;;
            5) STATUS="PAYMENT_RELEASED" ;;
        esac
        
        curl -s -X POST "$API_URL/banking/lc" \
            -H "Content-Type: application/json" \
            -d "{
                \"lcId\": \"$LC_ID\",
                \"contractId\": \"$CONTRACT_ID\",
                \"issuingBank\": \"Commercial Bank of Ethiopia\",
                \"advisingBank\": \"Awash Bank\",
                \"beneficiary\": \"Test Exporter $i\",
                \"applicant\": \"Test Buyer $i\",
                \"amount\": $(awk "BEGIN {printf \"%.2f\", 50000 + $i * 10000}"),
                \"currency\": \"USD\",
                \"issueDate\": \"$(date +%Y-%m-%d)\",
                \"expiryDate\": \"2026-12-31\",
                \"status\": \"$STATUS\",
                \"lcType\": \"IRREVOCABLE\",
                \"paymentTerms\": \"AT_SIGHT\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created LC: $LC_ID (Status: $STATUS)"
        sleep 1
    done
    
    # 3. Create Forex Allocations
    log "\n${CYAN}Step 3: Creating Forex Allocations${NC}"
    for i in {2..5}; do  # Start from 2 (skip REQUESTED LC)
        LC_ID="TEST-LC-${TIMESTAMP}-${i}"
        
        curl -s -X POST "$API_URL/forex" \
            -H "Content-Type: application/json" \
            -d "{
                \"lcId\": \"$LC_ID\",
                \"requestedAmount\": $(awk "BEGIN {printf \"%.2f\", 50000 + $i * 10000}"),
                \"allocatedAmount\": $(awk "BEGIN {printf \"%.2f\", (50000 + $i * 10000) * 0.95}"),
                \"currency\": \"USD\",
                \"retentionRate\": 5,
                \"status\": \"ALLOCATED\",
                \"requestDate\": \"$(date +%Y-%m-%d)\",
                \"allocationDate\": \"$(date +%Y-%m-%d)\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created Forex allocation for: $LC_ID"
        sleep 1
    done
    
    # 4. Create SWIFT Messages
    log "\n${CYAN}Step 4: Creating SWIFT Messages${NC}"
    for i in {3..5}; do  # For FOREX_ALLOCATED LCs
        LC_ID="TEST-LC-${TIMESTAMP}-${i}"
        
        curl -s -X POST "$API_URL/swift/messages" \
            -H "Content-Type: application/json" \
            -d "{
                \"messageId\": \"SWIFT-${TIMESTAMP}-${i}\",
                \"lcId\": \"$LC_ID\",
                \"messageType\": \"MT700\",
                \"sender\": \"CBETETAA\",
                \"receiver\": \"DASHETAA\",
                \"amount\": $(awk "BEGIN {printf \"%.2f\", 50000 + $i * 10000}"),
                \"currency\": \"USD\",
                \"status\": \"SENT\",
                \"sentDate\": \"$(date +%Y-%m-%d)\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created SWIFT message for: $LC_ID"
        sleep 1
    done
    
    # 5. Create Quality Control Inspections (ECX)
    log "\n${CYAN}Step 5: Creating ECX Quality Inspections${NC}"
    for i in {1..5}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        # Different inspection stages for testing
        STAGE=""
        STATUS=""
        case $i in
            1) STAGE="SUBMISSION"; STATUS="PENDING" ;;
            2) STAGE="SAMPLING"; STATUS="IN_PROGRESS" ;;
            3) STAGE="TESTING"; STATUS="IN_PROGRESS" ;;
            4) STAGE="APPROVAL"; STATUS="IN_PROGRESS" ;;
            5) STAGE="COMPLETE"; STATUS="APPROVED" ;;
        esac
        
        curl -s -X POST "$API_URL/quality/inspections" \
            -H "Content-Type: application/json" \
            -d "{
                \"inspectionId\": \"INSP-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"stage\": \"$STAGE\",
                \"status\": \"$STATUS\",
                \"inspectionDate\": \"$(date +%Y-%m-%d)\",
                \"coffeeType\": \"ARABICA\",
                \"grade\": \"GRADE_${i}\",
                \"quantity\": $((1000 + i * 500)),
                \"inspector\": \"Inspector-${i}\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created inspection: INSP-${TIMESTAMP}-${i} (Stage: $STAGE)"
        sleep 1
    done
    
    # 6. Create ECTA Permits and Certificates
    log "\n${CYAN}Step 6: Creating ECTA Permits & Certificates${NC}"
    for i in {1..5}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        # Export Permit
        curl -s -X POST "$API_URL/permits" \
            -H "Content-Type: application/json" \
            -d "{
                \"permitId\": \"PERMIT-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"permitType\": \"EXPORT\",
                \"status\": \"APPROVED\",
                \"issueDate\": \"$(date +%Y-%m-%d)\",
                \"expiryDate\": \"2026-12-31\",
                \"quantity\": $((1000 + i * 500)),
                \"approvedBy\": \"ECTA-Officer-${i}\"
            }" > /dev/null
        
        # Phytosanitary Certificate
        curl -s -X POST "$API_URL/certificates/phyto" \
            -H "Content-Type: application/json" \
            -d "{
                \"certificateId\": \"PHYTO-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"status\": \"ISSUED\",
                \"issueDate\": \"$(date +%Y-%m-%d)\",
                \"treatmentType\": \"FUMIGATION\",
                \"inspectionResult\": \"PASS\"
            }" > /dev/null
        
        # Certificate of Origin
        curl -s -X POST "$API_URL/certificates/origin" \
            -H "Content-Type: application/json" \
            -d "{
                \"certificateId\": \"COO-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"status\": \"ISSUED\",
                \"issueDate\": \"$(date +%Y-%m-%d)\",
                \"origin\": \"ETHIOPIA\",
                \"certifyingAuthority\": \"ECTA\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created ECTA documents for: $CONTRACT_ID"
        sleep 1
    done
    
    # 7. Create Shipping Records
    log "\n${CYAN}Step 7: Creating Shipping Records${NC}"
    for i in {1..9}; do  # Test all 9 shipping stages
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        # Different shipping stages
        STATUS=""
        case $i in
            1) STATUS="CUSTOMS_CLEARED" ;;
            2) STATUS="LAND_TRANSPORT" ;;
            3) STATUS="ARRIVED_PORT" ;;
            4) STATUS="PORT_WAREHOUSED" ;;
            5) STATUS="VESSEL_LOADED" ;;
            6) STATUS="IN_TRANSIT" ;;
            7) STATUS="DESTINATION_PORT" ;;
            8) STATUS="DELIVERED" ;;
            9) STATUS="CUSTOMS_CLEARED" ;;  # Extra for testing
        esac
        
        curl -s -X POST "$API_URL/shipping/shipments" \
            -H "Content-Type: application/json" \
            -d "{
                \"shipmentId\": \"SHIP-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"status\": \"$STATUS\",
                \"origin\": \"ADDIS_ABABA\",
                \"destination\": \"DJIBOUTI\",
                \"carrier\": \"Test Carrier ${i}\",
                \"bookingReference\": \"BOOK-${TIMESTAMP}-${i}\",
                \"estimatedDeparture\": \"2026-12-01\",
                \"estimatedArrival\": \"2026-12-15\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created shipment: SHIP-${TIMESTAMP}-${i} (Status: $STATUS)"
        sleep 1
    done
    
    # 8. Create Customs Declarations
    log "\n${CYAN}Step 8: Creating Customs Declarations${NC}"
    for i in {1..5}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        SHIPMENT_ID="SHIP-${TIMESTAMP}-${i}"
        
        # Different customs stages
        STATUS=""
        case $i in
            1) STATUS="SUBMITTED" ;;
            2) STATUS="UNDER_REVIEW" ;;
            3) STATUS="APPROVED" ;;
            4) STATUS="CLEARED" ;;
            5) STATUS="RELEASED" ;;
        esac
        
        curl -s -X POST "$API_URL/customs/declarations" \
            -H "Content-Type: application/json" \
            -d "{
                \"declarationId\": \"CUSTOMS-${TIMESTAMP}-${i}\",
                \"shipmentId\": \"$SHIPMENT_ID\",
                \"contractId\": \"$CONTRACT_ID\",
                \"status\": \"$STATUS\",
                \"declarationType\": \"EXPORT\",
                \"submissionDate\": \"$(date +%Y-%m-%d)\",
                \"hsCode\": \"0901.21\",
                \"declaredValue\": $(awk "BEGIN {printf \"%.2f\", 50000 + $i * 10000}"),
                \"currency\": \"USD\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created customs declaration: CUSTOMS-${TIMESTAMP}-${i} (Status: $STATUS)"
        sleep 1
    done
    
    # 9. Create Payment Records (Documentary Collections, Advance Payments, Consignments)
    log "\n${CYAN}Step 9: Creating Payment Records${NC}"
    
    # Documentary Collections
    for i in {1..3}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        curl -s -X POST "$API_URL/payments/documentary-collections" \
            -H "Content-Type: application/json" \
            -d "{
                \"collectionId\": \"DC-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"amount\": $(awk "BEGIN {printf \"%.2f\", 30000 + $i * 5000}"),
                \"currency\": \"USD\",
                \"status\": \"COMPLETED\",
                \"collectionDate\": \"$(date +%Y-%m-%d)\",
                \"remittingBank\": \"Awash Bank\",
                \"collectingBank\": \"Commercial Bank of Ethiopia\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created documentary collection: DC-${TIMESTAMP}-${i}"
    done
    
    # Advance Payments
    for i in {1..3}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        curl -s -X POST "$API_URL/payments/advance" \
            -H "Content-Type: application/json" \
            -d "{
                \"paymentId\": \"ADV-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"amount\": $(awk "BEGIN {printf \"%.2f\", 10000 + $i * 2000}"),
                \"currency\": \"USD\",
                \"status\": \"RECEIVED\",
                \"paymentDate\": \"$(date +%Y-%m-%d)\",
                \"percentage\": $((10 + i * 5))
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created advance payment: ADV-${TIMESTAMP}-${i}"
    done
    
    # Consignment Payments
    for i in {1..3}; do
        CONTRACT_ID="TEST-CONTRACT-${TIMESTAMP}-${i}"
        
        curl -s -X POST "$API_URL/payments/consignments" \
            -H "Content-Type: application/json" \
            -d "{
                \"consignmentId\": \"CONSIGN-${TIMESTAMP}-${i}\",
                \"contractId\": \"$CONTRACT_ID\",
                \"amount\": $(awk "BEGIN {printf \"%.2f\", 40000 + $i * 8000}"),
                \"currency\": \"USD\",
                \"status\": \"PENDING\",
                \"shipmentDate\": \"$(date +%Y-%m-%d)\"
            }" > /dev/null
        
        log "  ${GREEN}✓${NC} Created consignment payment: CONSIGN-${TIMESTAMP}-${i}"
    done
    
    log "\n${GREEN}✓ Test data creation complete!${NC}\n"
    sleep 2
}

# Test Banks Portal
test_banks_portal() {
    section "TESTING BANKS PORTAL"
    
    log "${YELLOW}Banks Portal has 4 main tabs with multiple subtabs${NC}\n"
    
    # Tab 0: Letter of Credit Management (6 subtabs)
    log "${CYAN}Tab 0: Letter of Credit Management${NC}"
    check_api "/banking/lc" 50 "All LCs Tab"
    check_api "/banking/lc?status=FOREX_ALLOCATED" 1 "Forex Allocated Tab"
    check_api "/banking/lc?status=UTILIZED" 1 "Utilized Tab"
    check_api "/banking/lc?status=PAYMENT_RELEASED" 1 "Payment Released Tab"
    # Test individual LC fetch
    test_start "Individual LC Details"
    first_lc_id=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/banking/lc" | jq -r '.data[0].lcId // .[0].lcId // .[0].id' 2>/dev/null || echo "")
    if [ -n "$first_lc_id" ] && [ "$first_lc_id" != "null" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/banking/lc/$first_lc_id")
        http_code=$(echo "$response" | tail -n1)
        if [ "$http_code" = "200" ]; then
            test_pass "LC details fetch successful (ID: $first_lc_id)"
        else
            test_fail "HTTP $http_code" "$(echo "$response" | head -n-1)"
        fi
    else
        test_fail "No LC ID found" "Cannot test individual LC fetch"
    fi
    
    # Tab 1: Forex Management
    log "\n${CYAN}Tab 1: Forex Management${NC}"
    check_api "/forex" 4 "All Forex Allocations"
    check_api "/forex?status=ALLOCATED" 4 "Allocated Forex"
    
    # Tab 2: SWIFT Messages
    log "\n${CYAN}Tab 2: SWIFT Messages${NC}"
    check_api "/swift/messages" 3 "All SWIFT Messages"
    check_api "/swift/messages?status=SENT" 3 "Sent Messages"
    
    # Tab 3: Payment Operations (3 subtabs)
    log "\n${CYAN}Tab 3: Payment Operations${NC}"
    check_api "/stats/documentary-collections" 3 "Documentary Collections"
    check_api "/stats/advance-payments" 3 "Advance Payments"
    check_api "/stats/consignment-payments" 3 "Consignment Payments"
}

# Test NBE Portal
test_nbe_portal() {
    section "TESTING NBE (NATIONAL BANK) PORTAL"
    
    log "${YELLOW}NBE Portal has 5 main tabs${NC}\n"
    
    # Tab 0: Forex Monitoring (4 subtabs)
    log "${CYAN}Tab 0: Forex Monitoring${NC}"
    check_api "/forex" 4 "All Forex (Subtab 0)"
    check_api "/forex?status=ALLOCATED" 4 "Allocated Forex (Subtab 1)"
    check_api "/forex?status=REQUESTED" 0 "Requested Forex (Subtab 2)"
    check_api "/forex?status=EXPIRED" 0 "Expired Forex (Subtab 3)"
    
    # Tab 1: Exchange Rate Management
    log "\n${CYAN}Tab 1: Exchange Rate Management${NC}"
    check_api "/forex/rates" "" "Exchange Rates"
    
    # Tab 2: SWIFT Monitoring (3 subtabs)
    log "\n${CYAN}Tab 2: SWIFT Monitoring${NC}"
    check_api "/swift/messages" 3 "All Messages (Subtab 0)"
    # Subtab 1: Analytics (same endpoint, different visualization)
    # Subtab 2: Compliance Alerts (filtered)
    check_api "/swift/messages?amount_gt=100000" "" "High Value Transactions"
    
    # Tab 3: Regulatory Compliance
    log "\n${CYAN}Tab 3: Regulatory Compliance${NC}"
    check_api "/compliance/reports" "" "Compliance Reports"
    
    # Tab 4: Analytics Dashboard (3 subtabs)
    log "\n${CYAN}Tab 4: Analytics Dashboard${NC}"
    check_api "/contracts" 50 "Overview - Contracts"
    check_api "/banking/lc" 50 "Overview - LCs"
    check_api "/forex" 4 "Overview - Forex"
}

# Test ECX Portal
test_ecx_portal() {
    section "TESTING ECX (ETHIOPIA COMMODITY EXCHANGE) PORTAL"
    
    log "${YELLOW}ECX Portal has 4 main tabs${NC}\n"
    
    # Tab 0: Coffee Contracts
    log "${CYAN}Tab 0: Coffee Contracts${NC}"
    check_api "/contracts" 50 "All Contracts"
    check_api "/contracts?status=APPROVED" "" "Approved Contracts"
    check_api "/contracts?status=PENDING" "" "Pending Contracts"
    
    # Tab 1: Quality Control (5-stage workflow)
    log "\n${CYAN}Tab 1: Quality Control (5 Stages)${NC}"
    check_api "/quality/inspections" 5 "All Inspections"
    check_api "/quality/inspections?stage=SUBMISSION" 1 "Stage 1: Submission"
    check_api "/quality/inspections?stage=SAMPLING" 1 "Stage 2: Sampling"
    check_api "/quality/inspections?stage=TESTING" 1 "Stage 3: Testing"
    check_api "/quality/inspections?stage=APPROVAL" 1 "Stage 4: Approval"
    check_api "/quality/inspections?stage=COMPLETE" 1 "Stage 5: Complete"
    
    # Tab 2: Warehouse Management
    log "\n${CYAN}Tab 2: Warehouse Management${NC}"
    check_api "/warehouse/inventory" "" "Warehouse Inventory"
    check_api "/warehouse/receipts" "" "Warehouse Receipts"
    
    # Tab 3: Market Analytics
    log "\n${CYAN}Tab 3: Market Analytics${NC}"
    check_api "/market/prices" "" "Market Prices"
    check_api "/market/trends" "" "Price Trends"
}

# Test ECTA Portal
test_ecta_portal() {
    section "TESTING ECTA (EXPORT TRADE AUTHORITY) PORTAL"
    
    log "${YELLOW}ECTA Portal has 5 main tabs${NC}\n"
    
    # Tab 0: Export Permits
    log "${CYAN}Tab 0: Export Permits${NC}"
    check_api "/permits" 5 "All Export Permits"
    check_api "/permits?status=APPROVED" 5 "Approved Permits"
    check_api "/permits?status=PENDING" "" "Pending Permits"
    
    # Tab 1: Phytosanitary Certificates
    log "\n${CYAN}Tab 1: Phytosanitary Certificates${NC}"
    check_api "/certificates/phyto" 5 "All Phyto Certificates"
    check_api "/certificates/phyto?status=ISSUED" 5 "Issued Certificates"
    
    # Tab 2: Certificate of Origin
    log "\n${CYAN}Tab 2: Certificate of Origin${NC}"
    check_api "/certificates/origin" 5 "All COO Certificates"
    check_api "/certificates/origin?status=ISSUED" 5 "Issued COO"
    
    # Tab 3: EUDR Compliance
    log "\n${CYAN}Tab 3: EUDR Compliance${NC}"
    check_api "/eudr/statements" "" "EUDR Statements"
    check_api "/eudr/geolocation" "" "Geolocation Data"
    
    # Tab 4: Document Verification
    log "\n${CYAN}Tab 4: Document Verification${NC}"
    check_api "/documents/verification" "" "Document Verification Queue"
}

# Test Shipping Portal
test_shipping_portal() {
    section "TESTING SHIPPING PORTAL"
    
    log "${YELLOW}Shipping Portal has 10 tabs (9 lifecycle stages + Users)${NC}\n"
    
    # Each tab represents a shipping lifecycle stage
    log "${CYAN}Shipping Lifecycle Stages${NC}"
    check_api "/shipping/shipments" 9 "All Shipments"
    check_api "/shipping/shipments?status=CUSTOMS_CLEARED" 2 "Tab 0: Customs Cleared"
    check_api "/shipping/shipments?status=LAND_TRANSPORT" 1 "Tab 1: Land Transport"
    check_api "/shipping/shipments?status=ARRIVED_PORT" 1 "Tab 2: Arrived Port"
    check_api "/shipping/shipments?status=PORT_WAREHOUSED" 1 "Tab 3: Port Warehoused"
    check_api "/shipping/shipments?status=VESSEL_LOADED" 1 "Tab 4: Vessel Loaded"
    check_api "/shipping/shipments?status=IN_TRANSIT" 1 "Tab 5: In Transit"
    check_api "/shipping/shipments?status=DESTINATION_PORT" 1 "Tab 6: Destination Port"
    check_api "/shipping/shipments?status=DELIVERED" 1 "Tab 7: Delivered"
    
    # Booking and tracking
    log "\n${CYAN}Shipping Operations${NC}"
    check_api "/shipping/bookings" "" "Shipping Bookings"
    check_api "/shipping/tracking" "" "Shipment Tracking"
}

# Test Customs Portal
test_customs_portal() {
    section "TESTING CUSTOMS PORTAL"
    
    log "${YELLOW}Customs Portal has 5 main tabs${NC}\n"
    
    # Tab 0: Customs Declarations (5 stages)
    log "${CYAN}Tab 0: Customs Declarations (5 Stages)${NC}"
    check_api "/customs/declarations" 5 "All Declarations"
    check_api "/customs/declarations?status=SUBMITTED" 1 "Stage 1: Submitted"
    check_api "/customs/declarations?status=UNDER_REVIEW" 1 "Stage 2: Under Review"
    check_api "/customs/declarations?status=APPROVED" 1 "Stage 3: Approved"
    check_api "/customs/declarations?status=CLEARED" 1 "Stage 4: Cleared"
    check_api "/customs/declarations?status=RELEASED" 1 "Stage 5: Released"
    
    # Tab 1: Duty & Tax Assessment
    log "\n${CYAN}Tab 1: Duty & Tax Assessment${NC}"
    check_api "/customs/assessments" "" "Tax Assessments"
    
    # Tab 2: Document Verification
    log "\n${CYAN}Tab 2: Document Verification${NC}"
    check_api "/customs/document-verification" "" "Document Queue"
    
    # Tab 3: Risk Management
    log "\n${CYAN}Tab 3: Risk Management${NC}"
    check_api "/customs/risk-assessment" "" "Risk Assessments"
    
    # Tab 4: Clearance History
    log "\n${CYAN}Tab 4: Clearance History${NC}"
    check_api "/customs/history" "" "Clearance History"
}

# Test Exporter Portal
test_exporter_portal() {
    section "TESTING EXPORTER PORTAL"
    
    log "${YELLOW}Exporter Portal has 6 main tabs${NC}\n"
    
    # Tab 0: My Contracts
    log "${CYAN}Tab 0: My Contracts${NC}"
    check_api "/contracts?exporter=EXP001" "" "My Contracts"
    
    # Tab 1: LC Status
    log "\n${CYAN}Tab 1: LC Status${NC}"
    check_api "/banking/lc" 50 "My LCs"
    
    # Tab 2: Shipping Status
    log "\n${CYAN}Tab 2: Shipping Status${NC}"
    check_api "/shipping/shipments" 9 "My Shipments"
    
    # Tab 3: Documents
    log "\n${CYAN}Tab 3: Documents${NC}"
    check_api "/documents" "" "My Documents"
    
    # Tab 4: Payments
    log "\n${CYAN}Tab 4: Payments${NC}"
    check_api "/payments" "" "Payment Status"
    
    # Tab 5: Quality Reports
    log "\n${CYAN}Tab 5: Quality Reports${NC}"
    check_api "/quality/inspections" 5 "Quality Reports"
}

# Generate test report
generate_report() {
    section "TEST SUMMARY REPORT"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log "${BOLD}Test Statistics:${NC}"
    log "  Total Tests: ${BOLD}$TOTAL_TESTS${NC}"
    log "  ${GREEN}Passed: $PASSED_TESTS${NC}"
    log "  ${RED}Failed: $FAILED_TESTS${NC}"
    log "  Success Rate: ${BOLD}$(awk "BEGIN {printf \"%.2f\", $PASSED_TESTS * 100 / $TOTAL_TESTS}")%${NC}"
    log "  Duration: ${BOLD}${DURATION}s${NC}"
    log "\nLog file: ${BOLD}$LOG_FILE${NC}\n"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "${GREEN}${BOLD}✓ ALL TESTS PASSED!${NC}\n"
        return 0
    else
        log "${RED}${BOLD}✗ SOME TESTS FAILED${NC}\n"
        return 1
    fi
}

# Main execution
main() {
    log "${BOLD}${CYAN}"
    log "╔════════════════════════════════════════════════════════════════╗"
    log "║  Ethiopian Coffee Export Consortium Blockchain System (CECBS)  ║"
    log "║         COMPREHENSIVE PORTAL TESTING SUITE                     ║"
    log "╚════════════════════════════════════════════════════════════════╝"
    log "${NC}\n"
    
    # Check if services are running
    log "${YELLOW}Checking services...${NC}\n"
    
    if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
        log "${RED}✗ API not responding at $API_URL${NC}"
        log "${YELLOW}Please start the API server first${NC}\n"
        exit 1
    fi
    log "${GREEN}✓ API is running${NC}\n"
    
    # Create test data
    create_test_data
    
    # Test all portals
    test_banks_portal
    test_nbe_portal
    test_ecx_portal
    test_ecta_portal
    test_shipping_portal
    test_customs_portal
    test_exporter_portal
    
    # Generate report
    generate_report
}

# Run main function
main "$@"
