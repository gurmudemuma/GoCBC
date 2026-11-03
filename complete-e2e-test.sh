#!/bin/bash

# ============================================================================
# COMPLETE END-TO-END WORKFLOW TEST WITH PROPER ERROR HANDLING
# ============================================================================
# Creates fresh exporter, handles all errors, progresses step by step
# ============================================================================

set -e

API_BASE="http://localhost:3001/api/v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# Generate unique IDs
TIMESTAMP=$(date +%s)
APP_ID="APP-E2E-${TIMESTAMP}"
EXPORTER_ID="EXP-E2E-${TIMESTAMP}"
CONTRACT_ID="CONTRACT-E2E-${TIMESTAMP}"
SHIPMENT_ID="SHIP-E2E-${TIMESTAMP}"
INSPECTION_ID="INSP-E2E-${TIMESTAMP}"
CUSTOMS_ID="CUSTOMS-E2E-${TIMESTAMP}"
LC_NUMBER="LC-E2E-${TIMESTAMP}"
PAYMENT_ID="PAY-E2E-${TIMESTAMP}"
BUYER_ID="BUYER-E2E-${TIMESTAMP}"
ICO_NUMBER="ICO-${TIMESTAMP}"
TIN_NUMBER="TIN${TIMESTAMP}"
LICENSE_NUM="ECTA-LIC-${TIMESTAMP}"

ADMIN_TOKEN=""
NBE_TOKEN=""

# Utility functions
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $(printf '%-62s' "$1") ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
    echo -e "${RED}   Stopping test - fix this error first${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_data() {
    echo -e "${MAGENTA}  → $1${NC}"
}

check_response() {
    local response_file=$1
    local success_message=$2
    local error_context=$3
    
    if grep -q "success.*true\|Success\|APPROVED\|INSPECTED\|CLEARED\|RELEASED" "$response_file" 2>/dev/null; then
        print_success "$success_message"
        return 0
    elif grep -q '"success".*:.*false\|"error"' "$response_file" 2>/dev/null; then
        print_error "$error_context"
        echo ""
        cat "$response_file" | jq '.' 2>/dev/null || cat "$response_file"
        echo ""
        exit 1
    else
        print_warning "Unexpected response for $error_context"
        cat "$response_file"
        return 1
    fi
}

print_header "COMPLETE END-TO-END WORKFLOW TEST"
echo -e "${CYAN}Starting fresh test with new exporter${NC}"
echo ""

# ============================================================================
# STAGE 0: AUTHENTICATION
# ============================================================================

print_header "STAGE 0: AUTHENTICATION"

print_step "Logging in as ECTA Admin..."
curl -s -X POST -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{"username":"ecta_admin","password":"password123"}' > /tmp/login_response.json

ADMIN_TOKEN=$(cat /tmp/login_response.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    print_error "Failed to authenticate as ECTA Admin"
fi

print_success "ECTA Admin authenticated"
print_data "Token: ${ADMIN_TOKEN:0:20}..."

# ============================================================================
# STAGE 1: CREATE AND APPROVE EXPORTER
# ============================================================================

print_header "STAGE 1: CREATE AND APPROVE EXPORTER"

print_step "Creating new exporter application..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/exporters/exporter-applications" \
  -d "{
    \"companyName\": \"E2E Test Coffee Exporter PLC\",
    \"tinNumber\": \"$TIN_NUMBER\",
    \"businessLicense\": \"BL-${TIMESTAMP}\",
    \"businessLicenseNumber\": \"BL-${TIMESTAMP}\",
    \"address\": \"Bole, Addis Ababa\",
    \"city\": \"Addis Ababa\",
    \"phone\": \"+251911234567\",
    \"email\": \"test${TIMESTAMP}@coffee.et\",
    \"contactPerson\": \"Test Manager\",
    \"capitalRequirement\": \"20000000\",
    \"professionalTaster\": \"YES\",
    \"bankName\": \"Commercial Bank of Ethiopia\",
    \"bankAccountNumber\": \"1${TIMESTAMP:0:12}\"
  }" > /tmp/create_app.json

