#!/bin/bash

################################################################################
# COMPLETE END-TO-END WORKFLOW TEST
# Tests the entire export process from application to delivery:
# 1. Exporter registration & approval
# 2. Contract registration with document upload
# 3. Document signing by multiple parties
# 4. Quality inspection scheduling and approval
# 5. Export permit issuance
# 6. LC opening by bank
# 7. Shipment booking
# 8. Customs declaration and clearance
# 9. Bill of Lading generation
# 10. Certificate of Origin issuance
# 11. Phytosanitary certificate
# 12. Payment and forex management
# 13. Shipment tracking and delivery
# 14. Audit trail verification
################################################################################

set -e

API_URL="${API_URL:-http://localhost:3001/api/v1}"
OUTPUT_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$OUTPUT_DIR/e2e_workflow_${TIMESTAMP}.log"

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
echo "COMPLETE END-TO-END WORKFLOW TEST" | tee -a "$LOG_FILE"
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

# Upload document function
upload_document() {
    local file_path=$1
    local token=$2
    local entity_type=$3
    local entity_id=$4
    local doc_type=$5
    
    curl -s -X POST "$API_URL/documents/upload" \
        -H "Authorization: Bearer $token" \
        -F "file=@$file_path" \
        -F "entityType=$entity_type" \
        -F "entityId=$entity_id" \
        -F "documentType=$doc_type"
}

################################################################################
log_section "PHASE 1: EXPORTER REGISTRATION"

log_test "Login as ECTA admin"
ECTA_TOKEN=$(login_user "ecta_admin" "password123" "ECTA Admin" 3>&1 1>&2 2>&3)
if [ -n "$ECTA_TOKEN" ]; then
    log_pass "ECTA admin logged in"
else
    log_fail "Failed to login as ECTA admin"
    exit 1
fi

log_test "Submit exporter application"
APP_EMAIL="e2e.test.$(date +%s)@coffeeexport.et"
APP_DATA="{
    \"companyName\": \"Premium Coffee Exporters Ltd\",
    \"tinNumber\": \"TIN$(date +%s)\",
    \"businessLicenseNumber\": \"BL$(date +%s)\",
    \"email\": \"$APP_EMAIL\",
    \"phone\": \"+251911234567\",
    \"address\": \"Bole Road, Addis Ababa\",
    \"city\": \"Addis Ababa\",
    \"region\": \"Addis Ababa\",
    \"contactPerson\": \"John Smith\",
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
    log_pass "Exporter approved with license: $LICENSE_NUM"
else
    log_fail "Failed to approve exporter"
    ERROR_MSG=$(echo "$APPROVE_RESPONSE" | jq -r '.error.message // "Unknown error"')
    log_info "Error: $ERROR_MSG"
    exit 1
fi

################################################################################
log_section "PHASE 2: CONTRACT REGISTRATION & DOCUMENTS"

log_test "Register export contract (with all required fields)"
CONTRACT_ID="CNT-$(date +%s)"
BUYER_ID="BUYER-$(date +%s)"
CONTRACT_DATA="{
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"buyerName\": \"International Coffee Importers Inc\",
    \"buyerCountry\": \"USA\",
    \"buyerBank\": \"Chase Bank New York\",
    \"exporterBank\": \"Commercial Bank of Ethiopia\",
    \"coffeeType\": \"Arabica\",
    \"quantity\": 50000,
    \"pricePerKg\": 5.50,
    \"currency\": \"USD\",
    \"paymentMethod\": \"LC\",
    \"eudrRequired\": true
}"

CONTRACT_RESPONSE=$(api_call POST "/contracts" "$ECTA_TOKEN" "$CONTRACT_DATA")
RESPONSE_CONTRACT_ID=$(echo "$CONTRACT_RESPONSE" | jq -r '.data.contractID // .data.contract_id // .contractID // empty')

if [ -n "$RESPONSE_CONTRACT_ID" ]; then
    log_pass "Contract registered: $CONTRACT_ID"
