#!/bin/bash

################################################################################
# WORKING WORKFLOWS TEST
# Tests only the validated, working workflows:
# 1. Exporter registration & approval ✓
# 2. Contract registration & approval ✓
# 3. Document upload & signing ✓
# 4. Quality inspection (request, perform, complete, approve) ✓
# 5. Shipment creation ✓
# 6. Freight booking ✓
# 7. Customs declaration & clearance ✓
# 8. Phytosanitary certificate ✓
# 9. Cross-portal verification ✓
################################################################################

set -e

API_URL="${API_URL:-http://localhost:3001/api/v1}"
OUTPUT_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$OUTPUT_DIR/working_workflows_${TIMESTAMP}.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

mkdir -p "$OUTPUT_DIR"

echo "==================================" | tee -a "$LOG_FILE"
echo "WORKING WORKFLOWS TEST" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "==================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Helper functions
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

log_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Login function
login_user() {
    local username=$1
    local password=$2
    local role=$3
    
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
        | jq -r '.data.token // empty')
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "$TOKEN" >&3
        return 0
    else
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

################################################################################
log_section "WORKFLOW 1: EXPORTER REGISTRATION"

log_test "Login as ECTA admin"
ECTA_TOKEN=$(login_user "ecta_admin" "password123" "ECTA Admin" 3>&1 1>&2 2>&3)
if [ -n "$ECTA_TOKEN" ]; then
    log_pass "ECTA admin logged in"
else
    log_fail "Failed to login as ECTA admin"
    exit 1
fi

log_test "Submit exporter application"
APP_EMAIL="test.$(date +%s)@coffeeexport.et"
APP_DATA="{
    \"companyName\": \"Test Coffee Exporters Ltd\",
    \"tinNumber\": \"TIN$(date +%s)\",
    \"businessLicenseNumber\": \"BL$(date +%s)\",
    \"email\": \"$APP_EMAIL\",
    \"phone\": \"+251911234567\",
    \"address\": \"Addis Ababa\",
    \"city\": \"Addis Ababa\",
    \"region\": \"Addis Ababa\",
    \"contactPerson\": \"Test User\",
    \"capitalRequirement\": \"20000000\",
    \"professionalTaster\": \"yes\",
    \"tasterCertificate\": \"TC$(date +%s)\",
    \"exporterType\": \"company\"
}"

APP_RESPONSE=$(api_call POST "/exporters/exporter-applications" "$ECTA_TOKEN" "$APP_DATA")
APPLICATION_ID=$(echo "$APP_RESPONSE" | jq -r '.data.applicationId // empty')

if [ -n "$APPLICATION_ID" ]; then
    log_pass "Application submitted: $APPLICATION_ID"
else
    log_fail "Failed to submit application"
    exit 1
fi

log_test "Approve exporter application"
EXPORTER_ID="EXP-$(date +%s)"
LICENSE_NUM="ECTA-$(date +%s)"
EXPIRY_DATE="2027-12-31"
APPROVE_DATA="{
    \"exporterId\": \"$EXPORTER_ID\",
    \"ectaLicenseNumber\": \"$LICENSE_NUM\",
    \"licenseExpiryDate\": \"$EXPIRY_DATE\"
}"

APPROVE_RESPONSE=$(api_call POST "/exporters/exporter-applications/$APPLICATION_ID/approve" "$ECTA_TOKEN" "$APPROVE_DATA")
APPROVAL_STATUS=$(echo "$APPROVE_RESPONSE" | jq -r '.data.status // empty')

if [ "$APPROVAL_STATUS" = "approved" ]; then
    log_pass "Exporter approved: $EXPORTER_ID"
else
    log_fail "Failed to approve exporter"
    exit 1
fi

################################################################################
log_section "WORKFLOW 2: CONTRACT REGISTRATION"

log_test "Register export contract"
CONTRACT_ID="CNT-$(date +%s)"
BUYER_ID="BUYER-$(date +%s)"
CONTRACT_DATA="{
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"buyerName\": \"Test Buyer Inc\",
    \"buyerCountry\": \"USA\",
    \"buyerBank\": \"Test Bank\",
    \"exporterBank\": \"Commercial Bank of Ethiopia\",
    \"coffeeType\": \"Arabica\",
    \"quantity\": 50000,
    \"pricePerKg\": 5.50,
    \"currency\": \"USD\",
    \"paymentMethod\": \"LC\",
    \"eudrRequired\": true
}"