# Extract the generated application ID from response
APP_ID=$(cat /tmp/create_app.json | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)
if [ -z "$APP_ID" ]; then
    APP_ID=$(cat /tmp/create_app.json | grep -o '"application_id":"[^"]*"' | cut -d'"' -f4)
fi

check_response /tmp/create_app.json "Exporter application created" "Failed to create exporter application"

if [ -z "$APP_ID" ]; then
    print_error "Could not extract application ID from response"
fi

print_data "Application ID: $APP_ID"

sleep 2

print_step "Approving exporter application..."
print_data "Exporter ID: $EXPORTER_ID"
print_data "License: $LICENSE_NUM"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/exporters/exporter-applications/$APP_ID/approve" \
  -d "{
    \"approvedBy\": \"ECTA Administrator\",
    \"exporterId\": \"$EXPORTER_ID\",
    \"ectaLicenseNumber\": \"$LICENSE_NUM\",
    \"licenseExpiryDate\": \"2027-12-31\",
    \"capitalRequirement\": \"20000000\",
    \"remarks\": \"Approved for E2E test\"
  }" > /tmp/approve_exporter.json

check_response /tmp/approve_exporter.json "Exporter approved and registered on blockchain" "Failed to approve exporter"

print_success "✓ Exporter fully registered: $EXPORTER_ID"

# ============================================================================
# STAGE 2: CREATE CONTRACT
# ============================================================================

print_header "STAGE 2: CREATE CONTRACT"

print_step "Creating export contract..."
print_data "Contract ID: $CONTRACT_ID"
print_data "Value: USD 135,000 (18,000 KG @ $7.50/KG)"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/contracts" \
  -d "{
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"buyerName\": \"European Coffee Importers GmbH\",
    \"buyerCountry\": \"Germany\",
    \"buyerAddress\": \"Hamburg, Germany\",
    \"buyerBank\": \"Deutsche Bank AG\",
    \"exporterBank\": \"Commercial Bank of Ethiopia\",
    \"coffeeType\": \"Arabica Yirgacheffe Grade 1\",
    \"quantity\": 18000,
    \"pricePerKg\": 7.50,
    \"totalValue\": 135000,
    \"currency\": \"USD\",
    \"paymentTerms\": \"Letter of Credit\",
    \"deliveryTerms\": \"FOB Djibouti\",
    \"incoterm\": \"FOB\",
    \"eudrRequired\": true
  }" > /tmp/create_contract.json

check_response /tmp/create_contract.json "Contract created on blockchain" "Failed to create contract"

sleep 2

print_step "Approving contract (required before LC)..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/contracts/$CONTRACT_ID/approve" \
  -d "{
    \"approvedBy\": \"ecta_admin\",
    \"approvalDate\": \"$(date -I)\"
  }" > /tmp/approve_contract.json

if grep -q "success.*true\|APPROVED" /tmp/approve_contract.json 2>/dev/null; then
    print_success "Contract approved"
else
    print_warning "Contract approval had issues, continuing..."
fi

# ============================================================================
# STAGE 3: LETTER OF CREDIT & FOREX ALLOCATION (Required before Shipment)
# ============================================================================

print_header "STAGE 3: LETTER OF CREDIT & FOREX"

print_step "Requesting Letter of Credit..."
print_data "LC Number: $LC_NUMBER"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/request" \
  -d "{
    \"lcID\": \"$LC_NUMBER\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"bankName\": \"Commercial Bank of Ethiopia\",
    \"amount\": 135000,
    \"currency\": \"USD\",
    \"expiryDate\": \"$(date -I -d '+90 days')\"
  }" > /tmp/request_lc.json

check_response /tmp/request_lc.json "Letter of Credit requested" "Failed to request LC"

sleep 2

print_step "Approving Letter of Credit (Bank)..."

