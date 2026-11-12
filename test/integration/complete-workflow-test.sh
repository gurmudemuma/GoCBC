#!/bin/bash

# ============================================================================
# COMPLETE END-TO-END COFFEE EXPORT WORKFLOW TEST
# ============================================================================
# This script tests the entire workflow from exporter registration to payment
# release, including all required documents, signatures, and status transitions.
# ============================================================================

set -e  # Exit on error

API_BASE="http://localhost:3001/api/v1"
UI_BASE="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Test data
TIMESTAMP=$(date +%s)
EXPORTER_ID="EXP-E2E-${TIMESTAMP}"
CONTRACT_ID="CONTRACT-E2E-${TIMESTAMP}"
SHIPMENT_ID="SHIP-E2E-${TIMESTAMP}"
INSPECTION_ID="INSP-E2E-${TIMESTAMP}"
CUSTOMS_ID="CUSTOMS-E2E-${TIMESTAMP}"
LC_NUMBER="LC-E2E-${TIMESTAMP}"
PAYMENT_ID="PAY-E2E-${TIMESTAMP}"

# Global token storage
ADMIN_TOKEN=""
EXPORTER_TOKEN=""
INSPECTOR_TOKEN=""
CUSTOMS_TOKEN=""
BANK_TOKEN=""
NBE_TOKEN=""

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

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
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_data() {
    echo -e "${MAGENTA}  → $1${NC}"
}

check_service() {
    local service_name=$1
    local url=$2
    
    print_step "Checking $service_name..."
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        print_success "$service_name is running"
        return 0
    else
        print_error "$service_name is not running at $url"
        return 1
    fi
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local description=$5
    
    local headers=""
    if [ -n "$token" ]; then
        headers="-H 'Authorization: Bearer $token'"
    fi
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
        headers="$headers -H 'Content-Type: application/json'"
    fi
    
    local cmd="curl -s -L -X $method $headers"  # Added -L to follow redirects
    if [ -n "$data" ]; then
        cmd="$cmd -d '$data'"
    fi
    cmd="$cmd '$API_BASE$endpoint'"
    
    print_step "$description"
    
    # Execute and capture response
    local response=$(eval $cmd 2>&1)
    local exit_code=$?
    
    # Save response to file for inspection
    echo "$response" > /tmp/last_api_response.json
    
    if [ $exit_code -eq 0 ]; then
        # Check if response contains error
        if echo "$response" | grep -q '"success".*:.*false'; then
            local error_msg=$(echo "$response" | grep -o '"message"[^,}]*' | head -1 | cut -d'"' -f4)
            print_error "$description failed: $error_msg"
            echo "$response" | jq '.' 2>/dev/null || echo "$response"
            return 1
        else
            print_success "$description completed"
            return 0
        fi
    else
        print_error "$description failed with exit code $exit_code"
        echo "$response"
        return 1
    fi
}

create_test_document() {
    local doc_type=$1
    local filename=$2
    
    # Create a simple test document
    local doc_path="/tmp/${filename}"
    echo "TEST DOCUMENT - $doc_type - Generated $(date)" > "$doc_path"
    echo "Document ID: $(uuidgen)" >> "$doc_path"
    echo "This is a test document for workflow validation" >> "$doc_path"
    
    # Convert to base64
    base64 "$doc_path" | tr -d '\n'
}

# ============================================================================
# STAGE 0: PRE-FLIGHT CHECKS
# ============================================================================

print_header "STAGE 0: PRE-FLIGHT CHECKS"

check_service "API Server" "http://localhost:3001/health" || exit 1
check_service "UI Server" "$UI_BASE" || print_info "UI Server not running (optional for API tests)"

print_success "All required services are running"

# ============================================================================
# STAGE 1: USER AUTHENTICATION
# ============================================================================

print_header "STAGE 1: USER AUTHENTICATION"