else
    log_fail "Failed to register contract"
    ERROR_MSG=$(echo "$CONTRACT_RESPONSE" | jq -r '.error.message // "Unknown error"')
    log_info "Error: $ERROR_MSG"
    log_info "Response: $CONTRACT_RESPONSE"
    exit 1
fi

log_test "Approve contract (ECTA)"
APPROVE_CONTRACT_RESPONSE=$(api_call POST "/contracts/$CONTRACT_ID/approve" "$ECTA_TOKEN" "")
APPROVE_CONTRACT_SUCCESS=$(echo "$APPROVE_CONTRACT_RESPONSE" | jq -r '.success // empty')

if [ "$APPROVE_CONTRACT_SUCCESS" = "true" ]; then
    log_pass "Contract approved by ECTA"
else
    log_fail "Failed to approve contract"
    log_info "Response: $APPROVE_CONTRACT_RESPONSE"
fi

log_test "Upload contract document (PDF)"
# Create a dummy PDF file for testing
echo "%PDF-1.4 Test Contract Document" > /tmp/test_contract.pdf
DOC_UPLOAD_RESPONSE=$(upload_document "/tmp/test_contract.pdf" "$ECTA_TOKEN" "CONTRACT" "$CONTRACT_ID" "SALES_CONTRACT")
DOC_ID=$(echo "$DOC_UPLOAD_RESPONSE" | jq -r '.data.documentId // .data.documentID // .data.document_id // empty')

if [ -n "$DOC_ID" ]; then
    log_pass "Contract document uploaded: $DOC_ID"
else
    log_fail "Failed to upload contract document"
    log_info "Response: $DOC_UPLOAD_RESPONSE"
fi

log_test "Sign contract document (ECTA - APPROVE type)"
SIGN_DATA="{
    \"signatureType\": \"APPROVE\",
    \"remarks\": \"Contract verified and approved by ECTA\"
}"
SIGN_RESPONSE=$(api_call POST "/documents/$DOC_ID/sign" "$ECTA_TOKEN" "$SIGN_DATA")
SIGNATURE_SUCCESS=$(echo "$SIGN_RESPONSE" | jq -r '.success // empty')

if [ "$SIGNATURE_SUCCESS" = "true" ]; then
    log_pass "Document signed by ECTA"
else
    log_fail "Failed to sign document"
    log_info "Response: $SIGN_RESPONSE"
fi

################################################################################
log_section "PHASE 3: QUALITY INSPECTION"

# Create shipment first (required for inspection)
log_test "Create shipment for quality inspection"
SHIPMENT_ID="SHIP-$(date +%s)"
SHIPMENT_CREATE_DATA="{
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

SHIPMENT_CREATE_RESPONSE=$(api_call POST "/shipments" "$ECTA_TOKEN" "$SHIPMENT_CREATE_DATA")
CREATED_SHIPMENT_ID=$(echo "$SHIPMENT_CREATE_RESPONSE" | jq -r '.data.shipmentID // .data.shipment_id // empty')

if [ -n "$CREATED_SHIPMENT_ID" ]; then
    log_pass "Shipment created for inspection: $SHIPMENT_ID"
else
    log_fail "Failed to create shipment"
    log_info "Response: $SHIPMENT_CREATE_RESPONSE"
fi

log_test "Request quality inspection (with all required fields)"
INSPECTION_ID="INS-$(date +%s)"
INSPECTION_DATA="{
    \"inspectionID\": \"$INSPECTION_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"coffeeType\": \"Arabica\",
    \"quantity\": 50000
}"

INSPECTION_RESPONSE=$(api_call POST "/quality/inspections" "$ECTA_TOKEN" "$INSPECTION_DATA")
CREATED_INSPECTION_ID=$(echo "$INSPECTION_RESPONSE" | jq -r '.data.inspectionID // .data.inspection_id // empty')