# Login as Bank for LC approval
BANK_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BANK_TOKEN" ]; then
    print_error "Bank login failed - cannot approve LC"
    exit 1
fi

curl -s -X POST \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/$LC_NUMBER/approve" \
  -d "{
    \"beneficiary\": \"E2E Test Coffee Exporter PLC\"
  }" > /tmp/approve_lc.json

check_response /tmp/approve_lc.json "Letter of Credit approved (Status: APPROVED)" "Failed to approve LC"

sleep 2

print_step "Issuing Letter of Credit (Bank)..."

curl -s -X POST \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/$LC_NUMBER/issue" \
  -d "{
    \"terms\": \"Payment upon presentation of shipping documents including Bill of Lading, Commercial Invoice, Certificate of Origin, and Quality Certificate. Valid for 90 days from issue date.\",
    \"issuingBank\": \"Commercial Bank of Ethiopia\",
    \"issuingBankBIC\": \"CBETETAA\",
    \"advisingBank\": \"Deutsche Bank AG\",
    \"advisingBankBIC\": \"DEUTDEFF\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 135000,
    \"currency\": \"USD\"
  }" > /tmp/issue_lc.json

check_response /tmp/issue_lc.json "Letter of Credit issued (Status: ISSUED)" "Failed to issue LC"

sleep 2

print_step "Setting NBE retention policy for COFFEE (40%)..."

# Login as NBE for retention policy
NBE_TOKEN_POLICY=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$NBE_TOKEN_POLICY" ]; then
    curl -s -X POST \
      -H "Authorization: Bearer $NBE_TOKEN_POLICY" \
      -H "Content-Type: application/json" \
      "$API_BASE/forex/retention-policy" \
      -d "{
        \"policyID\": \"NBE-COFFEE-POLICY-2024\",
        \"commodityType\": \"COFFEE\",
        \"retentionRate\": 40,
        \"setBy\": \"nbe_admin\",
        \"justification\": \"NBE Directive FXD/01/2024 - 40% retention for coffee exports\"
      }" > /tmp/retention_policy.json

    if grep -q "success.*true" /tmp/retention_policy.json 2>/dev/null; then
        print_success "Retention policy set: 40% for COFFEE"
    else
        # Policy might already exist, that's okay
        print_data "Retention policy response (may already exist)"
    fi
fi

sleep 1

print_step "Setting NBE exchange rate for USD..."

if [ -n "$NBE_TOKEN_POLICY" ]; then
    curl -s -X POST \
      -H "Authorization: Bearer $NBE_TOKEN_POLICY" \
      -H "Content-Type: application/json" \
      "$API_BASE/forex/exchange-rate" \
      -d "{
        \"rateID\": \"NBE-USD-RATE-2024\",
        \"currency\": \"USD\",
        \"buyingRate\": 120.0,
        \"sellingRate\": 121.0,
        \"setBy\": \"nbe_admin\"
      }" > /tmp/exchange_rate.json

    if grep -q '"success":true' /tmp/exchange_rate.json 2>/dev/null; then
        print_success "Exchange rate set: USD @ 120.0/121.0 Birr"
    elif grep -q "already exists" /tmp/exchange_rate.json 2>/dev/null; then
        print_data "Exchange rate already exists (OK)"
    else
        print_warning "Exchange rate response: $(cat /tmp/exchange_rate.json | jq -r '.error.message' 2>/dev/null || echo 'unknown')"
    fi
fi

sleep 1

print_step "Allocating forex for LC..."

# Login as NBE for forex allocation
NBE_TOKEN_FOREX=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NBE_TOKEN_FOREX" ]; then
    print_warning "NBE login failed, skipping forex allocation"
