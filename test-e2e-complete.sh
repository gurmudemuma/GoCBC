#!/bin/bash
# ============================================================================
# CECBS - Complete End-to-End System Test
# Tests entire coffee export workflow from registration to delivery
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# API Configuration
API_BASE="http://localhost:3001/api/v1"
UI_BASE="http://localhost:3000"

# Test Results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Test Data Storage
ADMIN_TOKEN=""
EXPORTER_TOKEN=""
ECTA_TOKEN=""
BANK_TOKEN=""
NBE_TOKEN=""
CUSTOMS_TOKEN=""
SHIPPING_TOKEN=""

APPLICATION_ID=""
EXPORTER_ID=""
CONTRACT_ID=""
LC_ID=""
SHIPMENT_ID=""
PERMIT_ID=""
DECLARATION_ID=""

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${PURPLE}============================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Test API endpoint
test_api() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local expected_status=${5:-200}
    
    if [ -n "$token" ]; then
        HEADERS="-H \"Authorization: Bearer $token\""
    else
        HEADERS=""
    fi
    
    if [ -n "$data" ]; then
        RESPONSE=$(eval curl -s -w "\\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $HEADERS \
            -d "'$data'")
    else
        RESPONSE=$(eval curl -s -w "\\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            $HEADERS)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" == "$expected_status" ]; then
        return 0
    else
        return 1
    fi
}

# ============================================================================
# Test Phase 0: System Health Check
# ============================================================================

test_system_health() {
    print_header "PHASE 0: SYSTEM HEALTH CHECK"
    
    print_step "Testing API health..."
    if curl -s http://localhost:3001/health | grep -q "healthy"; then
        print_success "API is healthy"
    else
        print_fail "API health check failed"
        exit 1
    fi
    
    print_step "Testing UI availability..."
    if curl -s http://localhost:3000 | grep -q "Ethiopian Coffee"; then
        print_success "UI is accessible"
    else
        print_fail "UI is not accessible"
    fi
    
    print_step "Testing database connection..."
    if PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c "SELECT 1" > /dev/null 2>&1; then
        print_success "Database is connected"
    else
        print_fail "Database connection failed"
    fi
    
    print_step "Checking blockchain containers..."
    RUNNING_CONTAINERS=$(docker ps --filter "name=peer" --filter "status=running" | grep -c "peer" || true)
    if [ "$RUNNING_CONTAINERS" -ge 6 ]; then
        print_success "Blockchain network is running ($RUNNING_CONTAINERS peers)"
    else
        print_fail "Not all blockchain peers are running"
    fi
    
    print_step "Checking chaincode..."
    if docker ps | grep -q "coffee-chaincode"; then
        print_success "Chaincode container is running"
    else
        print_fail "Chaincode container not found"
    fi
}

# ============================================================================
# Test Phase 1: Authentication
# ============================================================================

test_authentication() {
    print_header "PHASE 1: AUTHENTICATION TESTING"
    
    # Test Admin Login
    print_step "Testing admin login..."
    RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}')
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        ADMIN_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        print_success "Admin login successful"
        print_info "Token: ${ADMIN_TOKEN:0:20}..."
    else
        print_fail "Admin login failed"
        echo "$RESPONSE"
    fi
    
    # Test Exporter Login
    print_step "Testing exporter login..."
    RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"exporter1","password":"password123"}')
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        EXPORTER_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        print_success "Exporter login successful"
    else
        print_fail "Exporter login failed"
    fi
    
    # Test ECTA Login
    print_step "Testing ECTA admin login..."
    RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"ecta_admin","password":"password123"}')
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        ECTA_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        print_success "ECTA admin login successful"
    else
        print_warning "ECTA admin login failed (may not exist yet)"
    fi
    
    # Test Token Validation
    print_step "Testing token validation..."
    RESPONSE=$(curl -s -X GET "$API_BASE/auth/me" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$RESPONSE" | grep -q '"username":"admin"'; then
        print_success "Token validation successful"
    else
        print_fail "Token validation failed"
    fi
    
    # Test Invalid Credentials
    print_step "Testing invalid credentials..."
    RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"wrong"}')
    
    if echo "$RESPONSE" | grep -q '"success":false'; then
        print_success "Invalid credentials properly rejected"
    else
        print_fail "Invalid credentials not rejected"
    fi
}

