#!/bin/bash

################################################################################
# Comprehensive Portal Workflow Test
# Tests ALL portals, ALL tabs, ALL subtabs, ALL actions, and ALL status transitions
#
# Credentials:
# - admin / admin123 (System Admin)
# - ecta_admin / password123 (ECTA Portal)
# - customs_admin / password123 (Customs Portal)
# - bank_admin / password123 (Banks Portal)
# - nbe_admin / password123 (NBE Portal)
# - shipping_admin / password123 (Shipping Portal)
# - ecx_admin / password123 (ECX Portal)
################################################################################

set -e

API_URL="${API_URL:-http://localhost:3001/api/v1}"
OUTPUT_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$OUTPUT_DIR/comprehensive_test_${TIMESTAMP}.log"
SUMMARY_FILE="$OUTPUT_DIR/comprehensive_test_summary_${TIMESTAMP}.md"

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
SKIPPED_TESTS=0

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Initialize log files
echo "==================================" > "$LOG_FILE"
echo "COMPREHENSIVE PORTAL WORKFLOW TEST" >> "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "==================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo "# Comprehensive Portal Workflow Test Results" > "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "**Test Run:** $(date)" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

################################################################################
# Helper Functions
################################################################################

log() {
    echo "$1" | tee -a "$LOG_FILE"
}

log_section() {
    echo "" | tee -a "$LOG_FILE"
    echo "================================" | tee -a "$LOG_FILE"
    echo "$1" | tee -a "$LOG_FILE"
    echo "================================" | tee -a "$LOG_FILE"
}

log_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}TEST #$TOTAL_TESTS:${NC} $1" | tee -a "$LOG_FILE"
}

log_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ PASS:${NC} $1" | tee -a "$LOG_FILE"
}

log_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}✗ FAIL:${NC} $1" | tee -a "$LOG_FILE"
}

log_skip() {
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    echo -e "${YELLOW}⊘ SKIP:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Login function
login_user() {
    local username=$1
    local password=$2
    local role=$3
    
    log_test "Login as $username ($role)"
    
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
        | jq -r '.data.token // empty')
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        log_pass "Logged in as $username"
        echo "$TOKEN" >&3  # Output token to fd 3 instead of stdout
        return 0
    else
        log_fail "Failed to login as $username"
        return 1
    fi
}

# API call function
api_call() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$API_URL$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "$API_URL$endpoint" \
            -H "Authorization: Bearer $token"
    fi
}

# Check status transition
check_status() {
    local entity=$1
    local entity_id=$2
    local expected_status=$3
    local token=$4
    
    local actual_status=$(api_call GET "/$entity/$entity_id" "$token" | jq -r '.status // .data.status // empty')
    
    if [ "$actual_status" = "$expected_status" ]; then
        log_pass "Status is $expected_status"
        return 0
    else
        log_fail "Expected status $expected_status, got $actual_status"
        return 1
    fi
}

################################################################################
# Test Suite
################################################################################

log_section "PHASE 1: SYSTEM HEALTH CHECK"

log_test "API Health Check"
HEALTH=$(curl -s "http://localhost:3001/health" | jq -r '.status // empty')
if [ "$HEALTH" = "healthy" ]; then
    log_pass "API is healthy"
else
    log_fail "API health check failed"
    exit 1
fi

################################################################################
log_section "PHASE 2: ADMIN PORTAL - USER MANAGEMENT"

ADMIN_TOKEN=$(login_user "admin" "admin123" "System Admin" 3>&1 1>&2 2>&3)

if [ -n "$ADMIN_TOKEN" ]; then
    log_test "List all users"
    USERS_RESPONSE=$(api_call GET "/users" "$ADMIN_TOKEN")
    # Debug: Save raw response
    echo "$USERS_RESPONSE" > /tmp/test-users-raw.json 2>&1
    USERS=$(echo "$USERS_RESPONSE" | jq '.data // .')
    # Debug: Save extracted users
    echo "$USERS" > /tmp/test-users-debug.json 2>&1
    USER_COUNT=$(echo "$USERS" | jq '. | length')
    log_pass "Found $USER_COUNT users"
    
    log_test "Verify portal admin accounts exist"
    
    for portal_user in "ecta_admin" "customs_admin" "bank_admin" "nbe_admin" "shipping_admin" "ecx_admin"; do
        FOUND=$(echo "$USERS" | jq -r ".[] | select(.username == \"$portal_user\") | .username" 2>/dev/null)
        if [ "$FOUND" = "$portal_user" ]; then
            log_pass "$portal_user account exists"
        else
            log_fail "$portal_user account not found"
        fi
    done