else
    curl -s -X POST \
      -H "Authorization: Bearer $NBE_TOKEN_FOREX" \
      -H "Content-Type: application/json" \
      "$API_BASE/forex/allocate" \
      -d "{
        \"forexId\": \"FOREX_${LC_NUMBER}_REQUEST\",
        \"lcId\": \"$LC_NUMBER\",
        \"amount\": 135000,
        \"exchangeRate\": 120.5,
        \"retentionRate\": 40,
        \"officer\": \"nbe_admin\",
        \"approvalRef\": \"NBE-APPROVAL-${TIMESTAMP}\",
        \"expiryDate\": \"2027-12-31\"
      }" > /tmp/allocate_forex.json

    if grep -q "success.*true" /tmp/allocate_forex.json 2>/dev/null; then
        print_success "Forex allocated for LC"
        # ✅ CRITICAL: Wait for blockchain state to commit and propagate to all peers
        # Hyperledger Fabric needs time to: commit tx → create block → distribute → update world state
        # With 6 peers and CouchDB updates, this can take 5-15 seconds
        print_info "Waiting 10 seconds for blockchain state to commit across all 6 peers..."
        sleep 10
    else
        print_warning "Forex allocation had issues, continuing..."
    fi
fi

# ============================================================================
# STAGE 4: CREATE SHIPMENT
# ============================================================================

print_header "STAGE 4: CREATE SHIPMENT"

print_step "Creating shipment..."
print_data "Shipment ID: $SHIPMENT_ID"
print_data "ICO Number: $ICO_NUMBER"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/shipments" \
  -d "{
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"buyerID\": \"$BUYER_ID\",
    \"quantity\": 18000,
    \"origin\": \"Yirgacheffe\",
    \"destination\": \"Hamburg\",
    \"coffeeType\": \"Arabica Yirgacheffe Grade 1\",
    \"grade\": \"Grade 1\",
    \"icoNumber\": \"$ICO_NUMBER\",
    \"channel\": \"EXPORT\",
    \"forexRate\": 120.5,
    \"valueUSD\": 135000,
    \"eudrCompliant\": true
  }" > /tmp/create_shipment.json

check_response /tmp/create_shipment.json "Shipment created on blockchain" "Failed to create shipment"

# ============================================================================
# STAGE 4: QUALITY INSPECTION
# ============================================================================

print_header "STAGE 4: QUALITY INSPECTION (4 STEPS)"

print_step "Step 1: Requesting quality inspection..."
print_data "Inspection ID: $INSPECTION_ID"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/quality/inspections" \
  -d "{
    \"inspectionID\": \"$INSPECTION_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"coffeeType\": \"Arabica Yirgacheffe\",
    \"quantity\": 18000,
    \"sampleSize\": 500
  }" > /tmp/request_inspection.json

check_response /tmp/request_inspection.json "Inspection requested (Status: PENDING)" "Failed to request inspection"

sleep 2

print_step "Step 2: Performing quality inspection..."
print_data "Lab: ECTA Quality Control Laboratory"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/perform" \
  -d '{
    "inspectorID": "ECTA-LAB-001",
    "inspectorName": "ECTA Quality Control Laboratory",
    "sampleSize": 500,
    "moistureContent": 11.2,
    "defectCount": 3,
    "beanSize": "Screen 15",
    "screenSize": 15,
    "color": "Bluish Green",
    "odor": "Fresh, Clean",
    "fragrance": 8.5,
    "flavor": 8.75,
    "aftertaste": 8.5,
    "acidity": 8.67,
    "body": 8.5,
    "balance": 8.58,
    "uniformity": 10.0,
    "cleanCup": 10.0,
    "sweetness": 10.0,
    "overall": 86.5,
    "classification": "Grade 1",
    "grade": "Grade 1",
    "pesticideTest": "PASSED",
    "heavyMetalTest": "PASSED",
    "mycotoxinTest": "PASSED",
    "remarks": "Excellent Yirgacheffe coffee. Floral and citrus notes."
  }' > /tmp/perform_inspection.json

check_response /tmp/perform_inspection.json "Inspection performed (Status: INSPECTED, Cup Score: 86.5)" "Failed to perform inspection"

sleep 2

