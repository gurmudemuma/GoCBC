#!/bin/bash

# ============================================================================
# CONTINUE WORKFLOW TEST FROM EXISTING EXPORTER
# ============================================================================
# Uses existing exporter: EXP-E2E-1793603857
# Tests workflow from contract creation through payment release
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

# Use existing exporter
EXPORTER_ID="EXP-E2E-1793603857"
TIMESTAMP=$(date +%s)
CONTRACT_ID="CONTRACT-E2E-${TIMESTAMP}"
SHIPMENT_ID="SHIP-E2E-${TIMESTAMP}"
INSPECTION_ID="INSP-E2E-${TIMESTAMP}"
CUSTOMS_ID="CUSTOMS-E2E-${TIMESTAMP}"
LC_NUMBER="LC-E2E-${TIMESTAMP}"
PAYMENT_ID="PAY-E2E-${TIMESTAMP}"

ADMIN_TOKEN=""

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
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_data() {
    echo -e "${MAGENTA}  → $1${NC}"
}

create_test_document() {
    local doc_type=$1
    local filename=$2
    local doc_path="/tmp/${filename}"
    echo "TEST DOCUMENT - $doc_type - Generated $(date)" > "$doc_path"
    echo "Document ID: $(uuidgen 2>/dev/null || echo 'DOC-'$(date +%s))" >> "$doc_path"
    echo "This is a test document for workflow validation" >> "$doc_path"
    base64 "$doc_path" 2>/dev/null | tr -d '\n' || echo "BASE64_PLACEHOLDER"
}

print_header "CONTINUING WORKFLOW TEST"
echo -e "${CYAN}Using existing exporter: ${BOLD}$EXPORTER_ID${NC}"
echo ""

# ============================================================================
# AUTHENTICATE
# ============================================================================

print_header "AUTHENTICATION"

print_step "Logging in as ECTA Admin..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{
    "username": "ecta_admin",
    "password": "password123"
  }')

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    print_success "ECTA Admin authenticated"
    print_data "Token: ${ADMIN_TOKEN:0:20}..."
else
    print_error "Authentication failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# ============================================================================
# APPROVE EXISTING EXPORTER (if still pending)
# ============================================================================

print_header "STAGE 1: APPROVE EXPORTER"

print_step "Checking exporter status..."

curl -s -L -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/exporters/exporter-applications/$EXPORTER_ID/approve" \
  -d "{
    \"approvedBy\": \"ECTA Administrator\",
    \"exporterId\": \"$EXPORTER_ID\",
    \"ectaLicenseNumber\": \"ECTA-LIC-${TIMESTAMP}\",
    \"licenseExpiryDate\": \"2027-12-31\",
    \"remarks\": \"All documents verified and approved\"
  }" > /tmp/approve_response.json

if grep -q "success.*true\|already.*approved" /tmp/approve_response.json 2>/dev/null; then
    print_success "Exporter approved (or already approved)"
else
    print_info "Approval response:"
    cat /tmp/approve_response.json | jq '.' 2>/dev/null || cat /tmp/approve_response.json
fi

# ============================================================================
# STAGE 2: CONTRACT REGISTRATION
# ============================================================================

print_header "STAGE 2: CONTRACT REGISTRATION"

print_step "Creating export contract..."

BUYER_ID="BUYER-EU-${TIMESTAMP}"
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
  }" > /tmp/contract_response.json

if grep -q "success.*true\|contractID\|contract_id" /tmp/contract_response.json 2>/dev/null; then
    print_success "Contract created: $CONTRACT_ID"
    print_data "Value: USD 135,000"
    print_data "Quantity: 18,000 KG"
else
    print_error "Contract creation failed"
    cat /tmp/contract_response.json | jq '.' 2>/dev/null || cat /tmp/contract_response.json
fi

# ============================================================================
# STAGE 3: SHIPMENT CREATION
# ============================================================================

print_header "STAGE 3: SHIPMENT CREATION"

print_step "Creating shipment..."

ICO_NUMBER="ICO-2026-${TIMESTAMP}"
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
  }" > /tmp/shipment_response.json

if grep -q "success.*true\|shipmentID\|shipment_id" /tmp/shipment_response.json 2>/dev/null; then
    print_success "Shipment created: $SHIPMENT_ID"
else
    print_error "Shipment creation failed"
    cat /tmp/shipment_response.json | jq '.' 2>/dev/null || cat /tmp/shipment_response.json
fi

# ============================================================================
# STAGE 4: QUALITY INSPECTION
# ============================================================================

print_header "STAGE 4: QUALITY INSPECTION"

print_step "Step 1: Requesting quality inspection..."

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
  }" > /tmp/inspection_request.json

if grep -q "success.*true\|inspectionID\|inspection_id" /tmp/inspection_request.json 2>/dev/null; then
    print_success "Inspection requested: $INSPECTION_ID"
    print_data "Status: PENDING"
else
    print_error "Inspection request failed"
    cat /tmp/inspection_request.json | jq '.' 2>/dev/null || cat /tmp/inspection_request.json