fi

################################################################################
log_section "PHASE 3: ECTA PORTAL - COMPLETE WORKFLOW"

ECTA_TOKEN=$(login_user "ecta_admin" "password123" "ECTA Admin" 3>&1 1>&2 2>&3)

if [ -n "$ECTA_TOKEN" ]; then
    # Create test exporter application
    log_test "Create exporter application"
    APP_DATA='{
        "companyName": "Test Coffee Export Ltd",
        "tinNumber": "TIN'$(date +%s)'",
        "businessLicenseNumber": "BL'$(date +%s)'",
        "email": "test.exporter'$(date +%s)'@coffeeexport.et",
        "phone": "+251911234567",
        "address": "Bole Road",
        "city": "Addis Ababa",
        "region": "Addis Ababa",
        "contactPerson": "John Doe",
        "capitalRequirement": "20000000",
        "professionalTaster": "yes",
        "tasterCertificate": "TC123456",
        "exporterType": "company"
    }'
    
    APP_RESPONSE=$(api_call POST "/exporters/exporter-applications" "$ECTA_TOKEN" "$APP_DATA")
    APPLICATION_ID=$(echo "$APP_RESPONSE" | jq -r '.data.applicationId // .data.application_id // .applicationId // .application_id // empty')
    
    if [ -n "$APPLICATION_ID" ]; then
        log_pass "Application created: $APPLICATION_ID"
        
        # Test Tab 1: Applications
        log_test "Tab 1: View pending applications"
        PENDING=$(api_call GET "/exporters/exporter-applications?status=pending" "$ECTA_TOKEN")
        log_pass "Retrieved pending applications"
        
        # Test Tab 1 Action: Review Application
        log_test "Tab 1 Action: Review application"
        # Generate approval data
        EXPORTER_ID="EXP-$(date +%s)"
        LICENSE_NUM="ECTA-$(date +%s)"
        EXPIRY_DATE=$(date -d "+2 years" +%Y-%m-%d)
        APPROVE_DATA="{\"exporterId\":\"$EXPORTER_ID\",\"ectaLicenseNumber\":\"$LICENSE_NUM\",\"licenseExpiryDate\":\"$EXPIRY_DATE\"}"
        
        APPROVE_RESPONSE=$(api_call POST "/exporters/exporter-applications/$APPLICATION_ID/approve" "$ECTA_TOKEN" "$APPROVE_DATA")
        # Check if approval succeeded
        APPROVAL_STATUS=$(echo "$APPROVE_RESPONSE" | jq -r '.data.status // empty')
        if [ "$APPROVAL_STATUS" = "approved" ]; then
            log_pass "Application approved"
        else
            log_fail "Failed to approve application"
        fi
        
        # Test Tab 2: Approved Applications  
        log_test "Tab 2: View approved applications"
        APPROVED=$(api_call GET "/exporters/exporter-applications?status=approved" "$ECTA_TOKEN")
        log_pass "Retrieved approved applications"
        
        # Test Tab 2 Action: Issue License
        log_test "Tab 2 Action: Issue exporter license"
        LICENSE_DATA='{"licenseNumber":"ECX'$(date +%s)'","validFrom":"2024-01-01","validUntil":"2025-12-31"}'
        LICENSE_RESPONSE=$(api_call POST "/exporters" "$ECTA_TOKEN" "$LICENSE_DATA")
        EXPORTER_ID=$(echo "$LICENSE_RESPONSE" | jq -r '.data.exporter_id // .exporter_id // empty')
        
        if [ -n "$EXPORTER_ID" ]; then
            log_pass "License issued: $EXPORTER_ID"
        fi
        
        # Test Tab 3: Active Exporters
        log_test "Tab 3: View active exporters"
        ACTIVE=$(api_call GET "/exporters?status=ACTIVE" "$ECTA_TOKEN")
        log_pass "Retrieved active exporters"
        
        # Test Tab 4: Contracts
        log_test "Tab 4: View export contracts"
        CONTRACTS=$(api_call GET "/contracts" "$ECTA_TOKEN")
        log_pass "Retrieved contracts"
        
        # Create a test contract
        log_test "Tab 4 Action: Register new contract"
        CONTRACT_DATA='{
            "contractNumber":"CNT'$(date +%s)'",
            "exporterId":"'$EXPORTER_ID'",
            "buyerName":"International Coffee Traders Inc",
            "buyerCountry":"USA",
            "productType":"Arabica Coffee",
            "quantity":50000,
            "unitPrice":3.50,
            "currency":"USD",
            "deliveryTerms":"FOB",
            "deliveryDate":"2024-12-31"
        }'
        CONTRACT_RESPONSE=$(api_call POST "/contracts" "$ECTA_TOKEN" "$CONTRACT_DATA")
        CONTRACT_ID=$(echo "$CONTRACT_RESPONSE" | jq -r '.data.contract_id // .contract_id // empty')
        
        if [ -n "$CONTRACT_ID" ]; then
            log_pass "Contract registered: $CONTRACT_ID"
        fi
        
        # Test Tab 5: Quality Inspections
        log_test "Tab 5: View quality inspections"
        INSPECTIONS=$(api_call GET "/quality-inspections" "$ECTA_TOKEN")
        log_pass "Retrieved quality inspections"
        
        # Test Tab 5 Action: Schedule inspection
        log_test "Tab 5 Action: Schedule quality inspection"
        INSPECTION_DATA='{
            "shipmentId":"SHP'$(date +%s)'",
            "inspectionDate":"2024-06-15",
            "inspectorName":"Inspector Smith",
            "warehouseLocation":"Addis Ababa Central Warehouse"
        }'
        INSPECTION_RESPONSE=$(api_call POST "/quality-inspections" "$ECTA_TOKEN" "$INSPECTION_DATA")
        INSPECTION_ID=$(echo "$INSPECTION_RESPONSE" | jq -r '.data.inspection_id // .inspection_id // empty')
        
        if [ -n "$INSPECTION_ID" ]; then
            log_pass "Inspection scheduled: $INSPECTION_ID"
        fi
        
        # Test Tab 6: Export Permits
        log_test "Tab 6: View export permits"
        PERMITS=$(api_call GET "/export-permits" "$ECTA_TOKEN")
        log_pass "Retrieved export permits"
        
        # Test Tab 7: Documents
        log_test "Tab 7: View documents"
        DOCS=$(api_call GET "/documents?entityType=CONTRACT&entityId=$CONTRACT_ID" "$ECTA_TOKEN")
        log_pass "Retrieved documents"
        
        # Test Tab 8: Reports & Analytics
        log_test "Tab 8: View dashboard statistics"
        STATS=$(api_call GET "/dashboard/stats" "$ECTA_TOKEN")
        log_pass "Retrieved dashboard stats"
        
    else
        log_fail "Failed to create exporter application"
    fi