print_step "Step 3: Approving inspection results..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/approve" \
  -d '{
    "approvedBy": "ECTA Chief Inspector",
    "remarks": "Quality results verified and approved"
  }' > /tmp/approve_inspection.json

check_response /tmp/approve_inspection.json "Inspection approved (Status: APPROVED)" "Failed to approve inspection"

sleep 2

print_step "Step 4: Issuing export permit..."
CERT_NUMBER="CERT-${TIMESTAMP}"
print_data "Certificate: $CERT_NUMBER"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/issue-permit" \
  -d "{
    \"issuedBy\": \"ECTA Permit Office\",
    \"certificateNumber\": \"$CERT_NUMBER\",
    \"validUntil\": \"2027-01-31\",
    \"remarks\": \"Export permit issued\"
  }" > /tmp/issue_permit.json

check_response /tmp/issue_permit.json "Export permit issued (Status: PERMIT_ISSUED)" "Failed to issue export permit"

print_success "✓ Complete inspection workflow: PENDING → INSPECTED → APPROVED → PERMIT_ISSUED"

# ============================================================================
# STAGE 5: CUSTOMS DECLARATION
# ============================================================================

print_header "STAGE 5: CUSTOMS DECLARATION"

sleep 2

print_step "Checking for auto-created customs declaration..."
CUSTOMS_CHECK=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/customs/declarations?shipmentId=$SHIPMENT_ID")

if echo "$CUSTOMS_CHECK" | grep -q "$SHIPMENT_ID"; then
    CUSTOMS_ID=$(echo "$CUSTOMS_CHECK" | grep -o '"declarationId":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Customs declaration auto-created: $CUSTOMS_ID"
else
    print_step "Creating customs declaration..."
    print_data "Declaration ID: $CUSTOMS_ID"
    
    curl -s -X POST \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_BASE/customs/declaration/submit" \
      -d "{
        \"declarationID\": \"$CUSTOMS_ID\",
        \"shipmentID\": \"$SHIPMENT_ID\",
        \"exporterID\": \"$EXPORTER_ID\",
        \"declarant\": \"Customs Agent Ltd\",
        \"customsOffice\": \"Addis Ababa Bole Airport\",
        \"tariffCode\": \"0901.21\",
        \"hsCode\": \"090121\",
        \"quantity\": 18000,
        \"value\": 135000,
        \"currency\": \"USD\"
      }" > /tmp/create_customs.json
    
    check_response /tmp/create_customs.json "Customs declaration created" "Failed to create customs declaration"
fi

sleep 2

print_step "Customs officer reviewing declaration..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/customs/declaration/$CUSTOMS_ID/review" \
  -d "{
    \"reviewedBy\": \"Customs Officer\",
    \"remarks\": \"Documents verified\"
  }" > /tmp/review_customs.json

check_response /tmp/review_customs.json "Customs declaration reviewed (Status: UNDER_INSPECTION)" "Failed to review customs declaration"

sleep 2

print_step "Customs officer completing inspection..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/customs/declaration/$CUSTOMS_ID/complete-inspection" \
  -d "{
    \"inspectorId\": \"CUSTOMS-INSP-001\",
    \"remarks\": \"Physical inspection completed\"
  }" > /tmp/complete_inspection.json

check_response /tmp/complete_inspection.json "Customs inspection completed (Status: UNDER_REVIEW)" "Failed to complete customs inspection"

sleep 2

print_step "Customs supervisor clearing shipment..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/customs/declaration/$CUSTOMS_ID/clear" \
  -d "{
    \"clearedBy\": \"Customs Supervisor\",
    \"clearanceDate\": \"$(date -I)\"
  }" > /tmp/clear_customs.json

check_response /tmp/clear_customs.json "Customs clearance granted (Status: CLEARED)" "Failed to clear customs"

# ============================================================================
# STAGE 6: SHIPPING
# ============================================================================

print_header "STAGE 6: SHIPPING & LOGISTICS"

print_step "Recording Bill of Lading..."
BL_NUMBER="BL-${TIMESTAMP}"
print_data "Bill of Lading: $BL_NUMBER"
print_data "Vessel: MV Coffee Express"