fi

sleep 2

print_step "Step 2: Performing quality inspection..."

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
    "remarks": "Excellent quality Yirgacheffe coffee. Floral and citrus notes."
  }' > /tmp/inspection_perform.json

if grep -q "success.*true\|INSPECTED" /tmp/inspection_perform.json 2>/dev/null; then
    print_success "Inspection performed"
    print_data "Status: INSPECTED"
    print_data "Grade: Grade 1, Cup Score: 86.5"
else
    print_error "Inspection performance failed"
    cat /tmp/inspection_perform.json | jq '.' 2>/dev/null || cat /tmp/inspection_perform.json
fi

sleep 2

print_step "Step 3: Approving inspection results..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/approve" \
  -d '{
    "approvedBy": "ECTA Chief Inspector",
    "remarks": "Quality results verified"
  }' > /tmp/inspection_approve.json

if grep -q "success.*true\|APPROVED" /tmp/inspection_approve.json 2>/dev/null; then
    print_success "Inspection approved"
    print_data "Status: APPROVED"
else
    print_error "Inspection approval failed"
    cat /tmp/inspection_approve.json | jq '.' 2>/dev/null || cat /tmp/inspection_approve.json
fi

sleep 2

print_step "Step 4: Issuing export permit..."

CERT_NUMBER="CERT-${TIMESTAMP}"
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/issue-permit" \
  -d "{
    \"issuedBy\": \"ECTA Permit Office\",
    \"certificateNumber\": \"$CERT_NUMBER\",
    \"validUntil\": \"2027-01-31\",
    \"remarks\": \"Export permit issued for 18,000 KG Grade 1 Arabica\"
  }" > /tmp/permit_issue.json

if grep -q "success.*true\|PERMIT_ISSUED\|permit_issued" /tmp/permit_issue.json 2>/dev/null; then
    print_success "Export permit issued"
    print_data "Status: PERMIT_ISSUED"
    print_data "Certificate: $CERT_NUMBER"
else
    print_error "Permit issuance failed"
    cat /tmp/permit_issue.json | jq '.' 2>/dev/null || cat /tmp/permit_issue.json
fi

# ============================================================================
# STAGE 5: CUSTOMS DECLARATION
# ============================================================================

print_header "STAGE 5: CUSTOMS DECLARATION"

print_step "Checking if customs declaration auto-created..."

sleep 2

CUSTOMS_CHECK=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/customs/declarations?shipmentId=$SHIPMENT_ID" 2>/dev/null || echo "")

if echo "$CUSTOMS_CHECK" | grep -q "$SHIPMENT_ID"; then
    print_success "Customs declaration auto-created"
    CUSTOMS_ID=$(echo "$CUSTOMS_CHECK" | grep -o '"declarationId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "$CUSTOMS_ID")
    print_data "Declaration ID: $CUSTOMS_ID"
else
    print_info "Creating customs declaration manually..."
    
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
        \"quantity\": 18000,
        \"value\": 135000,
        \"currency\": \"USD\"
      }" > /tmp/customs_create.json
    
    if grep -q "success.*true\|declarationId" /tmp/customs_create.json 2>/dev/null; then
        print_success "Customs declaration created: $CUSTOMS_ID"
    else
        print_error "Customs declaration failed"
        cat /tmp/customs_create.json | jq '.' 2>/dev/null || cat /tmp/customs_create.json
    fi
fi

sleep 2

print_step "Customs officer clearing shipment..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/customs/declaration/$CUSTOMS_ID/clear" \
  -d "{
    \"clearedBy\": \"Customs Supervisor\",
    \"clearanceDate\": \"$(date -I)\"
  }" > /tmp/customs_clear.json

if grep -q "success.*true\|CLEARED\|cleared" /tmp/customs_clear.json 2>/dev/null; then
    print_success "Customs clearance granted"
    print_data "Status: CLEARED"
else
    print_info "Customs clearance response:"
    cat /tmp/customs_clear.json | jq '.' 2>/dev/null || cat /tmp/customs_clear.json
fi

# ============================================================================
# STAGE 6: SHIPPING
# ============================================================================

print_header "STAGE 6: SHIPPING & LOGISTICS"

print_step "Updating shipping details..."

BL_NUMBER="BL-${TIMESTAMP}"
curl -s -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/shipments/$SHIPMENT_ID/shipping-status" \
  -d "{
    \"shippingLine\": \"Maersk Line\",
    \"vesselName\": \"MV Coffee Express\",
    \"billOfLadingNo\": \"$BL_NUMBER\",
    \"departurePort\": \"Djibouti Port\",
    \"destinationPort\": \"Hamburg Port\",
    \"status\": \"SHIPPED\"
  }" > /tmp/shipping_update.json

if grep -q "success.*true\|shipmentID" /tmp/shipping_update.json 2>/dev/null; then
    print_success "Shipping details updated"
    print_data "Vessel: MV Coffee Express"
    print_data "B/L: $BL_NUMBER"