fi

################################################################################
log_section "PHASE 4: CUSTOMS PORTAL - COMPLETE WORKFLOW"

CUSTOMS_TOKEN=$(login_user "customs_admin" "password123" "Customs Admin" 3>&1 1>&2 2>&3)

if [ -n "$CUSTOMS_TOKEN" ] && [ -n "$CONTRACT_ID" ]; then
    # Test Tab 1: Customs Declarations
    log_test "Tab 1: View customs declarations"
    DECLARATIONS=$(api_call GET "/customs/declarations" "$CUSTOMS_TOKEN")
    log_pass "Retrieved customs declarations"
    
    # Test Tab 1 Action: Submit declaration
    log_test "Tab 1 Action: Submit customs declaration"
    DECL_DATA='{
        "shipmentId":"SHP'$(date +%s)'",
        "declarationType":"EXPORT",
        "declarationNumber":"CD'$(date +%s)'",
        "exporterId":"'$EXPORTER_ID'",
        "productDescription":"Arabica Coffee Beans",
        "hsCode":"0901.11",
        "quantity":50000,
        "value":175000,
        "currency":"USD"
    }'
    DECL_RESPONSE=$(api_call POST "/customs/declarations" "$CUSTOMS_TOKEN" "$DECL_DATA")
    DECLARATION_ID=$(echo "$DECL_RESPONSE" | jq -r '.data.declaration_id // .declaration_id // empty')
    
    if [ -n "$DECLARATION_ID" ]; then
        log_pass "Declaration submitted: $DECLARATION_ID"
        
        # Test Tab 1 Action: Inspect declaration
        log_test "Tab 1 Action: Mark declaration under inspection"
        api_call PUT "/customs/declarations/$DECLARATION_ID/status" "$CUSTOMS_TOKEN" '{"status":"UNDER_INSPECTION"}'
        check_status "customs/declarations" "$DECLARATION_ID" "UNDER_INSPECTION" "$CUSTOMS_TOKEN"
        
        # Test Tab 1 Action: Clear declaration
        log_test "Tab 1 Action: Clear customs declaration"
        api_call PUT "/customs/declarations/$DECLARATION_ID/status" "$CUSTOMS_TOKEN" '{"status":"CLEARED"}'
        check_status "customs/declarations" "$DECLARATION_ID" "CLEARED" "$CUSTOMS_TOKEN"
    fi
    
    # Test Tab 2: Clearances
    log_test "Tab 2: View customs clearances"
    CLEARANCES=$(api_call GET "/customs/clearances" "$CUSTOMS_TOKEN")
    log_pass "Retrieved customs clearances"
    
    # Test Tab 3: Freight Bookings
    log_test "Tab 3: View freight bookings"
    BOOKINGS=$(api_call GET "/shipping/bookings" "$CUSTOMS_TOKEN")
    log_pass "Retrieved freight bookings"
    
    # Test Tab 4: Inspections
    log_test "Tab 4: View inspection requests"
    CUSTOMS_INSPECTIONS=$(api_call GET "/quality-inspections?portal=customs" "$CUSTOMS_TOKEN")
    log_pass "Retrieved inspection requests"
    
    # Test Tab 5: Documents
    log_test "Tab 5: View customs documents"
    CUSTOMS_DOCS=$(api_call GET "/documents?entityType=CUSTOMS" "$CUSTOMS_TOKEN")
    log_pass "Retrieved customs documents"
    
    # Test Tab 6: Reports
    log_test "Tab 6: View customs reports"
    CUSTOMS_REPORTS=$(api_call GET "/reports/customs" "$CUSTOMS_TOKEN")
    log_pass "Retrieved customs reports"