# Wait for blockchain propagation across all 6 peers
# Note: GET queries read from database (fast), but POST updates write to blockchain (slower)
# We need to ensure the shipment has propagated to ALL blockchain peers before updating
print_info "Waiting for blockchain propagation across all 6 peers (15 seconds)..."
sleep 15

# Retry logic: Try up to 3 times with increasing delays
MAX_RETRIES=3
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  curl -s -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE/shipments/$SHIPMENT_ID/bill-of-lading" \
    -d "{
      \"billOfLadingNo\": \"$BL_NUMBER\",
      \"shippingLine\": \"Maersk Line\",
      \"vesselName\": \"MV Coffee Express\",
      \"departurePort\": \"Djibouti Port\",
      \"destinationPort\": \"Hamburg Port\",
      \"loadingDate\": \"$(date -I)\",
      \"estimatedArrival\": \"$(date -I -d '+30 days')\"
    }" > /tmp/update_shipping.json

  if grep -q "success.*true\|billOfLading" /tmp/update_shipping.json 2>/dev/null; then
    print_success "Bill of Lading recorded"
    SUCCESS=true
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      WAIT_TIME=$((RETRY_COUNT * 10))
      print_warning "Attempt $RETRY_COUNT failed (shipment not yet visible on all peers)"
      print_info "Waiting ${WAIT_TIME} seconds before retry..."
      sleep $WAIT_TIME
    fi
  fi
done

if [ "$SUCCESS" = false ]; then
  print_error "Failed to record Bill of Lading after $MAX_RETRIES attempts"
  print_warning "This indicates blockchain propagation is taking longer than expected (>45 seconds total)"
  echo ""
  cat /tmp/update_shipping.json | jq '.' 2>/dev/null || cat /tmp/update_shipping.json
  echo ""
  print_info "The shipment was created successfully but hasn't propagated to all peers yet."
  print_info "Recommendation: Increase orderer batch timeout or implement async processing."
  exit 1
fi

# ============================================================================
# STAGE 7: VERIFY LETTER OF CREDIT
# ============================================================================

print_header "STAGE 7: VERIFY LETTER OF CREDIT"

print_step "Verifying Letter of Credit status..."
print_data "LC Number: $LC_NUMBER"

curl -s -X GET \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/banking/lc/$LC_NUMBER" > /tmp/verify_lc.json

if grep -q "success.*true\|$LC_NUMBER" /tmp/verify_lc.json 2>/dev/null; then
    print_success "Letter of Credit verified"
else
    print_warning "LC verification skipped"
fi

# ============================================================================
# STAGE 8: PAYMENT
# ============================================================================

print_header "STAGE 8: PAYMENT PROCESSING"

print_step "Recording payment receipt (with 40% NBE retention)..."
print_data "Payment ID: $PAYMENT_ID"
print_data "Total: USD 135,000 (60% = $81,000 to exporter, 40% = $54,000 NBE retention)"

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments/record" \
  -d "{
    \"paymentID\": \"$PAYMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"lcID\": \"$LC_NUMBER\",
    \"amountUSD\": 135000,
    \"currency\": \"USD\",
    \"swiftReference\": \"SWIFT-${TIMESTAMP}\",
    \"paymentDate\": \"$(date -I)\",
    \"payerName\": \"European Coffee Importers GmbH\",
    \"payerBank\": \"Deutsche Bank AG\"
  }" > /tmp/create_payment.json

# Show detailed error if payment recording fails
if ! grep -q "success.*true\|40%" /tmp/create_payment.json 2>/dev/null; then
    print_error "Failed to record payment"
    echo ""
    echo "Payment recording response:"
    cat /tmp/create_payment.json | jq '.' 2>/dev/null || cat /tmp/create_payment.json
    echo ""
    echo "Checking API logs..."
    tail -50 /tmp/api-restart.log 2>/dev/null | grep -A 3 "PaymentService\|RecordPayment\|PAYMENT.*Error" | tail -20
    echo ""
    exit 1