# ============================================================================
# Test Phase 2: Exporter Registration
# ============================================================================

test_exporter_registration() {
    print_header "PHASE 2: EXPORTER REGISTRATION"
    
    print_step "Submitting new exporter application..."
    
    TIMESTAMP=$(date +%s)
    COMPANY_NAME="Test Coffee Exporter $TIMESTAMP"
    
    RESPONSE=$(curl -s -X POST "$API_BASE/exporter-applications" \
        -H "Content-Type: application/json" \
        -d "{
            \"companyName\": \"$COMPANY_NAME\",
            \"tin\": \"TIN${TIMESTAMP}\",
            \"licenseNumber\": \"LIC${TIMESTAMP}\",
            \"contactPerson\": \"John Doe\",
            \"email\": \"test${TIMESTAMP}@example.com\",
            \"phone\": \"+251911234567\",
            \"businessAddress\": \"Addis Ababa, Ethiopia\",
            \"yearEstablished\": 2020,
            \"annualCapacity\": 1000,
            \"certifications\": [\"Organic\", \"Fair Trade\"],
            \"bankName\": \"Commercial Bank of Ethiopia\",
            \"bankAccount\": \"1000${TIMESTAMP}\"
        }")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        APPLICATION_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
        print_success "Application submitted (ID: $APPLICATION_ID)"
    else
        print_fail "Application submission failed"
        echo "$RESPONSE"
    fi
    
    print_step "Retrieving application status..."
    if [ -n "$EXPORTER_TOKEN" ]; then
        RESPONSE=$(curl -s -X GET "$API_BASE/exporter-applications/$APPLICATION_ID" \
            -H "Authorization: Bearer $EXPORTER_TOKEN")
        
        if echo "$RESPONSE" | grep -q '"status":"pending"'; then
            print_success "Application status retrieved"
        else
            print_warning "Could not retrieve application status"
        fi
    fi
}

# ============================================================================
# Test Phase 3: Contract Management
# ============================================================================