if [ -n "$CREATED_INSPECTION_ID" ]; then
    # Use the actual inspection ID returned (might be auto-created by shipment)
    INSPECTION_ID="$CREATED_INSPECTION_ID"
    log_pass "Inspection requested: $INSPECTION_ID"
else
    log_fail "Failed to request inspection"
    log_info "Response: $INSPECTION_RESPONSE"
fi

log_test "Perform inspection"
PERFORM_RESPONSE=$(api_call POST "/quality/inspections/$INSPECTION_ID/perform" "$ECTA_TOKEN" "")
PERFORM_SUCCESS=$(echo "$PERFORM_RESPONSE" | jq -r '.success // empty')

if [ "$PERFORM_SUCCESS" = "true" ]; then
    log_pass "Inspection performed"
else
    log_fail "Failed to perform inspection"
    log_info "Response: $PERFORM_RESPONSE"
fi

log_test "Complete inspection (with required fields)"
COMPLETE_DATA="{
    \"grade\": \"GRADE_1\",
    \"passed\": true
}"

COMPLETE_RESPONSE=$(api_call POST "/quality/inspections/$INSPECTION_ID/complete" "$ECTA_TOKEN" "$COMPLETE_DATA")
COMPLETE_SUCCESS=$(echo "$COMPLETE_RESPONSE" | jq -r '.success // empty')

if [ "$COMPLETE_SUCCESS" = "true" ]; then
    log_pass "Inspection completed"
else
    log_fail "Failed to complete inspection"
    log_info "Response: $COMPLETE_RESPONSE"
fi

log_test "Approve inspection (ECTA)"
APPROVE_RESPONSE=$(api_call POST "/quality/inspections/$INSPECTION_ID/approve" "$ECTA_TOKEN" "")
APPROVE_SUCCESS=$(echo "$APPROVE_RESPONSE" | jq -r '.success // empty')

if [ "$APPROVE_SUCCESS" = "true" ]; then
    log_pass "Inspection approved"
else
    log_fail "Failed to approve inspection"
    log_info "Response: $APPROVE_RESPONSE"
fi

################################################################################
log_section "PHASE 4: EXPORT PERMIT"

# Export permits are issued by Banks, so we need to login as bank first
log_test "Login as Bank admin"
BANK_TOKEN=$(login_user "bank_admin" "password123" "Bank Admin" 3>&1 1>&2 2>&3)
if [ -n "$BANK_TOKEN" ]; then
    log_pass "Bank admin logged in"
else
    log_fail "Failed to login as bank admin"
fi

log_test "Apply for export permit"
PERMIT_DATA="{
    \"permitID\": \"PERMIT-$(date +%s)\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"quantity\": 50000,
    \"certificateID\": \"CERT-$(date +%s)\"
}"

PERMIT_RESPONSE=$(api_call POST "/permits/export" "$BANK_TOKEN" "$PERMIT_DATA")
PERMIT_ID=$(echo "$PERMIT_RESPONSE" | jq -r '.data.permit_id // .data.permitId // .data.permitID // empty')

if [ -n "$PERMIT_ID" ]; then
    log_pass "Export permit issued: $PERMIT_ID"
else
    log_fail "Failed to issue export permit"
    log_info "Response: $PERMIT_RESPONSE"
fi

################################################################################
log_section "PHASE 5: BANKING - LC REQUEST"

# Bank admin is already logged in from Phase 4

log_test "Request Letter of Credit (with all required fields - ECTA role)"
LC_ID="LC-$(date +%s)"
LC_DATA="{
    \"lcID\": \"$LC_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"bankName\": \"Commercial Bank of Ethiopia\",
    \"amount\": 225000,
    \"currency\": \"USD\",
    \"expiryDate\": \"2027-12-31T23:59:59Z\"
}"

# LC request requires EXPORTER or ECTA role
LC_RESPONSE=$(api_call POST "/banking/lc/request" "$ECTA_TOKEN" "$LC_DATA")
CREATED_LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // .data.lc_id // empty')