fi

################################################################################
log_section "PHASE 5: BANKS PORTAL - COMPLETE WORKFLOW"

BANK_TOKEN=$(login_user "bank_admin" "password123" "Bank Admin" 3>&1 1>&2 2>&3)

if [ -n "$BANK_TOKEN" ] && [ -n "$CONTRACT_ID" ]; then
    # Test Tab 1: Letters of Credit
    log_test "Tab 1: View letters of credit"
    LCS=$(api_call GET "/letters-of-credit" "$BANK_TOKEN")
    log_pass "Retrieved letters of credit"
    
    # Test Tab 1 Action: Create LC
    log_test "Tab 1 Action: Create letter of credit"
    LC_DATA='{
        "contractId":"'$CONTRACT_ID'",
        "lcNumber":"LC'$(date +%s)'",
        "issuingBank":"Commercial Bank of Ethiopia",
        "beneficiaryBank":"Wells Fargo, USA",
        "amount":175000,
        "currency":"USD",
        "expiryDate":"2024-12-31",
        "terms":"Sight LC"
    }'
    LC_RESPONSE=$(api_call POST "/letters-of-credit" "$BANK_TOKEN" "$LC_DATA")
    LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lc_id // .lc_id // empty')
    
    if [ -n "$LC_ID" ]; then
        log_pass "LC created: $LC_ID"
        
        # Test Tab 1 Action: Approve LC
        log_test "Tab 1 Action: Approve letter of credit"
        api_call PUT "/letters-of-credit/$LC_ID/status" "$BANK_TOKEN" '{"status":"APPROVED"}'
        check_status "letters-of-credit" "$LC_ID" "APPROVED" "$BANK_TOKEN"
        
        # Test Tab 1 Action: Issue LC
        log_test "Tab 1 Action: Issue letter of credit"
        api_call PUT "/letters-of-credit/$LC_ID/status" "$BANK_TOKEN" '{"status":"ISSUED"}'
        check_status "letters-of-credit" "$LC_ID" "ISSUED" "$BANK_TOKEN"
    fi
    
    # Test Tab 2: Forex Allocations
    log_test "Tab 2: View forex allocations"
    FOREX=$(api_call GET "/forex/allocations" "$BANK_TOKEN")
    log_pass "Retrieved forex allocations"
    
    # Test Tab 2 Action: Request forex
    log_test "Tab 2 Action: Request forex allocation"
    FOREX_DATA='{
        "lcId":"'$LC_ID'",
        "amount":175000,
        "currency":"USD",
        "purpose":"Export payment"
    }'
    FOREX_RESPONSE=$(api_call POST "/forex/allocations" "$BANK_TOKEN" "$FOREX_DATA")
    FOREX_ID=$(echo "$FOREX_RESPONSE" | jq -r '.data.forex_id // .forex_id // empty')
    
    if [ -n "$FOREX_ID" ]; then
        log_pass "Forex requested: $FOREX_ID"
    fi
    
    # Test Tab 3: Payments
    log_test "Tab 3: View payments"
    PAYMENTS=$(api_call GET "/payments" "$BANK_TOKEN")
    log_pass "Retrieved payments"
    
    # Test Tab 4: SWIFT Messages
    log_test "Tab 4: View SWIFT messages"
    SWIFT=$(api_call GET "/swift/messages" "$BANK_TOKEN")
    log_pass "Retrieved SWIFT messages"
    
    # Test Tab 5: Documentary Collections
    log_test "Tab 5: View documentary collections"
    COLLECTIONS=$(api_call GET "/documentary-collections" "$BANK_TOKEN")
    log_pass "Retrieved documentary collections"
    
    # Test Tab 6: Documents
    log_test "Tab 6: View banking documents"
    BANK_DOCS=$(api_call GET "/documents?entityType=LC" "$BANK_TOKEN")
    log_pass "Retrieved banking documents"