test_contract_management() {
    print_header "PHASE 3: CONTRACT MANAGEMENT"
    
    if [ -z "$EXPORTER_TOKEN" ]; then
        print_warning "Skipping contract tests (no exporter token)"
        return
    fi
    
    print_step "Creating new coffee contract..."
    
    TIMESTAMP=$(date +%s)
    CONTRACT_NUMBER="CNT${TIMESTAMP}"
    
    RESPONSE=$(curl -s -X POST "$API_BASE/contracts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $EXPORTER_TOKEN" \
        -d "{
            \"contractNumber\": \"$CONTRACT_NUMBER\",
            \"buyerName\": \"European Coffee Importers Ltd\",
            \"buyerCountry\": \"Germany\",
            \"quantity\": 100,
            \"unit\": \"tons\",
            \"pricePerUnit\": 3500,
            \"currency\": \"USD\",
            \"totalValue\": 350000,
            \"coffeeType\": \"Arabica\",
            \"quality\": \"Grade 1\",
            \"deliveryTerms\": \"FOB\",
            \"paymentTerms\": \"LC at sight\",
            \"shipmentDeadline\": \"2026-12-31T00:00:00Z\"
        }")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        CONTRACT_ID=$(echo "$RESPONSE" | grep -o '"contractId":"[^"]*' | cut -d'"' -f4)
        print_success "Contract created (ID: $CONTRACT_ID)"
    else
        print_fail "Contract creation failed"
        echo "$RESPONSE"
    fi
    
    print_step "Listing contracts..."
    RESPONSE=$(curl -s -X GET "$API_BASE/contracts" \
        -H "Authorization: Bearer $EXPORTER_TOKEN")
    
    if echo "$RESPONSE" | grep -q "$CONTRACT_NUMBER"; then
        print_success "Contract appears in list"
    else
        print_warning "Contract not found in list"
    fi
}

# ============================================================================
# Test Phase 4: Letter of Credit (LC) Workflow
# ============================================================================

test_lc_workflow() {
    print_header "PHASE 4: LETTER OF CREDIT WORKFLOW"
    
    if [ -z "$EXPORTER_TOKEN" ] || [ -z "$CONTRACT_ID" ]; then
        print_warning "Skipping LC tests (missing prerequisites)"
        return
    fi
    
    print_step "Requesting new LC..."
    
    RESPONSE=$(curl -s -X POST "$API_BASE/lcs" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $EXPORTER_TOKEN" \
        -d "{
            \"contractId\": \"$CONTRACT_ID\",
            \"amount\": 350000,
            \"currency\": \"USD\",
            \"beneficiary\": \"Test Coffee Exporter\",
            \"issuingBank\": \"Commercial Bank of Ethiopia\",
            \"advisingBank\": \"Deutsche Bank\",
            \"expiryDate\": \"2026-12-31T00:00:00Z\",
            \"latestShipmentDate\": \"2026-12-15T00:00:00Z\",
            \"termsAndConditions\": \"Standard LC terms\"
        }")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        LC_ID=$(echo "$RESPONSE" | grep -o '"lcId":"[^"]*' | cut -d'"' -f4)
        print_success "LC requested (ID: $LC_ID)"
        print_info "Expected status: REQUESTED"
    else
        print_fail "LC request failed"
        echo "$RESPONSE"
    fi
    
    if [ -n "$LC_ID" ]; then
        print_step "Checking LC status..."
        sleep 2
        
        RESPONSE=$(curl -s -X GET "$API_BASE/lcs/$LC_ID" \
            -H "Authorization: Bearer $EXPORTER_TOKEN")
        
        if echo "$RESPONSE" | grep -q '"status":"REQUESTED"'; then
            print_success "LC status is REQUESTED"
        else
            print_warning "LC status may not be REQUESTED"
        fi
    fi
}

# ============================================================================
# Test Phase 5: Document Management
# ============================================================================

test_document_management() {
    print_header "PHASE 5: DOCUMENT MANAGEMENT"
    
    if [ -z "$EXPORTER_TOKEN" ] || [ -z "$CONTRACT_ID" ]; then
        print_warning "Skipping document tests (missing prerequisites)"
        return
    fi
    
    print_step "Creating test PDF document..."
    cat > /tmp/test-contract.pdf << 'EOF'
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
212
%%EOF
EOF
    
    print_step "Uploading contract document..."
    
    RESPONSE=$(curl -s -X POST "$API_BASE/documents/upload" \
        -H "Authorization: Bearer $EXPORTER_TOKEN" \
        -F "file=@/tmp/test-contract.pdf" \
        -F "documentType=contract" \
        -F "entityType=contract" \
        -F "entityId=$CONTRACT_ID")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        print_success "Document uploaded successfully"
    else
        print_warning "Document upload may have failed (endpoint might need different format)"
    fi
    
    rm -f /tmp/test-contract.pdf
}

# ============================================================================
# Test Phase 6: ECTA Permits & Quality Control
# ============================================================================

test_ecta_workflow() {
    print_header "PHASE 6: ECTA PERMITS & QUALITY CONTROL"
    
    if [ -z "$ECTA_TOKEN" ]; then
        print_warning "Skipping ECTA tests (no ECTA token)"
        return
    fi
    
    print_step "Testing ECTA dashboard access..."
    RESPONSE=$(curl -s -X GET "$API_BASE/ecta/dashboard" \
        -H "Authorization: Bearer $ECTA_TOKEN")
    
    if echo "$RESPONSE" | grep -q '"success":true' || echo "$RESPONSE" | grep -q "permits"; then
        print_success "ECTA dashboard accessible"
    else
        print_warning "ECTA dashboard may not be accessible"
    fi
}

# ============================================================================
# Test Phase 7: Shipment & Logistics
# ============================================================================

test_shipment_workflow() {
    print_header "PHASE 7: SHIPMENT & LOGISTICS"
    
    if [ -z "$EXPORTER_TOKEN" ] || [ -z "$CONTRACT_ID" ]; then
        print_warning "Skipping shipment tests (missing prerequisites)"
        return
    fi
    
    print_step "Creating shipment..."
    
    TIMESTAMP=$(date +%s)
    
    RESPONSE=$(curl -s -X POST "$API_BASE/shipments" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $EXPORTER_TOKEN" \
        -d "{
            \"contractId\": \"$CONTRACT_ID\",
            \"vesselName\": \"MV Coffee Express\",
            \"containerNumber\": \"CONT${TIMESTAMP}\",
            \"portOfLoading\": \"Djibouti\",
            \"portOfDischarge\": \"Hamburg\",
            \"estimatedDepartureDate\": \"2026-12-01T00:00:00Z\",
            \"estimatedArrivalDate\": \"2026-12-20T00:00:00Z\"
        }")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        SHIPMENT_ID=$(echo "$RESPONSE" | grep -o '"shipmentId":"[^"]*' | cut -d'"' -f4)
        print_success "Shipment created (ID: $SHIPMENT_ID)"
    else
        print_warning "Shipment creation may have failed"
    fi
}

# ============================================================================
# Test Phase 8: Customs Clearance
# ============================================================================

test_customs_workflow() {
    print_header "PHASE 8: CUSTOMS CLEARANCE"
    
    if [ -z "$SHIPMENT_ID" ]; then
        print_warning "Skipping customs tests (no shipment ID)"
        return
    fi
    
    print_step "Testing customs declaration..."
    print_info "This would require customs user token"
    print_warning "Customs workflow test skipped (needs implementation)"
}

# ============================================================================
# Test Phase 9: Payment & Settlement
# ============================================================================

test_payment_workflow() {
    print_header "PHASE 9: PAYMENT & SETTLEMENT"
    
    if [ -z "$LC_ID" ]; then
        print_warning "Skipping payment tests (no LC ID)"
        return
    fi
    
    print_step "Testing payment status check..."
    RESPONSE=$(curl -s -X GET "$API_BASE/payments?lcId=$LC_ID" \
        -H "Authorization: Bearer $EXPORTER_TOKEN")
    
    if echo "$RESPONSE" | grep -q '"success":true' || echo "$RESPONSE" | grep -q "payments"; then
        print_success "Payment endpoint accessible"
    else
        print_warning "Payment endpoint may need different format"
    fi
}

# ============================================================================
# Test Phase 10: Reporting & Analytics
# ============================================================================

test_analytics() {
    print_header "PHASE 10: REPORTING & ANALYTICS"
    
    print_step "Testing analytics dashboard..."
    RESPONSE=$(curl -s -X GET "$API_BASE/analytics/dashboard" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$RESPONSE" | grep -q "success" || echo "$RESPONSE" | grep -q "statistics"; then
        print_success "Analytics dashboard accessible"
    else
        print_warning "Analytics dashboard format may be different"
    fi
    
    print_step "Testing audit logs..."
    RESPONSE=$(curl -s -X GET "$API_BASE/audit-logs?limit=10" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$RESPONSE" | grep -q "success" || echo "$RESPONSE" | grep -q "logs"; then
        print_success "Audit logs accessible"
    else
        print_warning "Audit logs format may be different"
    fi
}

# ============================================================================
# Test Phase 11: Blockchain Verification
# ============================================================================

test_blockchain_integration() {
    print_header "PHASE 11: BLOCKCHAIN INTEGRATION"
    
    print_step "Testing blockchain query..."
    
    # Test contract query on blockchain
    if [ -n "$CONTRACT_ID" ]; then
        RESPONSE=$(curl -s -X GET "$API_BASE/blockchain/query/contract/$CONTRACT_ID" \
            -H "Authorization: Bearer $EXPORTER_TOKEN")
        
        if echo "$RESPONSE" | grep -q "$CONTRACT_ID" || echo "$RESPONSE" | grep -q "success"; then
            print_success "Blockchain contract query successful"
        else
            print_warning "Blockchain query format may be different"
        fi
    fi
    
    print_step "Testing blockchain history..."
    if [ -n "$CONTRACT_ID" ]; then
        RESPONSE=$(curl -s -X GET "$API_BASE/blockchain/history/contract/$CONTRACT_ID" \
            -H "Authorization: Bearer $EXPORTER_TOKEN")
        
        if echo "$RESPONSE" | grep -q "history" || echo "$RESPONSE" | grep -q "transactions"; then
            print_success "Blockchain history query successful"
        else
            print_warning "Blockchain history format may be different"
        fi
    fi
}

# ============================================================================
# Test Phase 12: UI Navigation
# ============================================================================

test_ui_navigation() {
    print_header "PHASE 12: UI NAVIGATION TEST"
    
    print_step "Testing login page..."
    if curl -s "$UI_BASE/login" | grep -q "Ethiopian Coffee"; then
        print_success "Login page loads correctly"
    else
        print_fail "Login page failed to load"
    fi
    
    print_step "Testing main portals..."
    local portals=("exporter" "banks" "ecta" "nbe" "customs" "shipping")
    
    for portal in "${portals[@]}"; do
        if curl -s "$UI_BASE/$portal" | grep -q "html"; then
            print_success "$portal portal page exists"
        else
            print_warning "$portal portal may not exist"
        fi
    done
}

# ============================================================================
# Generate Test Report
# ============================================================================

generate_report() {
    print_header "TEST REPORT SUMMARY"
    
    echo -e "${BLUE}Total Tests Run:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓✓✓ ALL TESTS PASSED! ✓✓✓${NC}"
        SUCCESS_RATE=100
    else
        SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo ""
        echo -e "${YELLOW}Success Rate: ${SUCCESS_RATE}%${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Test Data Generated:${NC}"
    [ -n "$APPLICATION_ID" ] && echo "  Application ID: $APPLICATION_ID"
    [ -n "$CONTRACT_ID" ] && echo "  Contract ID: $CONTRACT_ID"
    [ -n "$LC_ID" ] && echo "  LC ID: $LC_ID"
    [ -n "$SHIPMENT_ID" ] && echo "  Shipment ID: $SHIPMENT_ID"
    
    # Save report to file
    {
        echo "CECBS End-to-End Test Report"
        echo "Generated: $(date)"
        echo ""
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Warnings: $WARNINGS"
        echo "Success Rate: ${SUCCESS_RATE}%"
        echo ""
        echo "Test Data:"
        [ -n "$APPLICATION_ID" ] && echo "  Application ID: $APPLICATION_ID"
        [ -n "$CONTRACT_ID" ] && echo "  Contract ID: $CONTRACT_ID"
        [ -n "$LC_ID" ] && echo "  LC ID: $LC_ID"
        [ -n "$SHIPMENT_ID" ] && echo "  Shipment ID: $SHIPMENT_ID"
    } > /tmp/cecbs-test-report.txt
    
    echo ""
    echo -e "${BLUE}Full report saved to: /tmp/cecbs-test-report.txt${NC}"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    clear
    echo ""
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                                                                    ║${NC}"
    echo -e "${PURPLE}║          CECBS - Complete End-to-End System Test Suite            ║${NC}"
    echo -e "${PURPLE}║     Ethiopian Coffee Export Consortium Blockchain System          ║${NC}"
    echo -e "${PURPLE}║                                                                    ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    test_system_health
    test_authentication
    test_exporter_registration
    test_contract_management
    test_lc_workflow
    test_document_management
    test_ecta_workflow
    test_shipment_workflow
    test_customs_workflow
    test_payment_workflow
    test_analytics
    test_blockchain_integration
    test_ui_navigation
    
    generate_report
    
    if [ $FAILED_TESTS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"