CONTRACT_RESPONSE=$(api_call POST "/contracts" "$ECTA_TOKEN" "$CONTRACT_DATA")
if echo "$CONTRACT_RESPONSE" | jq -e '.data.contractID // .data.contract_id' > /dev/null 2>&1; then
    log_pass "Contract registered: $CONTRACT_ID"
else
    log_fail "Failed to register contract"
    exit 1
fi

log_test "Approve contract"
APPROVE_CONTRACT_RESPONSE=$(api_call POST "/contracts/$CONTRACT_ID/approve" "$ECTA_TOKEN" "")
if echo "$APPROVE_CONTRACT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Contract approved"
else
    log_fail "Failed to approve contract"
fi

################################################################################
log_section "WORKFLOW 3: DOCUMENT MANAGEMENT"

log_test "Upload contract document"
echo "%PDF-1.4 Test Document" > /tmp/test_doc.pdf
curl -s -X POST "$API_URL/documents/upload" \
    -H "Authorization: Bearer $ECTA_TOKEN" \
    -F "file=@/tmp/test_doc.pdf" \
    -F "entityType=CONTRACT" \
    -F "entityId=$CONTRACT_ID" \
    -F "documentType=SALES_CONTRACT" > /tmp/doc_response.json

DOC_ID=$(cat /tmp/doc_response.json | jq -r '.data.documentId // .data.documentID // .data.document_id // empty')

if [ -n "$DOC_ID" ]; then
    log_pass "Document uploaded: $DOC_ID"
else
    log_fail "Failed to upload document"
fi

log_test "Sign document (APPROVE type)"
SIGN_DATA="{\"signatureType\": \"APPROVE\", \"remarks\": \"Approved by ECTA\"}"
SIGN_RESPONSE=$(api_call POST "/documents/$DOC_ID/sign" "$ECTA_TOKEN" "$SIGN_DATA")
if echo "$SIGN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Document signed"
else
    log_fail "Failed to sign document"
fi

################################################################################
log_section "WORKFLOW 4: QUALITY INSPECTION"

log_test "Create shipment"
SHIPMENT_ID="SHIP-$(date +%s)"
SHIPMENT_DATA="{
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"origin\": \"ADDIS_ABABA\",
    \"quantity\": 50000,
    \"grade\": \"GRADE_1\",
    \"icoNumber\": \"ICO-$(date +%s)\",
    \"channel\": \"ECX\",
    \"ecxLotNumber\": \"ECX-$(date +%s)\",
    \"forexRate\": 55.50,
    \"valueUSD\": 275000,
    \"eudrCompliant\": true
}"

SHIPMENT_RESPONSE=$(api_call POST "/shipments" "$ECTA_TOKEN" "$SHIPMENT_DATA")
if echo "$SHIPMENT_RESPONSE" | jq -e '.data.shipmentID // .data.shipment_id' > /dev/null 2>&1; then
    log_pass "Shipment created: $SHIPMENT_ID"
else
    log_fail "Failed to create shipment"
    log_info "Response: $SHIPMENT_RESPONSE"
fi

log_test "Request quality inspection"
INSPECTION_ID="INS-$(date +%s)"
INSPECTION_DATA="{
    \"inspectionID\": \"$INSPECTION_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"coffeeType\": \"Arabica\",
    \"quantity\": 50000
}"

INSPECTION_RESPONSE=$(api_call POST "/quality/inspections" "$ECTA_TOKEN" "$INSPECTION_DATA")
if echo "$INSPECTION_RESPONSE" | jq -e '.data.inspectionID // .data.inspection_id' > /dev/null 2>&1; then
    log_pass "Inspection requested: $INSPECTION_ID"
else
    log_fail "Failed to request inspection"
fi

log_test "Perform inspection"
PERFORM_RESPONSE=$(api_call POST "/quality/inspections/$INSPECTION_ID/perform" "$ECTA_TOKEN" "")
if echo "$PERFORM_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Inspection performed"
else
    log_fail "Failed to perform inspection"
fi

log_test "Complete inspection"
COMPLETE_DATA="{\"grade\": \"GRADE_1\", \"passed\": true}"
COMPLETE_RESPONSE=$(api_call POST "/quality/inspections/$INSPECTION_ID/complete" "$ECTA_TOKEN" "$COMPLETE_DATA")
if echo "$COMPLETE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Inspection completed"
else
    log_fail "Failed to complete inspection"
