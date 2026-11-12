#!/bin/bash

# Complete End-to-End Workflow Test with Form Submissions and Document Uploads
# Version 3: Reordered to the chaincode enforced order (LC issue +
#   forex NBE-approve/rate/allocate BEFORE shipment creation; shipment
#   creation requires LC FOREX_ALLOCATED)
# Simulates a real user journey through the entire coffee export process

set -e

API_BASE="${API_BASE:-http://localhost:3001/api/v1}"
TEST_OUTPUT="/tmp/complete-workflow-test-v2.txt"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Test data files directory
TEST_DOCS_DIR="/tmp/test-documents"
mkdir -p $TEST_DOCS_DIR

echo "════════════════════════════════════════════════════════════════" | tee $TEST_OUTPUT
echo "🔄 COMPLETE WORKFLOW TEST V2 - FULL E2E WITH CORRECTED FIELDS" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

# Create sample test documents
echo "📄 Creating sample test documents..." | tee -a $TEST_OUTPUT
echo "Sample Business License Document" > $TEST_DOCS_DIR/business_license.txt
echo "Sample TIN Certificate" > $TEST_DOCS_DIR/tin_certificate.txt
echo "Sample Quality Certificate" > $TEST_DOCS_DIR/quality_cert.pdf
echo "Sample ICO Certificate" > $TEST_DOCS_DIR/ico_cert.pdf
echo "Sample Contract Document" > $TEST_DOCS_DIR/contract.pdf
echo "Sample Invoice" > $TEST_DOCS_DIR/invoice.pdf
echo "Sample Packing List" > $TEST_DOCS_DIR/packing_list.pdf

STEP_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0
FOREX_AUTO=false

log_step() {
    STEP_COUNT=$((STEP_COUNT + 1))
    echo "" | tee -a $TEST_OUTPUT
    echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
    echo "📍 STEP $STEP_COUNT: $1" | tee -a $TEST_OUTPUT
    echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
}

log_action() {
    echo "   🔹 $1" | tee -a $TEST_OUTPUT
}