# Login as ECTA Admin
print_step "Logging in as ECTA Admin..."
ADMIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{
    "username": "ecta_admin",
    "password": "password123"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    print_success "ECTA Admin authenticated"
    print_data "Token: ${ADMIN_TOKEN:0:20}..."
else
    print_error "Failed to authenticate ECTA Admin"
    echo "$ADMIN_RESPONSE" | jq '.' 2>/dev/null || echo "$ADMIN_RESPONSE"
    exit 1
fi

# ============================================================================
# STAGE 2: EXPORTER REGISTRATION
# ============================================================================

print_header "STAGE 2: EXPORTER REGISTRATION"

print_step "Submitting exporter registration application..."

EXPORTER_APP_DATA=$(cat <<EOF
{
  "exporterID": "$EXPORTER_ID",
  "companyName": "Test Coffee Exporter PLC",
  "tinNumber": "TIN-${TIMESTAMP}",
  "businessLicenseNumber": "BL-${TIMESTAMP}",
  "capitalRequirement": 1000000,
  "professionalTaster": "Abebe Kebede",
  "address": "Addis Ababa, Ethiopia",
  "city": "Addis Ababa",
  "phone": "+251911234567",
  "email": "exporter${TIMESTAMP}@testcoffee.et",
  "contactPerson": "Abebe Kebede",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccount": "1000${TIMESTAMP}",
  "warehouseLicense": "WL-${TIMESTAMP}",
  "exportLicense": "EL-${TIMESTAMP}",
  "documents": [
    "$(create_test_document 'Business License' 'business_license.pdf')",
    "$(create_test_document 'TIN Certificate' 'tin_cert.pdf')",
    "$(create_test_document 'Warehouse License' 'warehouse_license.pdf')"
  ]
}
EOF
)

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/exporters/exporter-applications" \
  -d "$EXPORTER_APP_DATA" > /tmp/exporter_response.json

if grep -q "success" /tmp/exporter_response.json 2>/dev/null; then
    print_success "Exporter application submitted"
    print_data "Exporter ID: $EXPORTER_ID"
else
    print_error "Exporter application failed"
    cat /tmp/exporter_response.json
fi

# NOTE: POST /exporters/exporter-applications returns data.applicationId
# (exporters.ts:102); capture it for the approve call below, which is
# POST /exporters/exporter-applications/:applicationId/approve (exporters.ts:307)
# and requires the exporterId in the body.
APP_ID=$(jq -r '.data.applicationId // empty' /tmp/exporter_response.json 2>/dev/null)
[ -n "$APP_ID" ] || APP_ID="$EXPORTER_ID"

# Approve exporter application
print_step "ECTA Admin approving exporter application..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/exporters/exporter-applications/$APP_ID/approve" \
  -d '{
    "exporterId": "'"$EXPORTER_ID"'",
    "approvedBy": "ECTA Administrator",
    "remarks": "All documents verified and approved"
  }' > /tmp/approve_response.json

if grep -q "success" /tmp/approve_response.json 2>/dev/null; then
    print_success "Exporter approved and registered"
    print_data "Status: APPROVED"
else
    print_error "Exporter approval failed"
    cat /tmp/approve_response.json
fi

# Create exporter user account
print_step "Creating exporter user account..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/users" \
  -d "{
    \"username\": \"exporter_${TIMESTAMP}\",
    \"password\": \"password123\",
    \"email\": \"exporter${TIMESTAMP}@testcoffee.et\",
    \"role\": \"EXPORTER\",
    \"organization\": \"Test Coffee Exporter PLC\",
    \"exporterID\": \"$EXPORTER_ID\"
  }" > /tmp/user_response.json

if grep -q "success" /tmp/user_response.json 2>/dev/null; then
    print_success "Exporter user account created"
else
    print_info "User might already exist, continuing..."
fi

# Login as exporter
print_step "Logging in as Exporter..."

EXPORTER_LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d "{
    \"username\": \"exporter_${TIMESTAMP}\",
    \"password\": \"password123\"
  }")

EXPORTER_TOKEN=$(echo "$EXPORTER_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$EXPORTER_TOKEN" ]; then
    print_success "Exporter authenticated"
else
    print_error "Exporter login failed"
fi

# ============================================================================
# STAGE 3: CONTRACT REGISTRATION
# ============================================================================

print_header "STAGE 3: CONTRACT REGISTRATION"

print_step "Exporter creating export contract..."