if [ -n "$CREATED_LC_ID" ]; then
    log_pass "LC requested: $LC_ID"
else
    log_fail "Failed to request LC"
    log_info "Response: $LC_RESPONSE"
fi

# Step 1: Approve LC first (REQUESTED → APPROVED)
log_test "Approve LC"
APPROVE_LC_RESPONSE=$(api_call POST "/banking/lc/$LC_ID/approve" "$BANK_TOKEN" "")
APPROVE_LC_SUCCESS=$(echo "$APPROVE_LC_RESPONSE" | jq -r '.success // empty')

if [ "$APPROVE_LC_SUCCESS" = "true" ]; then
    log_pass "LC approved"
else
    log_fail "Failed to approve LC"
    log_info "Response: $APPROVE_LC_RESPONSE"
fi

# Step 2: Issue LC (APPROVED → ISSUED)
log_test "Issue LC (Bank)"
ISSUE_DATA="{
    \"terms\": \"Payment at sight upon presentation of compliant documents\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 225000,
    \"currency\": \"USD\"
}"
ISSUE_RESPONSE=$(api_call POST "/banking/lc/$LC_ID/issue" "$BANK_TOKEN" "$ISSUE_DATA")
ISSUE_SUCCESS=$(echo "$ISSUE_RESPONSE" | jq -r '.success // empty')

if [ "$ISSUE_SUCCESS" = "true" ]; then
    log_pass "LC issued"
else
    log_fail "Failed to issue LC"
    log_info "Response: $ISSUE_RESPONSE"
fi

# Step 3: Examine documents (ISSUED → UTILIZED when compliant)
log_test "Examine LC documents (with required fields)"
EXAMINE_DATA="{\"compliant\": true}"
EXAMINE_RESPONSE=$(api_call POST "/banking/lc/$LC_ID/examine-documents" "$BANK_TOKEN" "$EXAMINE_DATA")
EXAMINE_SUCCESS=$(echo "$EXAMINE_RESPONSE" | jq -r '.success // empty')

if [ "$EXAMINE_SUCCESS" = "true" ]; then
    log_pass "LC documents examined"
else
    log_fail "Failed to examine LC documents"
    log_info "Response: $EXAMINE_RESPONSE"
fi

################################################################################
log_section "PHASE 6: SHIPMENT BOOKING"

log_test "Login as Shipping admin"
SHIPPING_TOKEN=$(login_user "shipping_admin" "password123" "Shipping Admin" 3>&1 1>&2 2>&3)
if [ -n "$SHIPPING_TOKEN" ]; then
    log_pass "Shipping admin logged in"
else
    log_fail "Failed to login as shipping admin"
fi

log_test "Create freight booking (with all required fields)"
BOOKING_ID="BOOK-$(date +%s)"
BOOKING_DATA="{
    \"bookingID\": \"$BOOKING_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"carrier\": \"Maersk Line\",
    \"vesselName\": \"MSC MEDITERRANEAN\",
    \"containerNumber\": \"CONT-$(date +%s)\"
}"

BOOKING_RESPONSE=$(api_call POST "/shipping/bookings" "$SHIPPING_TOKEN" "$BOOKING_DATA")
CREATED_BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.bookingID // .data.booking_id // empty')

if [ -n "$CREATED_BOOKING_ID" ]; then
    log_pass "Freight booking created: $BOOKING_ID"
else
    log_fail "Failed to create booking"
    log_info "Response: $BOOKING_RESPONSE"
fi

log_test "Record shipment departure"
DEPART_RESPONSE=$(api_call POST "/shipping/bookings/$BOOKING_ID/depart" "$SHIPPING_TOKEN" "")
DEPART_SUCCESS=$(echo "$DEPART_RESPONSE" | jq -r '.success // empty')