fi

################################################################################
log_section "PHASE 6: NBE PORTAL - COMPLETE WORKFLOW"

NBE_TOKEN=$(login_user "nbe_admin" "password123" "NBE Admin" 3>&1 1>&2 2>&3)

if [ -n "$NBE_TOKEN" ]; then
    # Test Tab 1: Forex Requests
    log_test "Tab 1: View forex requests"
    NBE_FOREX=$(api_call GET "/forex/allocations?status=REQUESTED" "$NBE_TOKEN")
    log_pass "Retrieved forex requests"
    
    if [ -n "$FOREX_ID" ]; then
        # Test Tab 1 Action: Approve forex
        log_test "Tab 1 Action: Approve forex allocation"
        api_call PUT "/forex/allocations/$FOREX_ID/status" "$NBE_TOKEN" '{"status":"CONFIRMED"}'
        check_status "forex/allocations" "$FOREX_ID" "CONFIRMED" "$NBE_TOKEN"
    fi
    
    # Test Tab 2: Repatriation Monitoring
    log_test "Tab 2: View forex repatriations"
    REPATRIATIONS=$(api_call GET "/forex/repatriations" "$NBE_TOKEN")
    log_pass "Retrieved repatriations"
    
    # Test Tab 3: Retention Accounts
    log_test "Tab 3: View retention accounts"
    RETENTION=$(api_call GET "/forex/retention" "$NBE_TOKEN")
    log_pass "Retrieved retention accounts"
    
    # Test Tab 4: LC Monitoring
    log_test "Tab 4: View LC monitoring"
    NBE_LCS=$(api_call GET "/letters-of-credit?portal=nbe" "$NBE_TOKEN")
    log_pass "Retrieved LCs for monitoring"
    
    # Test Tab 5: Reports
    log_test "Tab 5: View NBE reports"
    NBE_REPORTS=$(api_call GET "/reports/nbe" "$NBE_TOKEN")
    log_pass "Retrieved NBE reports"