fi

log_test "Approve inspection"
APPROVE_RESPONSE=$(api_call POST "/quality/inspections/$INSPECTION_ID/approve" "$ECTA_TOKEN" "")
if echo "$APPROVE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Inspection approved"
else
    log_fail "Failed to approve inspection (may require INSPECTED status)"
fi

################################################################################
log_section "WORKFLOW 5: SHIPPING BOOKING"

log_test "Login as Shipping admin"
SHIPPING_TOKEN=$(login_user "shipping_admin" "password123" "Shipping Admin" 3>&1 1>&2 2>&3)
if [ -n "$SHIPPING_TOKEN" ]; then
    log_pass "Shipping admin logged in"
else
    log_fail "Failed to login as shipping admin"
fi

log_test "Create freight booking"
BOOKING_ID="BOOK-$(date +%s)"
BOOKING_DATA="{
    \"bookingID\": \"$BOOKING_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"carrier\": \"Maersk Line\",
    \"vesselName\": \"MSC Mediterranean\",
    \"containerNumber\": \"CONT-$(date +%s)\"
}"

BOOKING_RESPONSE=$(api_call POST "/shipping/bookings" "$SHIPPING_TOKEN" "$BOOKING_DATA")
if echo "$BOOKING_RESPONSE" | jq -e '.data.bookingID // .data.booking_id' > /dev/null 2>&1; then
    log_pass "Freight booking created: $BOOKING_ID"
else
    log_fail "Failed to create booking"
fi

################################################################################
log_section "WORKFLOW 6: CUSTOMS CLEARANCE"

log_test "Login as Customs admin"
CUSTOMS_TOKEN=$(login_user "customs_admin" "password123" "Customs Admin" 3>&1 1>&2 2>&3)
if [ -n "$CUSTOMS_TOKEN" ]; then
    log_pass "Customs admin logged in"
else
    log_fail "Failed to login as customs admin"
fi

log_test "Submit customs declaration"
DECLARATION_ID="DEC-$(date +%s)"
DECLARATION_DATA="{
    \"declarationID\": \"$DECLARATION_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"permitNumber\": \"PERMIT-$(date +%s)\"
}"

DECLARATION_RESPONSE=$(api_call POST "/customs/declaration/submit" "$CUSTOMS_TOKEN" "$DECLARATION_DATA")
if echo "$DECLARATION_RESPONSE" | jq -e '.data.declarationID // .data.declaration_id' > /dev/null 2>&1; then
    log_pass "Customs declaration submitted: $DECLARATION_ID"
else
    log_fail "Failed to submit declaration"
fi

log_test "Review declaration"
REVIEW_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/review" "$CUSTOMS_TOKEN" "")
if echo "$REVIEW_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Declaration reviewed"
else
    log_fail "Failed to review declaration"
fi

log_test "Inspect declaration"
INSPECT_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/inspect" "$CUSTOMS_TOKEN" "")
if echo "$INSPECT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Declaration inspected"
else
    log_fail "Failed to inspect declaration"
fi

log_test "Complete inspection"
COMPLETE_INSPECT=$(api_call POST "/customs/declaration/$DECLARATION_ID/complete-inspection" "$CUSTOMS_TOKEN" "")
if echo "$COMPLETE_INSPECT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Inspection completed"
else
    log_fail "Failed to complete inspection"
fi

log_test "Clear customs"
CLEAR_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/clear" "$CUSTOMS_TOKEN" "")
if echo "$CLEAR_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Customs cleared"
else
    log_fail "Failed to clear customs"
fi

################################################################################
log_section "WORKFLOW 7: PHYTOSANITARY CERTIFICATE"

log_test "Request phytosanitary certificate"
PHYTO_ID="PHYTO-$(date +%s)"
PHYTO_DATA="{
    \"certificateID\": \"$PHYTO_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\"
}"

PHYTO_RESPONSE=$(api_call POST "/phytosanitary/request" "$ECTA_TOKEN" "$PHYTO_DATA")
if echo "$PHYTO_RESPONSE" | jq -e '.data.certificateID // .data.certificate_id' > /dev/null 2>&1; then
    log_pass "Phytosanitary certificate requested: $PHYTO_ID"
else
    log_fail "Failed to request certificate"
fi