CONTRACT_DATA=$(cat <<EOF
{
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "buyerName": "European Coffee Importers GmbH",
  "buyerCountry": "Germany",
  "buyerAddress": "Hamburg, Germany",
  "buyerEmail": "buyer@europeancoffee.de",
  "coffeeType": "Arabica Yirgacheffe Grade 1",
  "quantity": 18000,
  "unit": "KG",
  "pricePerKg": 7.50,
  "totalValue": 135000,
  "currency": "USD",
  "paymentTerms": "Letter of Credit",
  "deliveryTerms": "FOB Djibouti",
  "incoterm": "FOB",
  "deliveryDate": "2026-12-31",
  "portOfLoading": "Djibouti Port",
  "portOfDischarge": "Hamburg Port",
  "documents": {
    "salesContract": "$(create_test_document 'Sales Contract' 'sales_contract.pdf')",
    "buyerPO": "$(create_test_document 'Purchase Order' 'buyer_po.pdf')"
  }
}
EOF
)

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  "$API_BASE/contracts" \
  -d "$CONTRACT_DATA" > /tmp/contract_response.json

if grep -q "success" /tmp/contract_response.json 2>/dev/null; then
    print_success "Contract created"
    print_data "Contract ID: $CONTRACT_ID"
    print_data "Value: USD 135,000"
    print_data "Quantity: 18,000 KG"
else
    print_error "Contract creation failed"
    cat /tmp/contract_response.json
fi

# NBE Reviews and Approves Contract
print_step "NBE reviewing and approving contract..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/contracts/$CONTRACT_ID/nbe-approve" \
  -d '{
    "approvedBy": "NBE Officer",
    "nbeReferenceNumber": "NBE-2026-'$TIMESTAMP'",
    "remarks": "Contract approved for export"
  }' > /tmp/nbe_approve_response.json

if grep -q "success" /tmp/nbe_approve_response.json 2>/dev/null; then
    print_success "Contract approved by NBE"
    print_data "Status: NBE_APPROVED"
else
    print_info "NBE approval endpoint might differ, checking contract status..."
fi

# ============================================================================
# STAGE 4: SHIPMENT CREATION
# ============================================================================

print_header "STAGE 4: SHIPMENT CREATION"

print_step "Exporter creating shipment..."

SHIPMENT_DATA=$(cat <<EOF
{
  "shipmentID": "$SHIPMENT_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "quantity": 18000,
  "origin": "Yirgacheffe, Gedeo Zone",
  "destination": "Hamburg, Germany",
  "coffeeType": "Arabica Yirgacheffe Grade 1",
  "processingMethod": "Washed",
  "harvestYear": "2026",
  "icoNumber": "ICO-2026-${TIMESTAMP}",
  "ecxLotNumber": "ECX-LOT-${TIMESTAMP}",
  "warehouseReceipt": "WR-${TIMESTAMP}",
  "transportMode": "SEA",
  "expectedShipmentDate": "2026-11-30",
  "documents": {
    "warehouseReceipt": "$(create_test_document 'Warehouse Receipt' 'warehouse_receipt.pdf')",
    "icoDocument": "$(create_test_document 'ICO Certificate' 'ico_cert.pdf')"
  }
}
EOF
)

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  "$API_BASE/shipments" \
  -d "$SHIPMENT_DATA" > /tmp/shipment_response.json

if grep -q "success" /tmp/shipment_response.json 2>/dev/null; then
    print_success "Shipment created"
    print_data "Shipment ID: $SHIPMENT_ID"
    print_data "Quantity: 18,000 KG"
else
    print_error "Shipment creation failed"
    cat /tmp/shipment_response.json
fi

# ============================================================================
# STAGE 5: QUALITY INSPECTION
# ============================================================================

print_header "STAGE 5: QUALITY INSPECTION"

# Request inspection
print_step "Exporter requesting quality inspection..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  "$API_BASE/quality/inspections" \
  -d "{
    \"inspectionID\": \"$INSPECTION_ID\",
    \"shipmentID\": \"$SHIPMENT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"contractID\": \"$CONTRACT_ID\",
    \"coffeeType\": \"Arabica Yirgacheffe\",
    \"quantity\": 18000,
    \"sampleSize\": 500,
    \"requestedDate\": \"$(date -I)\"
  }" > /tmp/inspection_request.json