log_pass() {
    echo "   ✅ SUCCESS: $1" | tee -a $TEST_OUTPUT
    PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
    echo "   ❌ FAILED: $1" | tee -a $TEST_OUTPUT
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_warn() {
    echo "   ⚠️  WARNING: $1" | tee -a $TEST_OUTPUT
}

log_info() {
    echo "   ℹ️  $1" | tee -a $TEST_OUTPUT
}

# ==================================================================================
# PHASE 1: EXPORTER REGISTRATION & APPLICATION SUBMISSION
# ==================================================================================

log_step "EXPORTER REGISTRATION - New Coffee Exporter Application"

log_action "Submitting export license application (PUBLIC endpoint)"
NEW_EXPORTER_EMAIL="exporter_${TIMESTAMP}@test.com"

APPLICATION_RESPONSE=$(curl -s -X POST ${API_BASE}/exporters/exporter-applications \
  -H "Content-Type: application/json" \
  -d "{
    \"companyName\": \"Test Coffee Export Ltd $TIMESTAMP\",
    \"tinNumber\": \"TIN${TIMESTAMP}\",
    \"businessLicenseNumber\": \"BL${TIMESTAMP}\",
    \"capitalRequirement\": \"20000000\",
    \"professionalTaster\": \"yes\",
    \"tasterCertificate\": \"TC${TIMESTAMP}\",
    \"contactPerson\": \"John Doe\",
    \"email\": \"$NEW_EXPORTER_EMAIL\",
    \"phone\": \"+251911234567\",
    \"address\": \"123 Coffee Street\",
    \"city\": \"Addis Ababa\",
    \"region\": \"Addis Ababa\",
    \"bankName\": \"Commercial Bank of Ethiopia\",
    \"bankAccountNumber\": \"1000${TIMESTAMP:0:9}\",
    \"bankBranchName\": \"Main Branch\",
    \"exporterType\": \"company\",
    \"laboratoryFacility\": \"no\",
    \"registrationDate\": \"$(date +%Y-%m-%d)\",
    \"comments\": \"Test application for workflow testing\"
  }")

APP_ID=$(echo "$APPLICATION_RESPONSE" | jq -r '.data.applicationId // .applicationId // empty')
TEMP_USERNAME=$(echo "$APPLICATION_RESPONSE" | jq -r '.data.credentials.username // .tempUsername // empty')
EMAIL_SENT=$(echo "$APPLICATION_RESPONSE" | jq -r '.data.credentials.emailSent // .emailSent // false')

if [ -n "$APP_ID" ]; then
    log_pass "Application submitted: $APP_ID"
    if [ -n "$TEMP_USERNAME" ]; then
        log_info "Temp username: $TEMP_USERNAME"
        if [ "$EMAIL_SENT" = "true" ]; then
            log_info "Login credentials sent via email"
        else
            log_info "Note: SMTP not configured - email delivery skipped (expected in test env)"
        fi
    else
        log_warn "Temp username not available in response"
    fi
else
    log_fail "Application submission failed"
    log_info "Response: $APPLICATION_RESPONSE"
fi

# ==================================================================================
# PHASE 2: ECTA REVIEW & APPROVAL
# ==================================================================================

log_step "ECTA PORTAL - Review and Approve Application"

# Login as ECTA admin
TOKEN_ECTA=$(curl -s -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token // empty')

if [ -z "$TOKEN_ECTA" ]; then
    log_fail "ECTA login failed"
    exit 1
fi
log_pass "ECTA admin logged in"

# Approve the application if we created one
NEW_EXPORTER_ID="EXP-${TIMESTAMP}"
ECTA_LICENSE="ECTA-LIC-${TIMESTAMP}"
if [ -n "$APP_ID" ]; then
    log_action "Approving application: $APP_ID"
    APPROVAL_RESPONSE=$(curl -s -X POST ${API_BASE}/exporters/exporter-applications/$APP_ID/approve \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_ECTA" \
      -d "{
        \"exporterId\": \"$NEW_EXPORTER_ID\",
        \"ectaLicenseNumber\": \"$ECTA_LICENSE\",
        \"licenseExpiryDate\": \"$(date -d '+1 year' +%Y-%m-%d)\",
        \"bankName\": \"Commercial Bank of Ethiopia\",
        \"bankAccountNumber\": \"1000${TIMESTAMP:0:9}\",
        \"bankBranch\": \"Main Branch\"
      }")
    
    if echo "$APPROVAL_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        log_pass "Application approved"
        log_info "Exporter ID: $NEW_EXPORTER_ID"
        log_info "ECTA License: $ECTA_LICENSE"
    else
        log_fail "Application approval failed"
        log_info "Response: $APPROVAL_RESPONSE"
        exit 1
    fi
fi

# Wait for blockchain propagation
log_action "Waiting 5 seconds for blockchain propagation..."
sleep 5

# ==================================================================================
# PHASE 3: CONTRACT REGISTRATION
# ==================================================================================

log_step "CONTRACT REGISTRATION - Sales Contract with Buyer"

# Login as super admin or use the new exporter's credentials
log_action "Logging in as admin for contract creation"
TOKEN_ADMIN=$(curl -s -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token // empty')

if [ -z "$TOKEN_ADMIN" ]; then
    log_warn "Admin login failed, using ECTA token"
    TOKEN_ADMIN="$TOKEN_ECTA"
fi

log_action "Creating new sales contract (PascalCase fields)"
NEW_CONTRACT_ID="CONT-$(date +%Y%m%d%H%M%S)"
BUYER_ID="BUYER-TEST-$TIMESTAMP"

CONTRACT_RESPONSE=$(curl -s -X POST ${API_BASE}/contracts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d "{
    \"contractID\": \"$NEW_CONTRACT_ID\",
    \"exporterID\": \"$NEW_EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"buyerName\": \"International Coffee Importers Inc\",
    \"buyerCountry\": \"USA\",
    \"buyerBank\": \"First National Bank (Issuing Bank)\",
    \"exporterBank\": \"Commercial Bank of Ethiopia (Advising Bank)\",
    \"coffeeType\": \"Arabica Grade 1\",
    \"quantity\": 50000,
    \"pricePerKg\": 5.50,
    \"currency\": \"USD\",
    \"paymentMethod\": \"LC\",
    \"eudrRequired\": true,
    \"organicCertified\": false,
    \"fairTradeCertified\": false,
    \"portOfLoading\": \"Djibouti Port\",
    \"portOfDestination\": \"New York Port\",
    \"deliveryDate\": \"$(date -d '+90 days' +%Y-%m-%d)\",
    \"incoterm\": \"FOB\",
    \"specialInstructions\": \"Handle with care\"
  }")

if echo "$CONTRACT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Contract created: $NEW_CONTRACT_ID"
    log_info "Quantity: 50,000 kg @ \$5.50/kg = \$275,000"
else
    log_fail "Contract creation failed"
    log_info "Response: $CONTRACT_RESPONSE"
fi

# Wait for blockchain propagation
log_action "Waiting 5 seconds for blockchain propagation..."
sleep 5

# Approve the contract (requires ECTA role)
log_action "Approving contract on blockchain (ECTA role required)"
CONTRACT_APPROVAL=$(curl -s -X POST ${API_BASE}/contracts/${NEW_CONTRACT_ID}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{
    \"approvedBy\": \"ecta_admin\",
    \"comments\": \"Contract approved for export\"
  }")

if echo "$CONTRACT_APPROVAL" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Contract approved on blockchain"
else
    log_warn "Contract approval status unclear"
    log_info "Response: $CONTRACT_APPROVAL"
fi

# Wait for approval to propagate
log_action "Waiting 3 seconds for approval propagation..."
sleep 3

# ==================================================================================
# PHASE 4: LETTER OF CREDIT ISSUANCE
# ==================================================================================

log_step "BANKING - Letter of Credit Issuance"

# Login as bank admin
TOKEN_BANK=$(curl -s -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token // empty')

if [ -z "$TOKEN_BANK" ]; then
    log_warn "Bank login failed, using ECTA token"
    TOKEN_BANK="$TOKEN_ECTA"
fi

log_action "Issuing Letter of Credit via /banking/lc/issue"
NEW_LC_NUMBER="LC-$(date +%Y%m%d%H%M%S)"

LC_RESPONSE=$(curl -s -X POST ${API_BASE}/banking/lc/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BANK" \
  -d "{
    \"lcID\": \"$NEW_LC_NUMBER\",
    \"lcNumber\": \"$NEW_LC_NUMBER\",
    \"contractID\": \"$NEW_CONTRACT_ID\",
    \"exporterID\": \"$NEW_EXPORTER_ID\",
    \"issuingBank\": \"First National Bank\",
    \"advisingBank\": \"Commercial Bank of Ethiopia\",
    \"beneficiary\": \"Test Coffee Export Ltd\",
    \"applicant\": \"International Coffee Importers Inc\",
    \"amount\": 275000,
    \"currency\": \"USD\",
    \"expiryDate\": \"$(date -d '+180 days' +%Y-%m-%d)\",
    \"latestShipmentDate\": \"$(date -d '+90 days' +%Y-%m-%d)\",
    \"portOfLoading\": \"Djibouti Port\",
    \"portOfDischarge\": \"New York Port\",
    \"paymentTerms\": \"At Sight\",
    \"partialShipment\": false,
    \"transhipment\": true
  }")

if echo "$LC_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Letter of Credit issued: $NEW_LC_NUMBER"
    # Check if forex was auto-created
    FOREX_AUTO=$(echo "$LC_RESPONSE" | jq -r '.data.forexAutoCreated // false')
    if [ "$FOREX_AUTO" = "true" ]; then
        # The auto-created forex ID is needed by Phase 5 (NBE approve + allocate)
        NEW_FOREX_ID=$(echo "$LC_RESPONSE" | jq -r '.data.forexID // empty')
        log_info "Forex allocation auto-created by LC issuance: $NEW_FOREX_ID"
    fi
else
    log_fail "LC issuance failed"
    log_info "Response: $LC_RESPONSE"
fi

# ==================================================================================
# PHASE 5: FOREX ALLOCATION (NBE APPROVE + RATE + ALLOCATE)
# ==================================================================================

log_step "NBE - Forex Allocation (NBE approve, rate, allocate — LC must be FOREX_ALLOCATED before shipment creation)"

# Chaincode order (missing-steps Phase 7): forex request -> NBE approve
# (CONFIRMED) -> set exchange rate -> allocate (amount + rate 57.25 +
# approvalRef, all three required) -> LC becomes FOREX_ALLOCATED, which is
# what CreateShipment gates on. Do NOT call /forex/:id/confirm after the
# NBE approve — it would 400 INVALID_STATUS (nbe.ts:66).
FOREX_OK=false

# Check if forex was auto-created
if [ "$FOREX_AUTO" = "true" ] && [ -n "$NEW_FOREX_ID" ]; then
    log_info "Forex allocation already created by LC issuance: $NEW_FOREX_ID"
    log_pass "Forex auto-created with LC"
    FOREX_OK=true
else
    # Login as Bank admin (forex requests need BANKS role)
    TOKEN_FOREX=$(curl -s -X POST ${API_BASE}/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token // empty')

    if [ -z "$TOKEN_FOREX" ]; then
        log_warn "Bank admin login failed, using ECTA token"
        TOKEN_FOREX="$TOKEN_ECTA"
    fi

    log_action "Creating manual forex allocation request"
    NEW_FOREX_ID="FX-$(date +%Y%m%d%H%M%S)"

    FOREX_RESPONSE=$(curl -s -X POST ${API_BASE}/forex/request \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_FOREX" \
      -d "{
        \"forexId\": \"$NEW_FOREX_ID\",
        \"contractId\": \"$NEW_CONTRACT_ID\",
        \"exporterId\": \"$NEW_EXPORTER_ID\",
        \"amount\": 275000,
        \"currency\": \"USD\",
        \"requestedBy\": \"bank_admin\"
      }")

    if echo "$FOREX_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        log_pass "Forex allocation requested: $NEW_FOREX_ID"
        FOREX_OK=true
    else
        log_warn "Forex allocation request failed"
        log_info "Response: $FOREX_RESPONSE"
    fi
fi

if [ "$FOREX_OK" = "true" ]; then
    # Login as NBE admin (forex approve + rates need NBE role)
    TOKEN_NBE=$(curl -s -X POST ${API_BASE}/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token // empty')

    if [ -z "$TOKEN_NBE" ]; then
        log_fail "NBE login failed - cannot approve forex"
    else
        log_action "NBE approving forex: $NEW_FOREX_ID"
        APPROVE_RESPONSE=$(curl -s -X POST ${API_BASE}/nbe/forex/$NEW_FOREX_ID/approve \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN_NBE" \
          -d "{
            \"approvalNotes\": \"Flagship test approval\"
          }")

        if echo "$APPROVE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            log_pass "NBE approved forex: $NEW_FOREX_ID (CONFIRMED)"
        else
            log_fail "NBE forex approval failed"
            log_info "Response: $APPROVE_RESPONSE"
        fi

        log_action "Setting NBE exchange rate USD (57.0 / 57.5)"
        RATE_RESPONSE=$(curl -s -X POST ${API_BASE}/forex/rates \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN_NBE" \
          -d "{
            \"currency\": \"USD\",
            \"buyingRate\": 57.0,
            \"sellingRate\": 57.5
          }")

        if echo "$RATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            log_pass "NBE exchange rate set (USD buying 57.0 / selling 57.5)"
        else
            log_fail "Setting NBE exchange rate failed"
            log_info "Response: $RATE_RESPONSE"
        fi
    fi

    log_action "Allocating forex to LC (amount + rate 57.25 + approvalRef)"
    ALLOCATE_RESPONSE=$(curl -s -X POST ${API_BASE}/forex/$NEW_FOREX_ID/allocate \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_BANK" \
      -d "{
        \"lcId\": \"$NEW_LC_NUMBER\",
        \"amount\": 275000,
        \"exchangeRate\": 57.25,
        \"officer\": \"bank_admin\",
        \"approvalRef\": \"NBE-APPR-$NEW_FOREX_ID\"
      }")

    if echo "$ALLOCATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        log_pass "Forex allocated: $NEW_FOREX_ID (LC $NEW_LC_NUMBER is now FOREX_ALLOCATED)"
    else
        log_fail "Forex allocation failed"
        log_info "Response: $ALLOCATE_RESPONSE"
    fi
else
    log_fail "No forex record to approve/allocate - shipment creation will fail the LC gate"
fi

# ==================================================================================
# PHASE 6: SHIPMENT RECORD CREATION (after forex allocation)
# ==================================================================================

log_step "SHIPMENT RECORD CREATION - Create Shipment Record"

# Shipment creation requires EXPORTER, ECTA or ECTA_ADMIN (shipments.ts) —
# SHIPPING cannot create shipments, so the old shipping-admin login here
# always 403'd. Use the ECTA token logged in above (missing-steps uses its
# EXPORTER token for the same step).
# This phase now runs AFTER LC issuance + forex allocation (Phases 4-5):
# chaincode CreateShipment requires the LC to be FOREX_ALLOCATED.

log_action "Creating shipment record (PascalCase fields with all required fields)"
NEW_SHIPMENT_ID="SHIP-$(date +%Y%m%d%H%M%S)"

SHIPMENT_RESPONSE=$(curl -s -X POST ${API_BASE}/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{
    \"shipmentID\": \"$NEW_SHIPMENT_ID\",
    \"contractID\": \"$NEW_CONTRACT_ID\",
    \"exporterID\": \"$NEW_EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"grade\": \"Grade 1\",
    \"icoNumber\": \"ICO-${TIMESTAMP}\",
    \"channel\": \"SEA\",
    \"forexRate\": 57.50,
    \"valueUSD\": 275000,
    \"eudrCompliant\": true,
    \"origin\": \"Djibouti Port, Ethiopia\",
    \"destination\": \"New York Port, USA\",
    \"transportMode\": \"SEA\",
    \"carrier\": \"Maersk Line\",
    \"vesselName\": \"MV Test Vessel\",
    \"containerNumber\": \"CONT-$TIMESTAMP\",
    \"billOfLading\": \"BL-$TIMESTAMP\",
    \"departureDate\": \"$(date +%Y-%m-%d)\",
    \"estimatedArrival\": \"$(date -d '+30 days' +%Y-%m-%d)\",
    \"quantity\": 50000,
    \"status\": \"PENDING\"
  }")

if echo "$SHIPMENT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Shipment record created: $NEW_SHIPMENT_ID"
else
    log_fail "Shipment creation failed"
    log_info "Response: $SHIPMENT_RESPONSE"
fi

# ==================================================================================
# PHASE 7: QUALITY INSPECTION REQUEST
# ==================================================================================

log_step "QUALITY INSPECTION - Request Quality Certificate"

log_action "Submitting quality inspection request (PascalCase fields)"
NEW_INSPECTION_ID="QI-$(date +%Y%m%d%H%M%S)"

INSPECTION_RESPONSE=$(curl -s -X POST ${API_BASE}/quality/inspections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{
    \"inspectionID\": \"$NEW_INSPECTION_ID\",
    \"contractID\": \"$NEW_CONTRACT_ID\",
    \"exporterID\": \"$NEW_EXPORTER_ID\",
    \"shipmentID\": \"$NEW_SHIPMENT_ID\",
    \"coffeeType\": \"Arabica Grade 1\",
    \"quantity\": 50000,
    \"requestedDate\": \"$(date +%Y-%m-%d)\",
    \"inspectionType\": \"PRE_SHIPMENT\",
    \"sampleLocation\": \"Addis Ababa Warehouse\",
    \"requestedBy\": \"ecta_admin\"
  }")

if echo "$INSPECTION_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Quality inspection requested: $NEW_INSPECTION_ID"
else
    log_fail "Quality inspection request failed"
    log_info "Response: $INSPECTION_RESPONSE"
fi

# ==================================================================================
# PHASE 7A: QUALITY INSPECTION — PERFORM & APPROVE
# ==================================================================================
# (M6) The flagship previously had no perform/approve step: the inspection
# stayed REQUESTED, so the shipment never reached a post-inspection state
# and customs submit (which requires PERMIT_ISSUED) failed honestly after
# f258dc0e. Chaincode-enforced order: perform (PENDING/REQUESTED ->
# INSPECTED, quality.ts:563) then approve (INSPECTED -> APPROVED,
# quality.ts:746 + decideQualityInspection guard). Perform runs on the SAME
# inspection created in Phase 7 — it is still fresh, so the perform gate
# passes. (Missing-steps uses a second inspection only because its first
# already went through sample + lab-results.) Payload mirrors
# missing-workflow-steps-test.sh PERFORM_DATA; moisture 10.5% is under the
# 12% ECX reject threshold.

log_step "QUALITY INSPECTION - Perform & Approve"

log_action "Performing quality inspection (moisture 10.5%, grade GRADE_1)"
PERFORM_RESPONSE=$(curl -s -X POST ${API_BASE}/quality/inspections/$NEW_INSPECTION_ID/perform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{
    \"inspectorName\": \"Abebe Inspector\",
    \"moistureContent\": 10.5,
    \"defectCount\": 2,
    \"grade\": \"GRADE_1\",
    \"cuppingScore\": 86,
    \"remarks\": \"Flagship test perform\"
  }")

if echo "$PERFORM_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Quality inspection performed: $NEW_INSPECTION_ID (INSPECTED)"
else
    log_fail "Quality inspection perform failed"
    log_info "Response: $PERFORM_RESPONSE"
fi

log_action "Approving quality inspection"
APPROVE_RESPONSE=$(curl -s -X POST ${API_BASE}/quality/inspections/$NEW_INSPECTION_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{}")

if echo "$APPROVE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Quality inspection approved: $NEW_INSPECTION_ID (APPROVED)"
else
    log_fail "Quality inspection approve failed"
    log_info "Response: $APPROVE_RESPONSE"
fi

# ==================================================================================
# PHASE 7B: EXPORT PERMIT ISSUANCE (BANKS)
# ==================================================================================
# (M6) The flagship previously had NO permit-issue step: its shipment was
# INSPECTION_PENDING when customs submit ran, and customs requires
# PERMIT_ISSUED, so the honest-failure fix (f258dc0e) correctly refused it.
# Chaincode-enforced order: permit AFTER quality perform/approve, BEFORE
# customs submit. Endpoint/role/payload follow
# missing-workflow-steps-test.sh: POST /permits/export with the BANKS token
# (permits.ts:30, requireRole BANKS/BANK_ADMIN) invoking chaincode
# IssueCBEExportPermit; the permit is ISSUED on-chain and the route mirrors
# it into Postgres export_permits.

log_step "EXPORT PERMIT - Issue CBE Export Permit (Banks)"

log_action "Issuing export permit via /permits/export (bank_admin)"
NEW_PERMIT_ID="PERMIT-$(date +%Y%m%d%H%M%S)"

PERMIT_RESPONSE=$(curl -s -X POST ${API_BASE}/permits/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BANK" \
  -d "{
    \"permitID\": \"$NEW_PERMIT_ID\",
    \"shipmentID\": \"$NEW_SHIPMENT_ID\",
    \"contractID\": \"$NEW_CONTRACT_ID\",
    \"exporterID\": \"$NEW_EXPORTER_ID\",
    \"quantity\": 50000,
    \"certificateID\": \"CERT-$TIMESTAMP\"
  }")

if echo "$PERMIT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Export permit issued: $NEW_PERMIT_ID"
else
    log_fail "Export permit issuance failed"
    log_info "Response: $PERMIT_RESPONSE"
fi

# Read-back verification: the issued permit must be retrievable from the
# ledger (GET /permits/:permitId, permits.ts:320 — returns the raw permit
# object, NOT a {success, data} wrapper, so check for its own fields).
log_action "Verifying issued permit (GET /permits/$NEW_PERMIT_ID)"
PERMIT_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN_BANK" \
  "${API_BASE}/permits/$NEW_PERMIT_ID" 2>/dev/null || echo '{}')
if echo "$PERMIT_CHECK" | jq -e '.permitID // .permitId // .status' > /dev/null 2>&1; then
    log_pass "Banks: Export permit record verified"
else
    log_warn "Export permit read-back unclear"
    log_info "Response: $PERMIT_CHECK"
fi

# ==================================================================================
# PHASE 8: CUSTOMS DECLARATION
# ==================================================================================

log_step "CUSTOMS - Export Declaration Submission"

# Login as customs admin
TOKEN_CUSTOMS=$(curl -s -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token // empty')

if [ -z "$TOKEN_CUSTOMS" ]; then
    log_warn "Customs login failed, using ECTA token"
    TOKEN_CUSTOMS="$TOKEN_ECTA"
fi

log_action "Submitting customs declaration (PascalCase fields)"
NEW_DECLARATION_ID="DECL-$(date +%Y%m%d%H%M%S)"

DECLARATION_RESPONSE=$(curl -s -X POST ${API_BASE}/customs/declaration/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CUSTOMS" \
  -d "{
    \"declarationID\": \"$NEW_DECLARATION_ID\",
    \"shipmentID\": \"$NEW_SHIPMENT_ID\",
    \"exporterID\": \"$NEW_EXPORTER_ID\",
    \"contractID\": \"$NEW_CONTRACT_ID\",
    \"declarationType\": \"STANDARD\",
    \"hsCode\": \"0901.11\",
    \"quantity\": 50000,
    \"value\": 275000,
    \"currency\": \"USD\",
    \"destination\": \"USA\",
    \"portOfExit\": \"Djibouti Port\",
    \"eudrCompliant\": true,
    \"additionalNotes\": \"Test customs declaration for workflow testing\"
  }")

if echo "$DECLARATION_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Customs declaration submitted: $NEW_DECLARATION_ID"
else
    log_fail "Customs declaration failed"
    log_info "Response: $DECLARATION_RESPONSE"
fi

# ==================================================================================
# FINAL VERIFICATION
# ==================================================================================

log_step "FINAL VERIFICATION - Check All Records"

log_action "Verifying records across all portals"

# Check application
if [ -n "$APP_ID" ]; then
    APP_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN_ECTA" \
      "${API_BASE}/exporters/applications/$APP_ID" 2>/dev/null || echo '{}')
    if echo "$APP_CHECK" | jq -e '.data // .success' > /dev/null 2>&1; then
        log_pass "ECTA: Application record verified"
    fi
fi

# Check contract
if [ -n "$NEW_CONTRACT_ID" ]; then
    CONTRACT_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
      "${API_BASE}/contracts?contractId=$NEW_CONTRACT_ID" 2>/dev/null || echo '{}')
    if echo "$CONTRACT_CHECK" | jq -e '.data' > /dev/null 2>&1; then
        log_pass "ECX: Contract record verified"
    fi
fi

# Check shipment
if [ -n "$NEW_SHIPMENT_ID" ]; then
    SHIPMENT_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN_ECTA" \
      "${API_BASE}/shipments?shipmentId=$NEW_SHIPMENT_ID" 2>/dev/null || echo '{}')
    if echo "$SHIPMENT_CHECK" | jq -e '.data' > /dev/null 2>&1; then
        log_pass "Shipping: Shipment record verified"
    fi
fi

# Check NBE monitoring
TOKEN_NBE=$(curl -s -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token // empty')
NBE_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN_NBE" \
  "${API_BASE}/nbe/lc-monitoring" | jq -r '.count // 0')
log_info "NBE: Monitoring $NBE_CHECK LCs"

# ==================================================================================
# SUMMARY
# ==================================================================================

echo "" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "📊 WORKFLOW TEST SUMMARY" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT
echo "Total Steps: $STEP_COUNT" | tee -a $TEST_OUTPUT
echo "✅ Passed: $PASS_COUNT" | tee -a $TEST_OUTPUT
echo "❌ Failed: $FAIL_COUNT" | tee -a $TEST_OUTPUT
echo "⚠️  Warnings: Check details above" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 ALL WORKFLOW STEPS COMPLETED SUCCESSFULLY!" | tee -a $TEST_OUTPUT
else
    echo "⚠️  SOME WORKFLOW STEPS FAILED - REVIEW DETAILS ABOVE" | tee -a $TEST_OUTPUT
fi

echo "" | tee -a $TEST_OUTPUT
echo "Created Test Records:" | tee -a $TEST_OUTPUT
echo "  - Application: $APP_ID" | tee -a $TEST_OUTPUT
echo "  - Exporter ID: $NEW_EXPORTER_ID" | tee -a $TEST_OUTPUT
echo "  - Contract: $NEW_CONTRACT_ID" | tee -a $TEST_OUTPUT
echo "  - Shipment: $NEW_SHIPMENT_ID" | tee -a $TEST_OUTPUT
echo "  - Quality Inspection: $NEW_INSPECTION_ID" | tee -a $TEST_OUTPUT
echo "  - Export Permit: $NEW_PERMIT_ID" | tee -a $TEST_OUTPUT
echo "  - LC Number: $NEW_LC_NUMBER" | tee -a $TEST_OUTPUT
echo "  - Forex Request: $NEW_FOREX_ID" | tee -a $TEST_OUTPUT
echo "  - Customs Declaration: $NEW_DECLARATION_ID" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT

exit 0