if [ "$DEPART_SUCCESS" = "true" ]; then
    log_pass "Shipment departure recorded"
else
    log_fail "Failed to record departure"
    log_info "Response: $DEPART_RESPONSE"
fi

################################################################################
log_section "PHASE 7: CUSTOMS CLEARANCE"

log_test "Login as Customs admin"
CUSTOMS_TOKEN=$(login_user "customs_admin" "password123" "Customs Admin" 3>&1 1>&2 2>&3)
if [ -n "$CUSTOMS_TOKEN" ]; then
    log_pass "Customs admin logged in"
else
    log_fail "Failed to login as customs admin"
fi

log_test "Submit customs declaration (with all required fields)"
DECLARATION_ID="DEC-$(date +%s)"
DECLARATION_DATA="{
    \"declarationID\": \"$DECLARATION_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"permitNumber\": \"PERMIT-$(date +%s)\"
}"

DECLARATION_RESPONSE=$(api_call POST "/customs/declaration/submit" "$CUSTOMS_TOKEN" "$DECLARATION_DATA")
CREATED_DECLARATION_ID=$(echo "$DECLARATION_RESPONSE" | jq -r '.data.declarationID // .data.declaration_id // empty')

if [ -n "$CREATED_DECLARATION_ID" ]; then
    log_pass "Customs declaration submitted: $DECLARATION_ID"
else
    log_fail "Failed to submit customs declaration"
    log_info "Response: $DECLARATION_RESPONSE"
fi

log_test "Review customs declaration"
REVIEW_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/review" "$CUSTOMS_TOKEN" "")
REVIEW_SUCCESS=$(echo "$REVIEW_RESPONSE" | jq -r '.success // empty')

if [ "$REVIEW_SUCCESS" = "true" ]; then
    log_pass "Declaration reviewed"
else
    log_fail "Failed to review declaration"
    log_info "Response: $REVIEW_RESPONSE"
fi

log_test "Inspect customs declaration"
INSPECT_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/inspect" "$CUSTOMS_TOKEN" "")
INSPECT_SUCCESS=$(echo "$INSPECT_RESPONSE" | jq -r '.success // empty')

if [ "$INSPECT_SUCCESS" = "true" ]; then
    log_pass "Declaration inspected"
else
    log_fail "Failed to inspect declaration"
    log_info "Response: $INSPECT_RESPONSE"
fi

log_test "Complete customs inspection"
COMPLETE_INSPECT_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/complete-inspection" "$CUSTOMS_TOKEN" "")
COMPLETE_INSPECT_SUCCESS=$(echo "$COMPLETE_INSPECT_RESPONSE" | jq -r '.success // empty')

if [ "$COMPLETE_INSPECT_SUCCESS" = "true" ]; then
    log_pass "Inspection completed"
else
    log_fail "Failed to complete inspection"
    log_info "Response: $COMPLETE_INSPECT_RESPONSE"
fi

log_test "Clear customs declaration"
CLEAR_RESPONSE=$(api_call POST "/customs/declaration/$DECLARATION_ID/clear" "$CUSTOMS_TOKEN" "")
CLEAR_SUCCESS=$(echo "$CLEAR_RESPONSE" | jq -r '.success // empty')

if [ "$CLEAR_SUCCESS" = "true" ]; then
    log_pass "Customs cleared"
else
    log_fail "Failed to clear customs"
    log_info "Response: $CLEAR_RESPONSE"
fi

################################################################################
log_section "PHASE 8: CERTIFICATES & DOCUMENTS"

log_test "Request Certificate of Origin (with all required fields)"
COO_ID="COO-$(date +%s)"
COO_DATA="{
    \"certificateID\": \"$COO_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"origin\": \"Ethiopia\"
}"

COO_RESPONSE=$(api_call POST "/certificates/coo/request" "$ECTA_TOKEN" "$COO_DATA")
CREATED_COO_ID=$(echo "$COO_RESPONSE" | jq -r '.data.certificateID // .data.certificate_id // empty')