else
    print_info "Shipping update response:"
    cat /tmp/shipping_update.json | jq '.' 2>/dev/null || cat /tmp/shipping_update.json
fi

# ============================================================================
# STAGE 7: LETTER OF CREDIT
# ============================================================================

print_header "STAGE 7: LETTER OF CREDIT"

print_step "Requesting Letter of Credit..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/request" \
  -d "{
    \"lcID\": \"$LC_NUMBER\",
    \"shipmentId\": \"$SHIPMENT_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"bankName\": \"Deutsche Bank AG\",
    \"amount\": 135000,
    \"currency\": \"USD\",
    \"expiryDate\": \"$(date -d '+90 days' +%Y-%m-%d)\",
    \"issuingBank\": \"Deutsche Bank AG\",
    \"advisingBank\": \"Commercial Bank of Ethiopia\"
  }" > /tmp/lc_create.json

if grep -q "success.*true\|lcNumber" /tmp/lc_create.json 2>/dev/null; then
    print_success "Letter of Credit requested: $LC_NUMBER"
    print_data "Amount: USD 135,000"
else
    print_info "LC creation response:"
    cat /tmp/lc_create.json | jq '.' 2>/dev/null || cat /tmp/lc_create.json
fi

# ============================================================================
# STAGE 8: PAYMENT PROCESSING
# ============================================================================

print_header "STAGE 8: PAYMENT PROCESSING"

print_step "Processing payment..."

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments" \
  -d "{
    \"paymentID\": \"$PAYMENT_ID\",
    \"lcNumber\": \"$LC_NUMBER\",
    \"shipmentId\": \"$SHIPMENT_ID\",
    \"amount\": 135000,
    \"currency\": \"USD\"
  }" > /tmp/payment_create.json

if grep -q "success.*true\|paymentID" /tmp/payment_create.json 2>/dev/null; then
    print_success "Payment processed: $PAYMENT_ID"
    print_data "Amount: USD 135,000"
else
    print_info "Payment response:"
    cat /tmp/payment_create.json | jq '.' 2>/dev/null || cat /tmp/payment_create.json
fi

# ============================================================================
# STAGE 9: PAYMENT RELEASE
# ============================================================================

print_header "STAGE 9: PAYMENT RELEASE (FINAL)"

# Login as NBE user for payment release
print_step "Logging in as NBE Officer..."

NBE_LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{
    "username": "nbe_admin",
    "password": "password123"
  }')

NBE_TOKEN=$(echo "$NBE_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$NBE_TOKEN" ]; then
    print_success "NBE Officer authenticated"
else
    print_error "NBE login failed, using ECTA token"
    NBE_TOKEN="$ADMIN_TOKEN"
fi

print_step "NBE releasing payment to exporter..."

curl -s -X POST \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments/$PAYMENT_ID/release" \
  -d "{
    \"releasedBy\": \"NBE Payment Release Officer\",
    \"releaseDate\": \"$(date -I)\"
  }" > /tmp/payment_release.json

if grep -q "success.*true\|RELEASED\|released" /tmp/payment_release.json 2>/dev/null; then
    print_success "Payment released to exporter"
    print_data "Status: RELEASED"
else
    print_info "Payment release response:"
    cat /tmp/payment_release.json | jq '.' 2>/dev/null || cat /tmp/payment_release.json
fi

# ============================================================================
# FINAL STATUS CHECK
# ============================================================================

print_header "WORKFLOW STATUS SUMMARY"

echo ""
echo -e "${CYAN}${BOLD}Test Data IDs:${NC}"
echo -e "  ${BLUE}Exporter:${NC}     $EXPORTER_ID"
echo -e "  ${BLUE}Contract:${NC}     $CONTRACT_ID"
echo -e "  ${BLUE}Shipment:${NC}     $SHIPMENT_ID"
echo -e "  ${BLUE}Inspection:${NC}   $INSPECTION_ID"
echo -e "  ${BLUE}Customs:${NC}      $CUSTOMS_ID"
echo -e "  ${BLUE}LC Number:${NC}    $LC_NUMBER"
echo -e "  ${BLUE}Payment:${NC}      $PAYMENT_ID"
echo ""

print_step "Running database validation..."
bash "$(dirname "$0")/../scripts/validate-workflow.sh" > /tmp/final_validation.txt 2>&1

if [ -f /tmp/final_validation.txt ]; then
    cat /tmp/final_validation.txt
fi

echo ""
print_header "TEST COMPLETE"
echo ""
print_success "✅ Workflow test completed!"
echo ""
echo -e "${YELLOW}Check the ECTA Portal Quality Control tab to see:${NC}"
echo -e "  • Inspection ID: ${BOLD}$INSPECTION_ID${NC}"
echo -e "  • Status: ${GREEN}PERMIT_ISSUED${NC}"
echo -e "  • Certificate: ${BOLD}$CERT_NUMBER${NC}"
echo ""
echo -e "${CYAN}Access the UI at: ${BOLD}http://localhost:3000${NC}"
echo ""
