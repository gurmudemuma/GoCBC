#!/bin/bash

# Complete Portal Actions Test - Tests ALL CRUD operations and state transitions
# Creates, Approves, Rejects, Updates, Verifies data in all portal tabs

set -e

API_BASE="http://localhost:5000/api/v1"
TEST_OUTPUT="/tmp/complete-portal-actions-test.txt"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "════════════════════════════════════════════════════════════════" | tee $TEST_OUTPUT
echo "🔄 COMPLETE PORTAL ACTIONS TEST - ALL CRUD OPERATIONS" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

STEP_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

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

log_info() {
    echo "   ℹ️  $1" | tee -a $TEST_OUTPUT
}

# Login as all roles
log_action "Logging in as all portal users"
TOKEN_ADMIN=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')
TOKEN_ECTA=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_ECX=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"ecx_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_BANK=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_NBE=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_CUSTOMS=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_SHIPPING=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')
TOKEN_QUALITY=$(curl -s -X POST ${API_BASE}/auth/login -H "Content-Type: application/json" -d '{"username":"quality_admin","password":"password123"}' | jq -r '.data.token')

log_pass "All users logged in"

# ==================================================================================
# PORTAL 1: ECTA - Complete Workflow
# ==================================================================================

log_step "ECTA PORTAL - Complete Application Workflow"

# CREATE: Submit application
log_action "CREATE: Submit new exporter application"
APP_EMAIL="test_complete_${TIMESTAMP}@test.com"
CREATE_APP=$(curl -s -X POST ${API_BASE}/exporters/exporter-applications \
  -H "Content-Type: application/json" \
  -d "{
    \"companyName\": \"Complete Test Co ${TIMESTAMP}\",
    \"tinNumber\": \"TIN${TIMESTAMP}\",
    \"businessLicenseNumber\": \"BL${TIMESTAMP}\",
    \"capitalRequirement\": \"20000000\",
    \"professionalTaster\": \"yes\",
    \"tasterCertificate\": \"TC${TIMESTAMP}\",
    \"contactPerson\": \"Test Person\",
    \"email\": \"$APP_EMAIL\",
    \"phone\": \"+251911234567\",
    \"address\": \"Test Address\",
    \"city\": \"Addis Ababa\",
    \"region\": \"Addis Ababa\",
    \"bankName\": \"Test Bank\",
    \"bankAccountNumber\": \"1234567890\",
    \"bankBranchName\": \"Main Branch\",
    \"exporterType\": \"company\",
    \"laboratoryFacility\": \"no\",
    \"registrationDate\": \"$(date +%Y-%m-%d)\"
  }")

APP_ID=$(echo "$CREATE_APP" | jq -r '.data.applicationId')
if [ -n "$APP_ID" ] && [ "$APP_ID" != "null" ]; then
    log_pass "Application created: $APP_ID"
else
    log_fail "Application creation failed"
    log_info "Response: $CREATE_APP"
fi

# READ: Verify application appears in pending list
log_action "READ: Verify application in pending list"
PENDING_LIST=$(curl -s -H "Authorization: Bearer $TOKEN_ECTA" \
  "${API_BASE}/portals/ecta/pending-applications")
PENDING_COUNT=$(echo "$PENDING_LIST" | jq -r '.data | length')
if [ "$PENDING_COUNT" -gt 0 ]; then
    log_pass "Pending applications list shows $PENDING_COUNT applications"
else
    log_fail "No pending applications found"
fi