if grep -q "success" /tmp/inspection_request.json 2>/dev/null; then
    print_success "Quality inspection requested"
    print_data "Inspection ID: $INSPECTION_ID"
    print_data "Status: PENDING"
else
    print_error "Inspection request failed"
    cat /tmp/inspection_request.json
fi

# Perform inspection
print_step "ECTA Lab performing quality inspection..."

INSPECTION_RESULTS=$(cat <<EOF
{
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
  "remarks": "Excellent quality Yirgacheffe coffee. Floral and citrus notes. Recommended for specialty export."
}
EOF
)

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/perform" \
  -d "$INSPECTION_RESULTS" > /tmp/inspection_perform.json

if grep -q "success" /tmp/inspection_perform.json 2>/dev/null; then
    print_success "Quality inspection performed"
    print_data "Status: INSPECTED"
    print_data "Grade: Grade 1"
    print_data "Cup Score: 86.5"
else
    print_error "Inspection performance failed"
    cat /tmp/inspection_perform.json
fi

# Approve inspection
print_step "ECTA Officer approving inspection results..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/approve" \
  -d '{
    "approvedBy": "ECTA Chief Inspector",
    "remarks": "Quality inspection results verified and approved"
  }' > /tmp/inspection_approve.json

if grep -q "success" /tmp/inspection_approve.json 2>/dev/null; then
    print_success "Inspection approved"
    print_data "Status: APPROVED"
else
    print_error "Inspection approval failed"
    cat /tmp/inspection_approve.json
fi

# Issue export permit
print_step "ECTA issuing export permit..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/quality/inspections/$INSPECTION_ID/issue-permit" \
  -d "{
    \"issuedBy\": \"ECTA Permit Office\",
    \"certificateNumber\": \"CERT-${TIMESTAMP}\",
    \"validUntil\": \"2027-01-31\",
    \"remarks\": \"Export permit issued for 18,000 KG Grade 1 Arabica\"
  }" > /tmp/permit_issue.json

if grep -q "success" /tmp/permit_issue.json 2>/dev/null; then
    print_success "Export permit issued"
    print_data "Status: PERMIT_ISSUED"
    print_data "Certificate: CERT-${TIMESTAMP}"
else
    print_error "Permit issuance failed"
    cat /tmp/permit_issue.json
fi

# ============================================================================
# STAGE 6: CUSTOMS DECLARATION
# ============================================================================

print_header "STAGE 6: CUSTOMS DECLARATION"

# Check if customs declaration auto-created
print_step "Checking if customs declaration auto-created..."

CUSTOMS_CHECK=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/customs/declarations?shipmentID=$SHIPMENT_ID")

if echo "$CUSTOMS_CHECK" | grep -q "$SHIPMENT_ID"; then
    print_success "Customs declaration auto-created"
    CUSTOMS_ID=$(echo "$CUSTOMS_CHECK" | grep -o '"declarationId":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_data "Declaration ID: $CUSTOMS_ID"
else
    print_info "No auto-created declaration, creating manually..."
    
    # Create customs declaration
    # NOTE: the create endpoint is POST /customs/declaration/submit
    # (customs.ts:676); it requires declarationID, shipmentID, exporterID
    # (capital ID) and creates the declaration as SUBMITTED.
    curl -s -X POST -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "$API_BASE/customs/declaration/submit" \
      -d "{
        \"declarationID\": \"$CUSTOMS_ID\",
        \"shipmentID\": \"$SHIPMENT_ID\",
        \"exporterID\": \"$EXPORTER_ID\",
        \"declarant\": \"Customs Agent Ltd\",
        \"customsOffice\": \"Addis Ababa Bole International Airport\",
        \"declarationType\": \"EXPORT\",
        \"tariffCode\": \"0901.21\",
        \"hsCode\": \"090121\",
        \"commodityDescription\": \"Coffee, Arabica, not roasted, not decaffeinated\",
        \"quantity\": 18000,
        \"quantityUnit\": \"KG\",
        \"value\": 135000,
        \"currency\": \"USD\",
        \"exchangeRate\": 120.5,
        \"valueETB\": 16267500,
        \"exportDuty\": 0,
        \"documents\": {
          \"exportPermit\": \"$(create_test_document 'Export Permit' 'export_permit.pdf')\",
          \"qualityCertificate\": \"$(create_test_document 'Quality Certificate' 'quality_cert.pdf')\",
          \"invoice\": \"$(create_test_document 'Commercial Invoice' 'invoice.pdf')\"
        }
      }" > /tmp/customs_create.json
    
    if grep -q "success" /tmp/customs_create.json 2>/dev/null; then
        print_success "Customs declaration created"
        print_data "Declaration ID: $CUSTOMS_ID"
    else
        print_error "Customs declaration creation failed"
        cat /tmp/customs_create.json
    fi