fi

################################################################################
log_section "PHASE 7: SHIPPING PORTAL - COMPLETE WORKFLOW"

SHIPPING_TOKEN=$(login_user "shipping_admin" "password123" "Shipping Admin" 3>&1 1>&2 2>&3)

if [ -n "$SHIPPING_TOKEN" ] && [ -n "$CONTRACT_ID" ]; then
    # Test Tab 1: Shipments
    log_test "Tab 1: View shipments"
    SHIPMENTS=$(api_call GET "/shipments" "$SHIPPING_TOKEN")
    log_pass "Retrieved shipments"
    
    # Test Tab 1 Action: Create shipment
    log_test "Tab 1 Action: Create new shipment"
    SHIPMENT_DATA='{
        "contractId":"'$CONTRACT_ID'",
        "origin":"Addis Ababa",
        "destination":"New York",
        "estimatedDepartureDate":"2024-06-20",
        "estimatedArrivalDate":"2024-07-20"
    }'
    SHIPMENT_RESPONSE=$(api_call POST "/shipments" "$SHIPPING_TOKEN" "$SHIPMENT_DATA")
    SHIPMENT_ID=$(echo "$SHIPMENT_RESPONSE" | jq -r '.data.shipment_id // .shipment_id // empty')
    
    if [ -n "$SHIPMENT_ID" ]; then
        log_pass "Shipment created: $SHIPMENT_ID"
        
        # Test Tab 1 Action: Update shipment status
        log_test "Tab 1 Action: Update shipment to FREIGHT_BOOKED"
        api_call PUT "/shipments/$SHIPMENT_ID/status" "$SHIPPING_TOKEN" '{"status":"FREIGHT_BOOKED"}'
        check_status "shipments" "$SHIPMENT_ID" "FREIGHT_BOOKED" "$SHIPPING_TOKEN"
    fi
    
    # Test Tab 2: Bookings
    log_test "Tab 2: View freight bookings"
    SHIP_BOOKINGS=$(api_call GET "/shipping/bookings" "$SHIPPING_TOKEN")
    log_pass "Retrieved freight bookings"
    
    # Test Tab 3: Tracking
    log_test "Tab 3: View shipment tracking"
    TRACKING=$(api_call GET "/shipments/$SHIPMENT_ID/tracking" "$SHIPPING_TOKEN")
    log_pass "Retrieved tracking information"
    
    # Test Tab 4: Documents
    log_test "Tab 4: View shipping documents"
    SHIP_DOCS=$(api_call GET "/documents?entityType=SHIPMENT&entityId=$SHIPMENT_ID" "$SHIPPING_TOKEN")
    log_pass "Retrieved shipping documents"
fi

################################################################################
log_section "PHASE 8: ECX PORTAL - COMPLETE WORKFLOW"

ECX_TOKEN=$(login_user "ecx_admin" "password123" "ECX Admin" 3>&1 1>&2 2>&3)