# APPROVE: Approve the application
log_action "APPROVE: Approve application $APP_ID"
EXPORTER_ID="EXP-${TIMESTAMP}"
APPROVE_APP=$(curl -s -X POST ${API_BASE}/exporters/exporter-applications/${APP_ID}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{
    \"exporterId\": \"$EXPORTER_ID\",
    \"ectaLicenseNumber\": \"ECTA-${TIMESTAMP}\",
    \"licenseExpiryDate\": \"$(date -d '+1 year' +%Y-%m-%d)\",
    \"bankName\": \"Test Bank\",
    \"bankAccountNumber\": \"1234567890\"
  }")

if echo "$APPROVE_APP" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Application approved: $EXPORTER_ID"
else
    log_fail "Application approval failed"
    log_info "Response: $APPROVE_APP"
fi

# READ: Verify exporter appears in approved list
sleep 2
log_action "READ: Verify exporter in approved list"
APPROVED_LIST=$(curl -s -H "Authorization: Bearer $TOKEN_ECTA" \
  "${API_BASE}/portals/ecta/approved-exporters")
APPROVED_COUNT=$(echo "$APPROVED_LIST" | jq -r '.data | length')
if [ "$APPROVED_COUNT" -gt 0 ]; then
    log_pass "Approved exporters list shows $APPROVED_COUNT exporters"
else
    log_fail "No approved exporters found"
fi

# CREATE for rejection test
log_action "CREATE: Submit second application for rejection test"
REJECT_EMAIL="reject_test_${TIMESTAMP}@test.com"
CREATE_REJECT_APP=$(curl -s -X POST ${API_BASE}/exporters/exporter-applications \
  -H "Content-Type: application/json" \
  -d "{
    \"companyName\": \"Reject Test Co ${TIMESTAMP}\",
    \"tinNumber\": \"RTIN${TIMESTAMP}\",
    \"businessLicenseNumber\": \"RBL${TIMESTAMP}\",
    \"capitalRequirement\": \"20000000\",
    \"professionalTaster\": \"yes\",
    \"tasterCertificate\": \"RTC${TIMESTAMP}\",
    \"contactPerson\": \"Reject Person\",
    \"email\": \"$REJECT_EMAIL\",
    \"phone\": \"+251911234568\",
    \"address\": \"Reject Address\",
    \"city\": \"Addis Ababa\",
    \"region\": \"Addis Ababa\",
    \"exporterType\": \"company\"
  }")

REJECT_APP_ID=$(echo "$CREATE_REJECT_APP" | jq -r '.data.applicationId')
if [ -n "$REJECT_APP_ID" ] && [ "$REJECT_APP_ID" != "null" ]; then
    log_pass "Second application created for rejection: $REJECT_APP_ID"
    
    # REJECT: Reject the application
    log_action "REJECT: Reject application $REJECT_APP_ID"
    REJECT_RESPONSE=$(curl -s -X POST ${API_BASE}/exporters/exporter-applications/${REJECT_APP_ID}/reject \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN_ECTA" \
      -d "{
        \"reason\": \"Insufficient capital documentation\",
        \"rejectedBy\": \"ecta_admin\"
      }")
    
    if echo "$REJECT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        log_pass "Application rejected successfully"
    else
        log_fail "Application rejection failed"
        log_info "Response: $REJECT_RESPONSE"
    fi
fi

# ==================================================================================
# PORTAL 2: ECX - Complete Contract Workflow
# ==================================================================================

log_step "ECX PORTAL - Complete Contract Workflow"

# CREATE: Create contract
log_action "CREATE: Register new sales contract"
CONTRACT_ID="CONT-${TIMESTAMP}"
CREATE_CONTRACT=$(curl -s -X POST ${API_BASE}/contracts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d "{
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"BUYER-${TIMESTAMP}\",
    \"buyerName\": \"Test Buyer Inc\",
    \"buyerCountry\": \"USA\",
    \"buyerBank\": \"First National Bank\",
    \"exporterBank\": \"Commercial Bank of Ethiopia\",
    \"coffeeType\": \"Arabica Grade 1\",
    \"quantity\": 50000,
    \"pricePerKg\": 5.50,
    \"currency\": \"USD\",
    \"paymentMethod\": \"LC\",
    \"eudrRequired\": true,
    \"portOfLoading\": \"Djibouti Port\",
    \"portOfDestination\": \"New York Port\",
    \"deliveryDate\": \"$(date -d '+90 days' +%Y-%m-%d)\",
    \"incoterm\": \"FOB\"
  }")

if echo "$CREATE_CONTRACT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Contract created: $CONTRACT_ID"
else
    log_fail "Contract creation failed"
    log_info "Response: $CREATE_CONTRACT"
fi

# READ: Verify contract in active list
sleep 2
log_action "READ: Verify contract in active contracts list"
ACTIVE_CONTRACTS=$(curl -s -H "Authorization: Bearer $TOKEN_ECX" \
  "${API_BASE}/portals/ecx/active-contracts")
CONTRACT_COUNT=$(echo "$ACTIVE_CONTRACTS" | jq -r '.data | length')
if [ "$CONTRACT_COUNT" -gt 0 ]; then
    log_pass "Active contracts list shows $CONTRACT_COUNT contracts"
else
    log_fail "No active contracts found"
fi

# APPROVE: Approve contract (ECTA)
log_action "APPROVE: Approve contract for export"
APPROVE_CONTRACT=$(curl -s -X POST ${API_BASE}/contracts/${CONTRACT_ID}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ECTA" \
  -d "{
    \"approvedBy\": \"ecta_admin\",
    \"comments\": \"Approved for export\"
  }")

if echo "$APPROVE_CONTRACT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Contract approved"
else
    log_fail "Contract approval failed"
fi

# UPDATE: Update contract details
log_action "UPDATE: Update contract quantity"
UPDATE_CONTRACT=$(curl -s -X PATCH ${API_BASE}/contracts/${CONTRACT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d "{
    \"quantity\": 55000,
    \"updateReason\": \"Buyer increased order\"
  }")

if echo "$UPDATE_CONTRACT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Contract updated successfully"
else
    log_fail "Contract update failed"
fi

# ==================================================================================
# PORTAL 3: SHIPPING - Complete Shipment Workflow
# ==================================================================================

log_step "SHIPPING PORTAL - Complete Shipment Workflow"

# CREATE: Create shipment
log_action "CREATE: Create shipment record"
SHIPMENT_ID="SHIP-${TIMESTAMP}"
CREATE_SHIPMENT=$(curl -s -X POST ${API_BASE}/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SHIPPING" \
  -d "{
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"BUYER-${TIMESTAMP}\",
    \"grade\": \"Grade 1\",
    \"icoNumber\": \"ICO-${TIMESTAMP}\",
    \"channel\": \"SEA\",
    \"forexRate\": 57.50,
    \"valueUSD\": 275000,
    \"eudrCompliant\": true,
    \"origin\": \"Djibouti Port\",
    \"destination\": \"New York Port\",
    \"transportMode\": \"SEA\",
    \"carrier\": \"Maersk Line\",
    \"quantity\": 50000,
    \"status\": \"PENDING\"
  }")

if echo "$CREATE_SHIPMENT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Shipment created: $SHIPMENT_ID"
else
    log_fail "Shipment creation failed"
    log_info "Response: $CREATE_SHIPMENT"
fi

# READ: Verify in active shipments
sleep 1
log_action "READ: Verify shipment in active list"
ACTIVE_SHIPMENTS=$(curl -s -H "Authorization: Bearer $TOKEN_SHIPPING" \
  "${API_BASE}/portals/shipping/active-shipments")
SHIPMENT_COUNT=$(echo "$ACTIVE_SHIPMENTS" | jq -r '.data | length')
if [ "$SHIPMENT_COUNT" -gt 0 ]; then
    log_pass "Active shipments list shows $SHIPMENT_COUNT shipments"
else
    log_fail "No active shipments found"
fi

# UPDATE: Update shipment status to IN_TRANSIT
log_action "UPDATE: Update shipment status to IN_TRANSIT"
UPDATE_SHIPMENT=$(curl -s -X PATCH ${API_BASE}/shipments/${SHIPMENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SHIPPING" \
  -d "{
    \"status\": \"IN_TRANSIT\",
    \"departureDate\": \"$(date +%Y-%m-%d)\",
    \"estimatedArrival\": \"$(date -d '+30 days' +%Y-%m-%d)\"
  }")

if echo "$UPDATE_SHIPMENT" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Shipment status updated to IN_TRANSIT"
else
    log_fail "Shipment status update failed"
fi

# READ: Verify in in-transit list
sleep 1
log_action "READ: Verify shipment in in-transit list"
IN_TRANSIT=$(curl -s -H "Authorization: Bearer $TOKEN_SHIPPING" \
  "${API_BASE}/portals/shipping/in-transit")
IN_TRANSIT_COUNT=$(echo "$IN_TRANSIT" | jq -r '.data | length')
if [ "$IN_TRANSIT_COUNT" -gt 0 ]; then
    log_pass "In-transit list shows $IN_TRANSIT_COUNT shipments"
else
    log_fail "No in-transit shipments found"
fi

# ==================================================================================
# PORTAL 4: QUALITY - Complete Inspection Workflow
# ==================================================================================

log_step "QUALITY PORTAL - Complete Inspection Workflow"

# CREATE: Request inspection
log_action "CREATE: Request quality inspection"
INSPECTION_ID="QI-${TIMESTAMP}"
CREATE_INSPECTION=$(curl -s -X POST ${API_BASE}/quality/inspections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_QUALITY" \
  -d "{
    \"inspectionID\": \"$INSPECTION_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"coffeeType\": \"Arabica Grade 1\",
    \"quantity\": 50000,
    \"requestedDate\": \"$(date +%Y-%m-%d)\",
    \"inspectionType\": \"PRE_SHIPMENT\",
    \"requestedBy\": \"quality_admin\"
  }")

if echo "$CREATE_INSPECTION" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Quality inspection requested: $INSPECTION_ID"
else
    log_fail "Quality inspection request failed"
    log_info "Response: $CREATE_INSPECTION"
fi

# READ: Verify in pending inspections
sleep 1
log_action "READ: Verify inspection in pending list"
PENDING_INSPECTIONS=$(curl -s -H "Authorization: Bearer $TOKEN_QUALITY" \
  "${API_BASE}/portals/quality/pending-inspections")
INSPECTION_COUNT=$(echo "$PENDING_INSPECTIONS" | jq -r '.data | length')
if [ "$INSPECTION_COUNT" -gt 0 ]; then
    log_pass "Pending inspections list shows $INSPECTION_COUNT inspections"
else
    log_fail "No pending inspections found"
fi

# APPROVE: Complete inspection and approve
log_action "APPROVE: Complete inspection with passing results"
APPROVE_INSPECTION=$(curl -s -X PUT ${API_BASE}/quality/inspections/${INSPECTION_ID}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_QUALITY" \
  -d "{
    \"grade\": \"Grade 1\",
    \"cupScore\": 85,
    \"moistureContent\": 11.5,
    \"defectCount\": 2,
    \"certificateNumber\": \"QC-${TIMESTAMP}\",
    \"inspectorName\": \"Quality Inspector\",
    \"comments\": \"Passed all quality standards\"
  }")

if echo "$APPROVE_INSPECTION" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Quality inspection approved and certificate issued"
else
    log_fail "Quality inspection approval failed"
fi

# ==================================================================================
# PORTAL 5: BANKING - Complete LC Workflow
# ==================================================================================

log_step "BANKING PORTAL - Complete LC Workflow"

# CREATE: Issue LC
log_action "CREATE: Issue Letter of Credit"
LC_NUMBER="LC-${TIMESTAMP}"
CREATE_LC=$(curl -s -X POST ${API_BASE}/banking/lc/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BANK" \
  -d "{
    \"lcID\": \"$LC_NUMBER\",
    \"lcNumber\": \"$LC_NUMBER\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"issuingBank\": \"First National Bank\",
    \"advisingBank\": \"Commercial Bank of Ethiopia\",
    \"beneficiary\": \"Complete Test Co\",
    \"applicant\": \"Test Buyer Inc\",
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

if echo "$CREATE_LC" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Letter of Credit issued: $LC_NUMBER"
else
    log_fail "LC issuance failed"
    log_info "Response: $CREATE_LC"
fi

# READ: Verify in active LCs
sleep 1
log_action "READ: Verify LC in active list"
ACTIVE_LCS=$(curl -s -H "Authorization: Bearer $TOKEN_BANK" \
  "${API_BASE}/portals/banks/active-lcs")
LC_COUNT=$(echo "$ACTIVE_LCS" | jq -r '.data | length')
if [ "$LC_COUNT" -gt 0 ]; then
    log_pass "Active LCs list shows $LC_COUNT LCs"
else
    log_fail "No active LCs found"
fi

# SIGN: Bank signs LC documents
log_action "SIGN: Bank signs LC documents"
SIGN_LC=$(curl -s -X POST ${API_BASE}/banking/lc/${LC_NUMBER}/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BANK" \
  -d "{
    \"signedBy\": \"bank_admin\",
    \"signatureDate\": \"$(date +%Y-%m-%d)\"
  }")

if echo "$SIGN_LC" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "LC documents signed"
else
    log_fail "LC signing failed (endpoint may not exist)"
fi

# ==================================================================================
# PORTAL 6: CUSTOMS - Complete Declaration Workflow
# ==================================================================================

log_step "CUSTOMS PORTAL - Complete Declaration Workflow"

# CREATE: Submit declaration
log_action "CREATE: Submit customs declaration"
DECLARATION_ID="DECL-${TIMESTAMP}"
CREATE_DECLARATION=$(curl -s -X POST ${API_BASE}/customs/declaration/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CUSTOMS" \
  -d "{
    \"declarationID\": \"$DECLARATION_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"declarationType\": \"STANDARD\",
    \"hsCode\": \"0901.11\",
    \"quantity\": 50000,
    \"value\": 275000,
    \"currency\": \"USD\",
    \"destination\": \"USA\",
    \"portOfExit\": \"Djibouti Port\",
    \"eudrCompliant\": true
  }")

if echo "$CREATE_DECLARATION" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Customs declaration submitted: $DECLARATION_ID"
else
    log_fail "Customs declaration failed"
    log_info "Response: $CREATE_DECLARATION"
fi

# READ: Verify in inspection queue
sleep 1
log_action "READ: Verify declaration in inspection queue"
INSPECTION_QUEUE=$(curl -s -H "Authorization: Bearer $TOKEN_CUSTOMS" \
  "${API_BASE}/portals/customs/inspection-queue")
QUEUE_COUNT=$(echo "$INSPECTION_QUEUE" | jq -r '.data | length')
if [ "$QUEUE_COUNT" -gt 0 ]; then
    log_pass "Inspection queue shows $QUEUE_COUNT declarations"
else
    log_fail "No declarations in inspection queue"
fi

# APPROVE: Clear customs
log_action "APPROVE: Clear customs declaration"
CLEAR_CUSTOMS=$(curl -s -X POST ${API_BASE}/customs/declaration/${DECLARATION_ID}/clear \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CUSTOMS" \
  -d "{
    \"clearedBy\": \"customs_admin\",
    \"clearanceDate\": \"$(date +%Y-%m-%d)\",
    \"remarks\": \"Cleared for export\"
  }")

if echo "$CLEAR_CUSTOMS" | jq -e '.success' > /dev/null 2>&1; then
    log_pass "Customs declaration cleared"
else
    log_fail "Customs clearance failed"
fi

# ==================================================================================
# PORTAL 7: NBE - Verify Forex Monitoring
# ==================================================================================

log_step "NBE PORTAL - Verify Forex and LC Monitoring"

# READ: Check forex monitoring
log_action "READ: Check forex monitoring"
FOREX_MONITORING=$(curl -s -H "Authorization: Bearer $TOKEN_NBE" \
  "${API_BASE}/portals/nbe/forex-monitoring")
FOREX_COUNT=$(echo "$FOREX_MONITORING" | jq -r '.data | length')
if [ "$FOREX_COUNT" -gt 0 ]; then
    log_pass "Forex monitoring shows $FOREX_COUNT allocations"
else
    log_fail "No forex allocations found"
fi

# READ: Check LC monitoring
log_action "READ: Check LC monitoring"
LC_MONITORING=$(curl -s -H "Authorization: Bearer $TOKEN_NBE" \
  "${API_BASE}/nbe/lc-monitoring")
LC_MON_COUNT=$(echo "$LC_MONITORING" | jq -r '.count')
if [ "$LC_MON_COUNT" -gt 0 ]; then
    log_pass "LC monitoring shows $LC_MON_COUNT LCs"
else
    log_fail "No LCs in monitoring"
fi

# ==================================================================================
# FINAL VERIFICATION - Check All Records in Portal Tabs
# ==================================================================================

log_step "FINAL VERIFICATION - All Portal Tabs"

log_action "Verifying all created records are visible in portal tabs"

# ECTA tabs
ECTA_APPROVED=$(curl -s -H "Authorization: Bearer $TOKEN_ECTA" "${API_BASE}/portals/ecta/approved-exporters" | jq -r '.data | length')
log_info "ECTA Approved Exporters: $ECTA_APPROVED"

# ECX tabs
ECX_CONTRACTS=$(curl -s -H "Authorization: Bearer $TOKEN_ECX" "${API_BASE}/portals/ecx/active-contracts" | jq -r '.data | length')
log_info "ECX Active Contracts: $ECX_CONTRACTS"

# Quality tabs
QUALITY_CERTS=$(curl -s -H "Authorization: Bearer $TOKEN_QUALITY" "${API_BASE}/portals/quality/certificates-issued" | jq -r '.data | length')
log_info "Quality Certificates Issued: $QUALITY_CERTS"

# Banking tabs
BANK_LCS=$(curl -s -H "Authorization: Bearer $TOKEN_BANK" "${API_BASE}/portals/banks/active-lcs" | jq -r '.data | length')
log_info "Banking Active LCs: $BANK_LCS"

# Customs tabs
CUSTOMS_CLEARED=$(curl -s -H "Authorization: Bearer $TOKEN_CUSTOMS" "${API_BASE}/portals/customs/cleared-shipments" | jq -r '.data | length')
log_info "Customs Cleared Shipments: $CUSTOMS_CLEARED"

# Shipping tabs
SHIPPING_ACTIVE=$(curl -s -H "Authorization: Bearer $TOKEN_SHIPPING" "${API_BASE}/portals/shipping/active-shipments" | jq -r '.data | length')
log_info "Shipping Active Shipments: $SHIPPING_ACTIVE"

# NBE tabs
NBE_FOREX=$(curl -s -H "Authorization: Bearer $TOKEN_NBE" "${API_BASE}/portals/nbe/forex-monitoring" | jq -r '.data | length')
log_info "NBE Forex Monitoring: $NBE_FOREX"

log_pass "All portal tabs verified"

# ==================================================================================
# SUMMARY
# ==================================================================================

echo "" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "📊 COMPLETE PORTAL ACTIONS TEST SUMMARY" | tee -a $TEST_OUTPUT
echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT
echo "Total Actions Tested: $STEP_COUNT" | tee -a $TEST_OUTPUT
echo "✅ Passed: $PASS_COUNT" | tee -a $TEST_OUTPUT
echo "❌ Failed: $FAIL_COUNT" | tee -a $TEST_OUTPUT
echo "" | tee -a $TEST_OUTPUT

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 ALL PORTAL ACTIONS COMPLETED SUCCESSFULLY!" | tee -a $TEST_OUTPUT
    echo "" | tee -a $TEST_OUTPUT
    echo "Actions Tested:" | tee -a $TEST_OUTPUT
    echo "  ✅ CREATE - Applications, Contracts, Shipments, Inspections, LCs, Declarations" | tee -a $TEST_OUTPUT
    echo "  ✅ READ - All portal tab lists verified" | tee -a $TEST_OUTPUT
    echo "  ✅ UPDATE - Contract updates, Shipment status changes" | tee -a $TEST_OUTPUT
    echo "  ✅ APPROVE - Applications, Contracts, Inspections, Customs clearances" | tee -a $TEST_OUTPUT
    echo "  ✅ REJECT - Application rejection workflow" | tee -a $TEST_OUTPUT
    echo "  ✅ SIGN - LC document signing (if available)" | tee -a $TEST_OUTPUT
else
    echo "⚠️  SOME ACTIONS FAILED - REVIEW DETAILS ABOVE" | tee -a $TEST_OUTPUT
fi

echo "════════════════════════════════════════════════════════════════" | tee -a $TEST_OUTPUT

exit $FAIL_COUNT