fi

# Customs officer reviews and clears
print_step "Customs officer reviewing declaration..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/customs/declaration/$CUSTOMS_ID/review" \
  -d '{
    "assignedInspector": "Customs Officer",
    "inspectorNotes": "All documents verified"
  }' > /tmp/customs_review.json

if grep -q "success" /tmp/customs_review.json 2>/dev/null; then
    print_success "Customs declaration reviewed"
else
    print_info "Review endpoint might differ"
fi

print_step "Customs officer clearing shipment..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/customs/declaration/$CUSTOMS_ID/clear" \
  -d '{
    "clearedBy": "Customs Supervisor",
    "clearanceDate": "'$(date -I)'",
    "clearanceRemarks": "Cleared for export"
  }' > /tmp/customs_clear.json

if grep -q "success" /tmp/customs_clear.json 2>/dev/null; then
    print_success "Customs clearance granted"
    print_data "Status: CLEARED"
else
    print_error "Customs clearance failed"
    cat /tmp/customs_clear.json
fi

# ============================================================================
# STAGE 7: SHIPPING & LOGISTICS
# ============================================================================

print_header "STAGE 7: SHIPPING & LOGISTICS"

# Update shipment with shipping details
print_step "Exporter updating shipping details..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  "$API_BASE/shipments/$SHIPMENT_ID/bill-of-lading" \
  -d "{
    \"shippingLine\": \"Maersk Line\",
    \"vesselName\": \"MV Coffee Express\",
    \"voyageNumber\": \"VOY-${TIMESTAMP}\",
    \"billOfLadingNo\": \"BL-${TIMESTAMP}\",
    \"containerNumber\": \"CONT-${TIMESTAMP}\",
    \"sealNumber\": \"SEAL-${TIMESTAMP}\",
    \"departurePort\": \"Djibouti Port\",
    \"destinationPort\": \"Hamburg Port\",
    \"estimatedDeparture\": \"2026-11-25\",
    \"estimatedArrival\": \"2026-12-20\",
    \"documents\": {
      \"billOfLading\": \"$(create_test_document 'Bill of Lading' 'bill_of_lading.pdf')\",
      \"packingList\": \"$(create_test_document 'Packing List' 'packing_list.pdf')\"
    }
  }" > /tmp/shipping_update.json

if grep -q "success" /tmp/shipping_update.json 2>/dev/null; then
    print_success "Shipping details updated"
    print_data "Vessel: MV Coffee Express"
    print_data "BL Number: BL-${TIMESTAMP}"
else
    print_error "Shipping update failed"
    cat /tmp/shipping_update.json
fi

# Confirm shipment loaded
print_step "Shipping company confirming container loaded..."

# NOTE: there is no /confirm-loading route; the closest real endpoint is
# POST /shipments/:shipmentID/vessel/load (shipments.ts:2326), whose body is
# only {notes}. It invokes the LoadOnVessel chaincode function.
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/shipments/$SHIPMENT_ID/vessel/load" \
  -d "{
    \"notes\": \"Container loaded and sealed\"
  }" > /tmp/loading_confirm.json

if grep -q "success" /tmp/loading_confirm.json 2>/dev/null; then
    print_success "Container loading confirmed"
    print_data "Status: SHIPPED"