if [ -n "$CREATED_COO_ID" ]; then
    log_pass "Certificate of Origin requested: $COO_ID"
else
    log_fail "Failed to request Certificate of Origin"
    log_info "Response: $COO_RESPONSE"
fi

log_test "Request Phytosanitary Certificate (with all required fields)"
PHYTO_ID="PHYTO-$(date +%s)"
PHYTO_DATA="{
    \"certificateID\": \"$PHYTO_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"quantity\": 50000
}"

PHYTO_RESPONSE=$(api_call POST "/phytosanitary/request" "$ECTA_TOKEN" "$PHYTO_DATA")
CREATED_PHYTO_ID=$(echo "$PHYTO_RESPONSE" | jq -r '.data.certificateID // .data.certificate_id // empty')

if [ -n "$CREATED_PHYTO_ID" ]; then
    log_pass "Phytosanitary certificate requested: $PHYTO_ID"
else
    log_fail "Failed to request Phytosanitary certificate"
    log_info "Response: $PHYTO_RESPONSE"
fi

log_test "Inspect phytosanitary certificate (with all required fields)"
PHYTO_INSPECT_DATA="{
    \"inspectorName\": \"Inspector Alemayehu\",
    \"inspectionDate\": \"2027-06-15T00:00:00Z\",
    \"pestsDetected\": false,
    \"diseaseDetected\": false
}"
PHYTO_INSPECT_RESPONSE=$(api_call POST "/phytosanitary/$PHYTO_ID/inspect" "$ECTA_TOKEN" "$PHYTO_INSPECT_DATA")
PHYTO_INSPECT_SUCCESS=$(echo "$PHYTO_INSPECT_RESPONSE" | jq -r '.success // empty')

if [ "$PHYTO_INSPECT_SUCCESS" = "true" ]; then
    log_pass "Phytosanitary inspection completed"
else
    log_fail "Failed to inspect phytosanitary"
    log_info "Response: $PHYTO_INSPECT_RESPONSE"
fi

log_test "Issue phytosanitary certificate (with all required fields)"
PHYTO_ISSUE_DATA="{
    \"certificateNumber\": \"PHYTO-CERT-$(date +%s)\",
    \"issuingAuthority\": \"Ethiopian Ministry of Agriculture\",
    \"validUntil\": \"2027-12-31T23:59:59Z\"
}"
PHYTO_ISSUE_RESPONSE=$(api_call POST "/phytosanitary/$PHYTO_ID/issue" "$ECTA_TOKEN" "$PHYTO_ISSUE_DATA")
PHYTO_ISSUE_SUCCESS=$(echo "$PHYTO_ISSUE_RESPONSE" | jq -r '.success // empty')

if [ "$PHYTO_ISSUE_SUCCESS" = "true" ]; then
    log_pass "Phytosanitary certificate issued"
else
    log_fail "Failed to issue phytosanitary certificate"
    log_info "Response: $PHYTO_ISSUE_RESPONSE"
fi

################################################################################
log_section "PHASE 9: PAYMENT RELEASE"

log_test "Release LC payment (with all required fields)"
PAYMENT_DATA="{
    \"amount\": 225000,
    \"currency\": \"USD\"
}"

PAYMENT_RESPONSE=$(api_call POST "/banking/lc/$LC_ID/release-payment" "$BANK_TOKEN" "$PAYMENT_DATA")
PAYMENT_SUCCESS=$(echo "$PAYMENT_RESPONSE" | jq -r '.success // empty')

if [ "$PAYMENT_SUCCESS" = "true" ]; then
    log_pass "LC payment released"
else
    log_fail "Failed to release payment"
    log_info "Response: $PAYMENT_RESPONSE"
fi

################################################################################
log_section "PHASE 10: SHIPMENT ARRIVAL"