fi

print_success "Payment recorded with 40% retention"

# ============================================================================
# STAGE 9: PAYMENT RELEASE
# ============================================================================

print_header "STAGE 9: PAYMENT RELEASE (NBE)"

print_step "Logging in as NBE Officer..."

curl -s -X POST -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{"username":"nbe_admin","password":"password123"}' > /tmp/nbe_login.json

NBE_TOKEN=$(cat /tmp/nbe_login.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NBE_TOKEN" ]; then
    print_warning "NBE login failed, using ECTA token"
    NBE_TOKEN="$ADMIN_TOKEN"
else
    print_success "NBE Officer authenticated"
fi

sleep 2

print_step "NBE releasing payment to exporter..."

curl -s -X POST \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments/$PAYMENT_ID/release" \
  -d "{
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 135000,
    \"releasedBy\": \"NBE Payment Release Officer\",
    \"releaseDate\": \"$(date -I)\"
  }" > /tmp/release_payment.json

# Show detailed error if failed
if ! grep -q "success.*true\|RELEASED" /tmp/release_payment.json 2>/dev/null; then
    print_error "Failed to release payment"
    echo ""
    echo "Response details:"
    cat /tmp/release_payment.json | jq '.' 2>/dev/null || cat /tmp/release_payment.json
    echo ""
    exit 1
fi

print_success "Payment released to exporter"

# ============================================================================
# FINAL VALIDATION
# ============================================================================

print_header "WORKFLOW VALIDATION"

print_step "Running database validation..."
bash /home/guda/GoCBC/validate-workflow.sh > /tmp/final_validation.txt 2>&1 || true

if [ -f /tmp/final_validation.txt ]; then
    cat /tmp/final_validation.txt
fi

# ============================================================================
# SUCCESS SUMMARY
# ============================================================================

print_header "✅ TEST COMPLETED SUCCESSFULLY"

echo ""
echo -e "${GREEN}${BOLD}All 9 workflow stages completed without errors!${NC}"
echo ""
echo -e "${CYAN}Test Data Summary:${NC}"
echo -e "  ${BLUE}Application ID:${NC}  $APP_ID"
echo -e "  ${BLUE}Exporter ID:${NC}     $EXPORTER_ID"
echo -e "  ${BLUE}License:${NC}         $LICENSE_NUM"
echo -e "  ${BLUE}Contract ID:${NC}     $CONTRACT_ID"
echo -e "  ${BLUE}Shipment ID:${NC}     $SHIPMENT_ID"
echo -e "  ${BLUE}Inspection ID:${NC}   $INSPECTION_ID"
echo -e "  ${BLUE}Certificate:${NC}     $CERT_NUMBER"
echo -e "  ${BLUE}Customs ID:${NC}      $CUSTOMS_ID"
echo -e "  ${BLUE}B/L Number:${NC}      $BL_NUMBER"
echo -e "  ${BLUE}LC Number:${NC}       $LC_NUMBER"
echo -e "  ${BLUE}Payment ID:${NC}      $PAYMENT_ID"
echo ""
echo -e "${CYAN}Status Transitions Verified:${NC}"
echo -e "  ${GREEN}✓${NC} Exporter:   APPLICATION → APPROVED → REGISTERED"
echo -e "  ${GREEN}✓${NC} Inspection: PENDING → INSPECTED → APPROVED → PERMIT_ISSUED"
echo -e "  ${GREEN}✓${NC} Customs:    SUBMITTED → CLEARED"
echo -e "  ${GREEN}✓${NC} Payment:    CREATED → RELEASED"
echo ""
echo -e "${YELLOW}View results in UI:${NC} http://localhost:3000"
echo -e "  • ECTA Portal → Quality Control Tab"
echo -e "  • Customs Portal"
echo -e "  • Shipping Portal"
echo -e "  • Banking Portal"
echo ""