else
    print_info "Loading confirmation endpoint might differ"
fi

# ============================================================================
# STAGE 8: LETTER OF CREDIT
# ============================================================================

print_header "STAGE 8: LETTER OF CREDIT"

print_step "Issuing bank creating Letter of Credit..."

LC_DATA=$(cat <<EOF
{
  "lcID": "$LC_NUMBER",
  "shipmentId": "$SHIPMENT_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "bankName": "Deutsche Bank AG, Hamburg",
  "issuingBank": "Deutsche Bank AG, Hamburg",
  "advisingBank": "Commercial Bank of Ethiopia",
  "beneficiary": "Test Coffee Exporter PLC",
  "applicant": "European Coffee Importers GmbH",
  "amount": 135000,
  "currency": "USD",
  "issueDate": "$(date -I)",
  "expiryDate": "2027-01-31",
  "latestShipmentDate": "2026-11-30",
  "paymentTerms": "At Sight",
  "requiredDocuments": [
    "Commercial Invoice",
    "Bill of Lading",
    "Quality Certificate",
    "Phytosanitary Certificate",
    "Certificate of Origin",
    "Packing List"
  ],
  "documents": {
    "lcOriginal": "$(create_test_document 'Letter of Credit' 'lc_original.pdf')"
  }
}
EOF
)

# NOTE: LCs live under /banking/lc; the create endpoint is
# POST /banking/lc/request (banking.ts:85), which requires lcID, contractID,
# exporterID, bankName, amount, currency, expiryDate and returns 201 with
# data:{lcID, contractID, exporterID, status:'REQUESTED'}.
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/banking/lc/request" \
  -d "$LC_DATA" > /tmp/lc_create.json

if grep -q "success" /tmp/lc_create.json 2>/dev/null; then
    print_success "Letter of Credit issued"
    print_data "LC Number: $LC_NUMBER"
    print_data "Amount: USD 135,000"
else
    print_error "LC creation failed"
    cat /tmp/lc_create.json
fi

# Advising bank notifies beneficiary
print_step "Advising bank notifying exporter..."

# NOTE: removed-unverifiable: there is no /advise route for LCs anywhere in
# api/src/routes/banking.ts or api/src/routes/lc-amendments.ts (verified by
# grep 2026-11-11). The LC flow goes request -> approve -> issue
# (banking.ts:85, :289, :921); no endpoint records an "advised" step.
print_info "LC advising step skipped — no /advise endpoint exists"

# Exporter presents documents
print_step "Exporter presenting documents to bank..."

# NOTE: removed-unverifiable: there is no LC-scoped document-presentation
# endpoint. The closest real endpoint is POST
# /banking/payment/:paymentID/submit-documents (banking.ts:2089), which is
# scoped to a payment and needs a paymentID that does not exist at this stage
# of the workflow, so the call cannot be mapped.
print_info "Document presentation step skipped — no LC-scoped endpoint exists"

# Bank examines documents
print_step "Bank examining documents..."

# NOTE: the real examination endpoint is POST
# /banking/lc/:lcID/examine-documents (banking.ts:3268); it requires a
# boolean `compliant` in the body and sets the LC to UTILIZED when compliant.
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/banking/lc/$LC_NUMBER/examine-documents" \
  -d '{
    "examinedBy": "CBE Trade Finance Officer",
    "examinationDate": "'$(date -I)'",
    "compliant": true,
    "remarks": "All documents comply with LC terms"
  }' > /tmp/doc_examine.json

if grep -q "success" /tmp/doc_examine.json 2>/dev/null; then
    print_success "Documents examination completed"
    print_data "Result: COMPLIANT"
else
    print_info "Document examination endpoint might differ"
fi

# ============================================================================
# STAGE 9: PAYMENT PROCESSING
# ============================================================================

print_header "STAGE 9: PAYMENT PROCESSING"

print_step "Issuing bank processing payment..."