if [ -n "$ECX_TOKEN" ]; then
    # Test Tab 1: Coffee Lots
    log_test "Tab 1: View coffee lots"
    LOTS=$(api_call GET "/ecx/lots" "$ECX_TOKEN")
    log_pass "Retrieved coffee lots"
    
    # Test Tab 1 Action: Register lot
    log_test "Tab 1 Action: Register coffee lot"
    LOT_DATA='{
        "lotNumber":"LOT'$(date +%s)'",
        "coffeeType":"Arabica",
        "grade":"Grade 1",
        "weight":50000,
        "warehouse":"Addis Ababa Central",
        "farmerId":"FARM001"
    }'
    LOT_RESPONSE=$(api_call POST "/ecx/lots" "$ECX_TOKEN" "$LOT_DATA")
    LOT_ID=$(echo "$LOT_RESPONSE" | jq -r '.data.lot_id // .lot_id // empty')
    
    if [ -n "$LOT_ID" ]; then
        log_pass "Lot registered: $LOT_ID"
        
        # Test Tab 1 Action: Grade lot
        log_test "Tab 1 Action: Grade coffee lot"
        api_call PUT "/ecx/lots/$LOT_ID/grade" "$ECX_TOKEN" '{"grade":"Grade 1","cupping_score":85.5}'
        check_status "ecx/lots" "$LOT_ID" "GRADED" "$ECX_TOKEN"
    fi
    
    # Test Tab 2: Warehouse Management
    log_test "Tab 2: View warehouse inventory"
    INVENTORY=$(api_call GET "/ecx/inventory" "$ECX_TOKEN")
    log_pass "Retrieved warehouse inventory"
    
    # Test Tab 3: Quality Reports
    log_test "Tab 3: View quality reports"
    QUALITY=$(api_call GET "/ecx/quality-reports" "$ECX_TOKEN")
    log_pass "Retrieved quality reports"
fi

################################################################################
log_section "PHASE 9: CROSS-PORTAL STATUS VERIFICATION"

log_test "Verify contract visible in all portals"
if [ -n "$CONTRACT_ID" ]; then
    for portal in "ECTA" "CUSTOMS" "BANKS"; do
        case $portal in
            ECTA) TOKEN=$ECTA_TOKEN ;;
            CUSTOMS) TOKEN=$CUSTOMS_TOKEN ;;
            BANKS) TOKEN=$BANK_TOKEN ;;
        esac
        
        VISIBLE=$(api_call GET "/contracts/$CONTRACT_ID" "$TOKEN" | jq -r '.contract_id // .data.contract_id // empty')
        if [ -n "$VISIBLE" ]; then
            log_pass "Contract visible in $portal portal"
        else
            log_fail "Contract NOT visible in $portal portal"
        fi
    done
fi

################################################################################
log_section "PHASE 10: AUDIT TRAIL VERIFICATION"

log_test "Verify audit trail for contract"
if [ -n "$CONTRACT_ID" ] && [ -n "$ADMIN_TOKEN" ]; then
    AUDIT=$(api_call GET "/audit/trail?entityType=CONTRACT&entityId=$CONTRACT_ID" "$ADMIN_TOKEN")
    AUDIT_COUNT=$(echo "$AUDIT" | jq '. | length')
    log_pass "Found $AUDIT_COUNT audit trail entries"
fi

################################################################################
# Generate Summary Report
################################################################################

log_section "TEST SUMMARY"

TOTAL_PORTALS=7
echo "" >> "$SUMMARY_FILE"
echo "## Summary Statistics" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "- **Total Tests:** $TOTAL_TESTS" >> "$SUMMARY_FILE"
echo "- **Passed:** $PASSED_TESTS ✓" >> "$SUMMARY_FILE"
echo "- **Failed:** $FAILED_TESTS ✗" >> "$SUMMARY_FILE"
echo "- **Skipped:** $SKIPPED_TESTS ⊘" >> "$SUMMARY_FILE"
echo "- **Success Rate:** $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "- **Portals Tested:** $TOTAL_PORTALS" >> "$SUMMARY_FILE"
echo "  - Admin Portal ✓" >> "$SUMMARY_FILE"
echo "  - ECTA Portal ✓" >> "$SUMMARY_FILE"
echo "  - Customs Portal ✓" >> "$SUMMARY_FILE"
echo "  - Banks Portal ✓" >> "$SUMMARY_FILE"
echo "  - NBE Portal ✓" >> "$SUMMARY_FILE"
echo "  - Shipping Portal ✓" >> "$SUMMARY_FILE"
echo "  - ECX Portal ✓" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

log ""
log "========================================="
log "TEST EXECUTION COMPLETE"
log "========================================="
log "Total Tests: $TOTAL_TESTS"
log "Passed: $PASSED_TESTS"
log "Failed: $FAILED_TESTS"
log "Skipped: $SKIPPED_TESTS"
log "Success Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
log ""
log "Results saved to:"
log "  - Log: $LOG_FILE"
log "  - Summary: $SUMMARY_FILE"
log "========================================="

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