log_test "Inspect phytosanitary"
PHYTO_INSPECT_DATA="{
    \"inspectorName\": \"Inspector Test\",
    \"inspectionDate\": \"2027-06-15T00:00:00Z\",
    \"pestsDetected\": false,
    \"diseaseDetected\": false
}"
PHYTO_INSPECT=$(api_call POST "/phytosanitary/$PHYTO_ID/inspect" "$ECTA_TOKEN" "$PHYTO_INSPECT_DATA")
if echo "$PHYTO_INSPECT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Phytosanitary inspected"
else
    log_fail "Failed to inspect phytosanitary"
fi

log_test "Issue phytosanitary certificate"
PHYTO_ISSUE_DATA="{
    \"certificateNumber\": \"PHYTO-CERT-$(date +%s)\",
    \"issuingAuthority\": \"Ethiopian Ministry of Agriculture\",
    \"validUntil\": \"2027-12-31T23:59:59Z\"
}"
PHYTO_ISSUE=$(api_call POST "/phytosanitary/$PHYTO_ID/issue" "$ECTA_TOKEN" "$PHYTO_ISSUE_DATA")
if echo "$PHYTO_ISSUE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Phytosanitary certificate issued"
else
    log_fail "Failed to issue certificate"
fi

################################################################################
log_section "WORKFLOW 8: CROSS-PORTAL VERIFICATION"

log_test "Login as Bank admin"
BANK_TOKEN=$(login_user "bank_admin" "password123" "Bank Admin" 3>&1 1>&2 2>&3)
if [ -n "$BANK_TOKEN" ]; then
    log_pass "Bank admin logged in"
else
    log_fail "Failed to login as bank admin"
fi

log_test "Verify contract in ECTA portal"
ECTA_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$ECTA_TOKEN")
if echo "$ECTA_CONTRACT" | jq -e '.data.contractID // .data.contract_id' > /dev/null 2>&1; then
    log_pass "Contract visible in ECTA portal"
else
    log_fail "Contract not visible in ECTA portal"
fi

log_test "Verify contract in Customs portal"
CUSTOMS_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$CUSTOMS_TOKEN")
if echo "$CUSTOMS_CONTRACT" | jq -e '.data.contractID // .data.contract_id' > /dev/null 2>&1; then
    log_pass "Contract visible in Customs portal"
else
    log_fail "Contract not visible in Customs portal"
fi

log_test "Verify contract in Bank portal"
BANK_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$BANK_TOKEN")
if echo "$BANK_CONTRACT" | jq -e '.data.contractID // .data.contract_id' > /dev/null 2>&1; then
    log_pass "Contract visible in Bank portal"
else
    log_fail "Contract not visible in Bank portal"
fi

log_test "Verify contract in Shipping portal"
SHIPPING_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$SHIPPING_TOKEN")
if echo "$SHIPPING_CONTRACT" | jq -e '.data.contractID // .data.contract_id' > /dev/null 2>&1; then
    log_pass "Contract visible in Shipping portal"
else
    log_fail "Contract not visible in Shipping portal"
fi

################################################################################
echo "" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "TEST SUMMARY" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Total Tests: $TOTAL_TESTS" | tee -a "$LOG_FILE"
echo "Passed: $PASSED_TESTS ✓" | tee -a "$LOG_FILE"
echo "Failed: $FAILED_TESTS ✗" | tee -a "$LOG_FILE"
SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", $PASSED_TESTS * 100 / $TOTAL_TESTS}")
echo "Success Rate: $SUCCESS_RATE%" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Workflow artifacts created:" | tee -a "$LOG_FILE"
echo "  - Exporter: $EXPORTER_ID" | tee -a "$LOG_FILE"
echo "  - Contract: $CONTRACT_ID" | tee -a "$LOG_FILE"
echo "  - Shipment: $SHIPMENT_ID" | tee -a "$LOG_FILE"
echo "  - Inspection: $INSPECTION_ID" | tee -a "$LOG_FILE"
echo "  - Booking: $BOOKING_ID" | tee -a "$LOG_FILE"
echo "  - Customs Declaration: $DECLARATION_ID" | tee -a "$LOG_FILE"
echo "  - Phytosanitary Certificate: $PHYTO_ID" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL WORKING WORKFLOWS PASSED${NC}" | tee -a "$LOG_FILE"
    exit 0
else
    echo -e "${YELLOW}⚠ $FAILED_TESTS TESTS FAILED - Review log for details${NC}" | tee -a "$LOG_FILE"
    exit 1
fi