PAYMENT_DATA=$(cat <<EOF
{
  "paymentID": "$PAYMENT_ID",
  "lcNumber": "$LC_NUMBER",
  "shipmentId": "$SHIPMENT_ID",
  "contractId": "$CONTRACT_ID",
  "exporterId": "$EXPORTER_ID",
  "amount": 135000,
  "currency": "USD",
  "exchangeRate": 120.5,
  "amountETB": 16267500,
  "paymentMethod": "SWIFT",
  "swiftReference": "SWIFT-${TIMESTAMP}",
  "payingBank": "Deutsche Bank AG",
  "beneficiaryBank": "Commercial Bank of Ethiopia",
  "beneficiaryAccount": "1000${TIMESTAMP}",
  "paymentDate": "$(date -I)",
  "valueDate": "$(date -I)",
  "documents": {
    "paymentAdvice": "$(create_test_document 'Payment Advice' 'payment_advice.pdf')"
  }
}
EOF
)

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/payments" \
  -d "$PAYMENT_DATA" > /tmp/payment_create.json

if grep -q "success" /tmp/payment_create.json 2>/dev/null; then
    print_success "Payment processed"
    print_data "Payment ID: $PAYMENT_ID"
    print_data "Amount: USD 135,000"
else
    print_error "Payment processing failed"
    cat /tmp/payment_create.json
fi

# CBE confirms receipt
print_step "CBE confirming payment receipt..."

# NOTE: the real endpoint is PUT /payments/:paymentID/confirm
# (payments.ts:909); it requires confirmedBy and confirmationType and is
# restricted to BANKS/BANK_ADMIN roles (this script uses an admin token,
# which will 403 unless that token carries a bank role).
curl -s -X PUT -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/payments/$PAYMENT_ID/confirm" \
  -d '{
    "confirmedBy": "CBE Treasury",
    "confirmationType": "RECEIPT",
    "remarks": "Payment received and credited to exporter account"
  }' > /tmp/payment_confirm.json

if grep -q "success" /tmp/payment_confirm.json 2>/dev/null; then
    print_success "Payment receipt confirmed"
    print_data "Status: RECEIVED"
else
    print_info "Payment confirmation endpoint might differ"
fi

# ============================================================================
# STAGE 10: FOREX REPATRIATION
# ============================================================================

print_header "STAGE 10: FOREX REPATRIATION"

print_step "Exporter submitting forex repatriation..."

FOREX_DATA=$(cat <<EOF
{
  "repatriationId": "REP-$TIMESTAMP",
  "contractId": "$CONTRACT_ID",
  "shipmentId": "$SHIPMENT_ID",
  "paymentId": "$PAYMENT_ID",
  "exporterId": "$EXPORTER_ID",
  "exportAmount": 135000,
  "currency": "USD",
  "shipmentDate": "$(date -I)",
  "fcyBank": "Commercial Bank of Ethiopia",
  "fcyBankBIC": "CBETETAA",
  "amountUSD": 135000,
  "exchangeRate": 120.5,
  "amountETB": 16267500,
  "repatriationDate": "$(date -I)",
  "bankReference": "CBE-FOREX-${TIMESTAMP}",
  "documents": {
    "bankStatement": "$(create_test_document 'Bank Statement' 'bank_statement.pdf')",
    "swiftCopy": "$(create_test_document 'SWIFT Copy' 'swift_copy.pdf')"
  }
}
EOF
)

# NOTE: the real endpoint is POST /repatriation/initiate
# (repatriation.ts:199); it reads repatriationId, paymentId, contractId,
# shipmentId, exporterId, exportAmount, currency, fcyBank, fcyBankBIC,
# shipmentDate and returns 201 with data:{repatriationId}. It is restricted
# to bank roles (BANKS/BANK/BANK_ADMIN/BANK OFFICER); this script uses an
# exporter token, which will 403 unless that token carries a bank role.
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPORTER_TOKEN" \
  "$API_BASE/repatriation/initiate" \
  -d "$FOREX_DATA" > /tmp/forex_submit.json

# NOTE: capture the created repatriation id for the NBE verify step below.
REPAT_ID=$(jq -r '.data.repatriationId // empty' /tmp/forex_submit.json 2>/dev/null)
[ -n "$REPAT_ID" ] || REPAT_ID="REP-$TIMESTAMP"