log_test "Record shipment departure"
DEPART_RESPONSE=$(api_call POST "/shipping/bookings/$BOOKING_ID/depart" "$SHIPPING_TOKEN" "")
DEPART_SUCCESS=$(echo "$DEPART_RESPONSE" | jq -r '.success // empty')

if [ "$DEPART_SUCCESS" = "true" ]; then
    log_pass "Shipment departure recorded"
else
    log_fail "Failed to record departure"
    log_info "Response: $DEPART_RESPONSE"
fi

log_test "Record shipment arrival"
ARRIVE_RESPONSE=$(api_call POST "/shipping/bookings/$BOOKING_ID/arrive" "$SHIPPING_TOKEN" "")
ARRIVE_SUCCESS=$(echo "$ARRIVE_RESPONSE" | jq -r '.success // empty')

if [ "$ARRIVE_SUCCESS" = "true" ]; then
    log_pass "Shipment arrival recorded"
else
    log_fail "Failed to record arrival"
    log_info "Response: $ARRIVE_RESPONSE"
fi

################################################################################
log_section "PHASE 11: FOREX & REPATRIATION"

log_test "Login as NBE admin"
NBE_TOKEN=$(login_user "nbe_admin" "password123" "NBE Admin" 3>&1 1>&2 2>&3)
if [ -n "$NBE_TOKEN" ]; then
    log_pass "NBE admin logged in"
else
    log_fail "Failed to login as NBE admin"
fi

log_test "Request forex allocation (with all required fields)"
FOREX_ID="FX-$(date +%s)"
FOREX_DATA="{
    \"forexID\": \"$FOREX_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 225000
}"

FOREX_RESPONSE=$(api_call POST "/forex" "$BANK_TOKEN" "$FOREX_DATA")
CREATED_FOREX_ID=$(echo "$FOREX_RESPONSE" | jq -r '.data.forexID // .data.forex_id // empty')

if [ -n "$CREATED_FOREX_ID" ]; then
    log_pass "Forex request submitted: $FOREX_ID"
else
    log_fail "Failed to submit forex request"
    log_info "Response: $FOREX_RESPONSE"
fi

log_test "NBE confirms forex request"
CONFIRM_RESPONSE=$(api_call POST "/forex/$FOREX_ID/confirm" "$NBE_TOKEN" "")
CONFIRM_SUCCESS=$(echo "$CONFIRM_RESPONSE" | jq -r '.success // empty')

if [ "$CONFIRM_SUCCESS" = "true" ]; then
    log_pass "Forex confirmed by NBE"
else
    log_fail "Failed to confirm forex"
    log_info "Response: $CONFIRM_RESPONSE"
fi

log_test "Allocate forex"
ALLOCATE_DATA="{\"lcId\": \"$LC_ID\"}"
ALLOCATE_RESPONSE=$(api_call POST "/forex/$FOREX_ID/allocate" "$BANK_TOKEN" "$ALLOCATE_DATA")
ALLOCATE_SUCCESS=$(echo "$ALLOCATE_RESPONSE" | jq -r '.success // empty')

if [ "$ALLOCATE_SUCCESS" = "true" ]; then
    log_pass "Forex allocated"
else
    log_fail "Failed to allocate forex"
    log_info "Response: $ALLOCATE_RESPONSE"
fi

log_test "Initiate repatriation tracking"
REPATRIATION_ID="REP-$FOREX_ID"
REPATRIATION_DATA="{
    \"repatriationAmount\": 225000,
    \"repatriationDate\": \"2027-08-10T00:00:00Z\",
    \"bankReference\": \"BANK-REF-001\",
    \"repatriationMethod\": \"SWIFT\"
}"

REPATRIATION_RESPONSE=$(api_call POST "/nbe/forex/$FOREX_ID/repatriation" "$NBE_TOKEN" "$REPATRIATION_DATA")
REPATRIATION_SUCCESS=$(echo "$REPATRIATION_RESPONSE" | jq -r '.success // empty')