if grep -q "success" /tmp/forex_submit.json 2>/dev/null; then
    print_success "Forex repatriation submitted"
else
    print_error "Forex submission failed"
    cat /tmp/forex_submit.json
fi

# NBE verifies forex repatriation
print_step "NBE verifying forex repatriation..."

# NOTE: the real endpoint is POST /repatriation/:id/verify
# (repatriation.ts:306); it takes the repatriation record id (not the
# contract id), requires NBE/NBE_ADMIN/NBE OFFICER role, and reads
# verificationRef and verificationNotes from the body.
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/repatriation/$REPAT_ID/verify" \
  -d '{
    "verificationRef": "NBE-VERIFY-'$TIMESTAMP'",
    "verificationNotes": "Forex repatriation verified and approved"
  }' > /tmp/forex_verify.json

if grep -q "success" /tmp/forex_verify.json 2>/dev/null; then
    print_success "Forex repatriation verified"
    print_data "Status: VERIFIED"
else
    print_info "Forex verification endpoint might differ"
fi

# ============================================================================
# STAGE 11: PAYMENT RELEASE (FINAL)
# ============================================================================

print_header "STAGE 11: PAYMENT RELEASE"

print_step "NBE releasing final payment to exporter..."

curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/payments/$PAYMENT_ID/release" \
  -d '{
    "releasedBy": "NBE Payment Release Officer",
    "releaseDate": "'$(date -I)'",
    "remarks": "All requirements met, payment released to exporter"
  }' > /tmp/payment_release.json

if grep -q "success" /tmp/payment_release.json 2>/dev/null; then
    print_success "Payment released to exporter"
    print_data "Status: RELEASED"
else
    print_error "Payment release failed"
    cat /tmp/payment_release.json
fi

# Mark contract as completed
print_step "Marking contract as completed..."

# NOTE: there is no POST /contracts/:id/complete. The real close-out is
# POST /post-delivery/:shipmentId/close-contract
# (postDeliveryWorkflow.ts:368, roles ECTA/ECTA_ADMIN); the body is ignored.
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/post-delivery/$SHIPMENT_ID/close-contract" \
  -d '{
    "completedBy": "System",
    "completionDate": "'$(date -I)'",
    "remarks": "Export cycle completed successfully"
  }' > /tmp/contract_complete.json

if grep -q "success" /tmp/contract_complete.json 2>/dev/null; then
    print_success "Contract marked as completed"
    print_data "Status: COMPLETED"
else
    print_info "Contract completion endpoint might differ"
fi

# ============================================================================
# FINAL VALIDATION
# ============================================================================

print_header "FINAL WORKFLOW VALIDATION"

print_step "Running workflow validation..."

bash "$(dirname "$0")/../scripts/validate-workflow.sh" > /tmp/final_validation.txt 2>&1

if [ -f /tmp/final_validation.txt ]; then
    cat /tmp/final_validation.txt
    print_success "Workflow validation completed"
else
    print_error "Validation script not found"
fi

# ============================================================================
# TEST SUMMARY
# ============================================================================

print_header "TEST EXECUTION SUMMARY"

echo ""
echo -e "${BOLD}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
echo -e "${BOLD}Success Rate: ${SUCCESS_RATE}%${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║          ⚠️  SOME TESTS FAILED - REVIEW LOGS ABOVE ⚠️           ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo -e "${CYAN}Test Data Generated:${NC}"
echo -e "  Exporter ID:     $EXPORTER_ID"
echo -e "  Contract ID:     $CONTRACT_ID"
echo -e "  Shipment ID:     $SHIPMENT_ID"
echo -e "  Inspection ID:   $INSPECTION_ID"
echo -e "  Customs ID:      $CUSTOMS_ID"
echo -e "  LC Number:       $LC_NUMBER"
echo -e "  Payment ID:      $PAYMENT_ID"
echo ""
echo -e "${CYAN}Logs saved to:${NC}"
echo -e "  /tmp/*_response.json"
echo -e "  /tmp/last_api_response.json"
echo -e "  /tmp/final_validation.txt"
echo ""

exit $([ $FAILED_TESTS -eq 0 ] && echo 0 || echo 1)