if [ "$REPATRIATION_SUCCESS" = "true" ]; then
    log_pass "Repatriation tracking initiated and recorded: $REPATRIATION_ID"
else
    log_fail "Failed to initiate repatriation"
    log_info "Response: $REPATRIATION_RESPONSE"
fi

################################################################################
log_section "PHASE 12: CROSS-PORTAL VERIFICATION"

log_test "Verify contract visibility - ECTA Portal"
ECTA_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$ECTA_TOKEN")
if echo "$ECTA_CONTRACT" | jq -e '.data.contract_id // .data.contractId' > /dev/null 2>&1; then
    log_pass "Contract visible in ECTA portal"
else
    log_fail "Contract not visible in ECTA portal"
fi

log_test "Verify contract visibility - Customs Portal"
CUSTOMS_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$CUSTOMS_TOKEN")
if echo "$CUSTOMS_CONTRACT" | jq -e '.data.contract_id // .data.contractId' > /dev/null 2>&1; then
    log_pass "Contract visible in Customs portal"
else
    log_fail "Contract not visible in Customs portal"
fi

log_test "Verify contract visibility - Bank Portal"
BANK_CONTRACT=$(api_call GET "/contracts/$CONTRACT_ID" "$BANK_TOKEN")
if echo "$BANK_CONTRACT" | jq -e '.data.contract_id // .data.contractId' > /dev/null 2>&1; then
    log_pass "Contract visible in Bank portal"
else
    log_fail "Contract not visible in Bank portal"
fi

################################################################################
log_section "PHASE 13: AUDIT TRAIL VERIFICATION"

log_test "Retrieve complete audit trail"
AUDIT_TRAIL=$(api_call GET "/audit/trail?entityType=CONTRACT&entityId=$CONTRACT_ID" "$ECTA_TOKEN")
AUDIT_COUNT=$(echo "$AUDIT_TRAIL" | jq '.data | length // 0')

if [ "$AUDIT_COUNT" -gt 0 ]; then
    log_pass "Audit trail contains $AUDIT_COUNT entries"
else
    log_fail "No audit trail entries found"
    log_info "Response: $AUDIT_TRAIL"
fi

log_test "Verify blockchain transaction history"
BLOCKCHAIN_HISTORY=$(api_call GET "/blockchain/history/$CONTRACT_ID" "$ECTA_TOKEN")
if echo "$BLOCKCHAIN_HISTORY" | jq -e '.data' > /dev/null 2>&1; then
    log_pass "Blockchain history retrieved"
else
    log_fail "Failed to retrieve blockchain history"
    log_info "Response: $BLOCKCHAIN_HISTORY"
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
echo "Complete workflow artifacts created:" | tee -a "$LOG_FILE"
echo "  - Exporter: $EXPORTER_ID" | tee -a "$LOG_FILE"
echo "  - Contract: $CONTRACT_ID" | tee -a "$LOG_FILE"
echo "  - LC: $LC_ID" | tee -a "$LOG_FILE"
echo "  - Shipment: $SHIPMENT_ID" | tee -a "$LOG_FILE"
echo "  - Booking: $BOOKING_ID" | tee -a "$LOG_FILE"
echo "  - Inspection: $INSPECTION_ID" | tee -a "$LOG_FILE"
echo "  - Customs Declaration: $DECLARATION_ID" | tee -a "$LOG_FILE"
echo "  - Certificate of Origin: $COO_ID" | tee -a "$LOG_FILE"
echo "  - Phytosanitary Certificate: $PHYTO_ID" | tee -a "$LOG_FILE"
echo "  - Forex: $FOREX_ID" | tee -a "$LOG_FILE"
echo "  - Repatriation: $REPATRIATION_ID" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED - COMPLETE END-TO-END WORKFLOW SUCCESSFUL${NC}" | tee -a "$LOG_FILE"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED - Review log for details${NC}" | tee -a "$LOG_FILE"
    exit 1
fi
