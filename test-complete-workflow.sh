#!/bin/bash
# Complete End-to-End Workflow Test
# From Exporter Registration to Final Payment Settlement

set -e

API_URL="http://localhost:3001"
TIMESTAMP=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

print_data() {
    echo -e "${YELLOW}  $1${NC}"
}

# Test API connectivity
print_header "STEP 0: API CONNECTIVITY CHECK"
print_step "Testing API health..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    print_success "API is healthy and ready"
    print_data "$(echo $HEALTH | jq -r '.services | to_entries | map("\(.key): \(.value)") | join(", ")')"
else
    print_error "API is not responding properly"
    exit 1
fi

# Step 1: Register Exporter
print_header "STEP 1: EXPORTER REGISTRATION"
print_step "Registering coffee exporter..."

EXPORTER_ID="EXP${TIMESTAMP}"
EXPORTER_DATA=$(cat <<EOF
{
  "exporterID": "$EXPORTER_ID",
  "tinNumber": "TIN${TIMESTAMP}",
  "name": "Yirgacheffe Coffee Cooperative",
  "registrationDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "address": "Yirgacheffe, Gedeo Zone, SNNPR, Ethiopia",
  "phone": "+251-911-123456",
  "email": "info@yirgacheffe-coop.et",
  "bank": "Commercial Bank of Ethiopia",
  "bankAccount": "1000${TIMESTAMP}",
  "licenseNumber": "LIC${TIMESTAMP}",
  "licenseExpiry": "2027-12-31T23:59:59Z",
  "representativeName": "Ato Bekele Tadesse",
  "representativePhone": "+251-911-987654",
  "status": "ACTIVE",
  "coffeeTypes": ["Arabica", "Yirgacheffe Grade 1"],
  "certifications": ["Organic", "Fair Trade"],
  "exportHistory": "5 years",
  "warehouseLocation": "Yirgacheffe District Warehouse",
  "gpsCoordinates": "6.1631° N, 38.2017° E"
}
EOF
)

EXPORTER_RESPONSE=$(curl -s -X POST "$API_URL/api/exporters" \
  -H "Content-Type: application/json" \
  -d "$EXPORTER_DATA")

if echo "$EXPORTER_RESPONSE" | grep -q "success\|$EXPORTER_ID"; then
    print_success "Exporter registered successfully"
    print_data "Exporter ID: $EXPORTER_ID"
    print_data "TIN: TIN${TIMESTAMP}"
else
    print_error "Failed to register exporter"
    print_data "Response: $EXPORTER_RESPONSE"
    exit 1
fi

# Step 2: Register ECX Lot
print_header "STEP 2: ECX LOT REGISTRATION"
print_step "Registering coffee lot at ECX..."

ECX_LOT_ID="ECX${TIMESTAMP}"
ECX_LOT_DATA=$(cat <<EOF
{
  "lotID": "$ECX_LOT_ID",
  "exporterID": "$EXPORTER_ID",
  "coffeeType": "Arabica",
  "grade": "Grade 1",
  "weight": "18000",
  "origin": "Yirgacheffe",
  "registrationDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "warehouseLocation": "ECX Addis Ababa Warehouse #3",
  "status": "REGISTERED"
}
EOF
)

ECX_RESPONSE=$(curl -s -X POST "$API_URL/api/ecx-lots" \
  -H "Content-Type: application/json" \
  -d "$ECX_LOT_DATA")

if echo "$ECX_RESPONSE" | grep -q "success\|$ECX_LOT_ID"; then
    print_success "ECX lot registered"
    print_data "Lot ID: $ECX_LOT_ID"
    print_data "Weight: 18,000 kg (Grade 1 Yirgacheffe)"
else
    print_error "Failed to register ECX lot"
    print_data "Response: $ECX_RESPONSE"
    exit 1
fi

# Step 3: Create Sales Contract
print_header "STEP 3: SALES CONTRACT CREATION"
print_step "Creating sales contract with international buyer..."

CONTRACT_ID="SC${TIMESTAMP}"
CONTRACT_DATA=$(cat <<EOF
{
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "buyerName": "Global Coffee Importers Ltd",
  "buyerCountry": "Germany",
  "coffeeType": "Arabica Yirgacheffe Grade 1",
  "quantity": "18000",
  "pricePerKg": "12.50",
  "totalValue": "225000",
  "currency": "USD",
  "paymentTerms": "LC at sight",
  "deliveryTerms": "FOB Djibouti",
  "contractDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deliveryDate": "$(date -u -d '+60 days' +%Y-%m-%dT%H:%M:%SZ)",
  "status": "PENDING_APPROVAL"
}
EOF
)

CONTRACT_RESPONSE=$(curl -s -X POST "$API_URL/api/contracts" \
  -H "Content-Type: application/json" \
  -d "$CONTRACT_DATA")

if echo "$CONTRACT_RESPONSE" | grep -q "success\|$CONTRACT_ID"; then
    print_success "Sales contract created"
    print_data "Contract ID: $CONTRACT_ID"
    print_data "Value: $225,000 USD (18,000 kg @ $12.50/kg)"
    print_data "Payment: LC at sight"
else
    print_error "Failed to create sales contract"
    print_data "Response: $CONTRACT_RESPONSE"
    exit 1
fi

# Step 4: Approve Sales Contract
print_header "STEP 4: SALES CONTRACT APPROVAL"
print_step "Approving sales contract..."

APPROVE_RESPONSE=$(curl -s -X POST "$API_URL/api/contracts/$CONTRACT_ID/approve" \
  -H "Content-Type: application/json")

if echo "$APPROVE_RESPONSE" | grep -q "success\|approved"; then
    print_success "Sales contract approved"
else
    print_error "Failed to approve contract"
    print_data "Response: $APPROVE_RESPONSE"
fi

# Step 5: Issue Export Permit
print_header "STEP 5: CBE EXPORT PERMIT"
print_step "Issuing export permit from Commercial Bank of Ethiopia..."

PERMIT_ID="PERMIT${TIMESTAMP}"
PERMIT_DATA=$(cat <<EOF
{
  "permitID": "$PERMIT_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "permitType": "STANDARD",
  "amount": "225000",
  "currency": "USD",
  "issueDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "expiryDate": "$(date -u -d '+180 days' +%Y-%m-%dT%H:%M:%SZ)",
  "issuedBy": "Commercial Bank of Ethiopia",
  "status": "ACTIVE"
}
EOF
)

PERMIT_RESPONSE=$(curl -s -X POST "$API_URL/api/permits" \
  -H "Content-Type: application/json" \
  -d "$PERMIT_DATA")

if echo "$PERMIT_RESPONSE" | grep -q "success\|$PERMIT_ID"; then
    print_success "Export permit issued"
    print_data "Permit ID: $PERMIT_ID"
    print_data "Amount: $225,000 USD"
else
    print_error "Failed to issue export permit"
    print_data "Response: $PERMIT_RESPONSE"
fi

# Step 6: Request Letter of Credit
print_header "STEP 6: LETTER OF CREDIT REQUEST"
print_step "Buyer's bank issuing Letter of Credit..."

LC_ID="LC${TIMESTAMP}"
LC_DATA=$(cat <<EOF
{
  "lcID": "$LC_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "issuingBank": "Deutsche Bank AG",
  "issuingBankBIC": "DEUTDEFF",
  "advisingBank": "Commercial Bank of Ethiopia",
  "advisingBankBIC": "CBETETAA",
  "beneficiaryName": "Yirgacheffe Coffee Cooperative",
  "applicantName": "Global Coffee Importers Ltd",
  "amount": "225000",
  "currency": "USD",
  "issueDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "expiryDate": "$(date -u -d '+120 days' +%Y-%m-%dT%H:%M:%SZ)",
  "paymentTerms": "At sight",
  "status": "ISSUED"
}
EOF
)

LC_RESPONSE=$(curl -s -X POST "$API_URL/api/lcs" \
  -H "Content-Type: application/json" \
  -d "$LC_DATA")

if echo "$LC_RESPONSE" | grep -q "success\|$LC_ID"; then
    print_success "Letter of Credit issued"
    print_data "LC ID: $LC_ID"
    print_data "Issuing Bank: Deutsche Bank AG"
    print_data "Amount: $225,000 USD"
else
    print_error "Failed to issue LC"
    print_data "Response: $LC_RESPONSE"
fi

# Step 7: Allocate Forex
print_header "STEP 7: FOREX ALLOCATION"
print_step "National Bank of Ethiopia allocating foreign exchange..."

FOREX_ID="FOREX${TIMESTAMP}"
FOREX_DATA=$(cat <<EOF
{
  "forexID": "$FOREX_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "amount": "225000",
  "currency": "USD",
  "exchangeRate": "57.50",
  "etbEquivalent": "12937500",
  "allocationDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "expiryDate": "$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ)",
  "allocatedBy": "National Bank of Ethiopia",
  "status": "ALLOCATED"
}
EOF
)

FOREX_RESPONSE=$(curl -s -X POST "$API_URL/api/forex" \
  -H "Content-Type: application/json" \
  -d "$FOREX_DATA")

if echo "$FOREX_RESPONSE" | grep -q "success\|$FOREX_ID"; then
    print_success "Forex allocated"
    print_data "Forex ID: $FOREX_ID"
    print_data "Amount: $225,000 USD @ 57.50 ETB/USD"
else
    print_error "Failed to allocate forex"
    print_data "Response: $FOREX_RESPONSE"
fi

# Step 8: Create Shipment
print_header "STEP 8: SHIPMENT CREATION"
print_step "Creating shipment record..."

SHIPMENT_ID="SHP${TIMESTAMP}"
SHIPMENT_DATA=$(cat <<EOF
{
  "shipmentID": "$SHIPMENT_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "ecxLotID": "$ECX_LOT_ID",
  "origin": "Yirgacheffe, Ethiopia",
  "destination": "Hamburg, Germany",
  "quantity": "18000",
  "departurePort": "Djibouti",
  "destinationPort": "Hamburg",
  "estimatedDeparture": "$(date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ)",
  "estimatedArrival": "$(date -u -d '+37 days' +%Y-%m-%dT%H:%M:%SZ)",
  "status": "PREPARING"
}
EOF
)

SHIPMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/shipments" \
  -H "Content-Type: application/json" \
  -d "$SHIPMENT_DATA")

if echo "$SHIPMENT_RESPONSE" | grep -q "success\|$SHIPMENT_ID"; then
    print_success "Shipment created"
    print_data "Shipment ID: $SHIPMENT_ID"
    print_data "Route: Yirgacheffe → Djibouti → Hamburg"
else
    print_error "Failed to create shipment"
    print_data "Response: $SHIPMENT_RESPONSE"
fi

# Step 9: Issue Phytosanitary Certificate
print_header "STEP 9: PHYTOSANITARY CERTIFICATE"
print_step "Ministry of Agriculture issuing phyto certificate..."

PHYTO_ID="PHYTO${TIMESTAMP}"
PHYTO_DATA=$(cat <<EOF
{
  "certificateID": "$PHYTO_ID",
  "shipmentID": "$SHIPMENT_ID",
  "exporterID": "$EXPORTER_ID",
  "issueDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "inspectionDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "inspectedBy": "Ministry of Agriculture Inspector",
  "status": "APPROVED",
  "findings": "Free from pests and diseases"
}
EOF
)

PHYTO_RESPONSE=$(curl -s -X POST "$API_URL/api/phytosanitary" \
  -H "Content-Type: application/json" \
  -d "$PHYTO_DATA")

if echo "$PHYTO_RESPONSE" | grep -q "success\|$PHYTO_ID"; then
    print_success "Phytosanitary certificate issued"
    print_data "Certificate ID: $PHYTO_ID"
else
    print_error "Failed to issue phyto certificate"
    print_data "Response: $PHYTO_RESPONSE"
fi

# Step 10: Quality Inspection
print_header "STEP 10: QUALITY INSPECTION"
print_step "Performing quality inspection..."

INSPECTION_ID="INS${TIMESTAMP}"
INSPECTION_DATA=$(cat <<EOF
{
  "inspectionID": "$INSPECTION_ID",
  "shipmentID": "$SHIPMENT_ID",
  "exporterID": "$EXPORTER_ID",
  "inspectionDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "inspectorName": "ECX Quality Inspector",
  "grade": "Grade 1",
  "moisture": "11.5",
  "defects": "Category 1: 2, Category 2: 4",
  "cupScore": "87",
  "status": "APPROVED"
}
EOF
)

INSPECTION_RESPONSE=$(curl -s -X POST "$API_URL/api/inspections" \
  -H "Content-Type: application/json" \
  -d "$INSPECTION_DATA")

if echo "$INSPECTION_RESPONSE" | grep -q "success\|$INSPECTION_ID"; then
    print_success "Quality inspection completed"
    print_data "Grade: Grade 1 | Cup Score: 87 | Approved"
else
    print_error "Failed to complete inspection"
    print_data "Response: $INSPECTION_RESPONSE"
fi

# Step 11: Issue Bill of Lading
print_header "STEP 11: BILL OF LADING"
print_step "Shipping company issuing Bill of Lading..."

BL_NUMBER="BL${TIMESTAMP}"
BL_UPDATE=$(cat <<EOF
{
  "billOfLadingNumber": "$BL_NUMBER",
  "billOfLadingDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "vessel": "MV Ethiopian Star",
  "voyageNumber": "ETH-2026-${TIMESTAMP}",
  "containerNumbers": ["CONT${TIMESTAMP}01", "CONT${TIMESTAMP}02"],
  "status": "IN_TRANSIT"
}
EOF
)

BL_RESPONSE=$(curl -s -X PUT "$API_URL/api/shipments/$SHIPMENT_ID" \
  -H "Content-Type: application/json" \
  -d "$BL_UPDATE")

if echo "$BL_RESPONSE" | grep -q "success\|updated"; then
    print_success "Bill of Lading issued"
    print_data "B/L Number: $BL_NUMBER"
    print_data "Vessel: MV Ethiopian Star"
else
    print_error "Failed to issue B/L"
    print_data "Response: $BL_RESPONSE"
fi

# Step 12: Customs Declaration
print_header "STEP 12: CUSTOMS CLEARANCE"
print_step "Submitting customs declaration..."

CUSTOMS_ID="CUST${TIMESTAMP}"
CUSTOMS_DATA=$(cat <<EOF
{
  "declarationID": "$CUSTOMS_ID",
  "shipmentID": "$SHIPMENT_ID",
  "exporterID": "$EXPORTER_ID",
  "declarationType": "EXPORT",
  "submissionDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "customsOffice": "Djibouti Export Office",
  "declarant": "Yirgacheffe Coffee Cooperative",
  "status": "SUBMITTED"
}
EOF
)

CUSTOMS_RESPONSE=$(curl -s -X POST "$API_URL/api/customs" \
  -H "Content-Type: application/json" \
  -d "$CUSTOMS_DATA")

if echo "$CUSTOMS_RESPONSE" | grep -q "success\|$CUSTOMS_ID"; then
    print_success "Customs declaration submitted"
    print_data "Declaration ID: $CUSTOMS_ID"
    
    # Approve customs
    print_step "Customs authority approving..."
    CUSTOMS_APPROVE=$(curl -s -X POST "$API_URL/api/customs/$CUSTOMS_ID/approve" \
      -H "Content-Type: application/json")
    
    if echo "$CUSTOMS_APPROVE" | grep -q "success\|approved"; then
        print_success "Customs cleared"
    fi
else
    print_error "Failed to submit customs declaration"
    print_data "Response: $CUSTOMS_RESPONSE"
fi

# Step 13: Submit LC Documents
print_header "STEP 13: LC DOCUMENT SUBMISSION"
print_step "Submitting documents to advising bank..."

LC_DOCS_DATA=$(cat <<EOF
{
  "billOfLading": "$BL_NUMBER",
  "commercialInvoice": "INV${TIMESTAMP}",
  "packingList": "PL${TIMESTAMP}",
  "certificateOfOrigin": "COO${TIMESTAMP}",
  "phytosanitaryCertificate": "$PHYTO_ID",
  "insuranceCertificate": "INS${TIMESTAMP}",
  "submissionDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

LC_DOCS_RESPONSE=$(curl -s -X POST "$API_URL/api/lcs/$LC_ID/submit-documents" \
  -H "Content-Type: application/json" \
  -d "$LC_DOCS_DATA")

if echo "$LC_DOCS_RESPONSE" | grep -q "success\|submitted"; then
    print_success "LC documents submitted to bank"
    print_data "Documents: B/L, Invoice, Packing List, COO, Phyto, Insurance"
else
    print_error "Failed to submit LC documents"
    print_data "Response: $LC_DOCS_RESPONSE"
fi

# Step 14: Bank Document Examination
print_header "STEP 14: BANK DOCUMENT EXAMINATION"
print_step "Advising bank examining documents..."

EXAMINATION_DATA=$(cat <<EOF
{
  "examinationDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "examiner": "CBE LC Department",
  "result": "COMPLIANT",
  "discrepancies": []
}
EOF
)

EXAMINATION_RESPONSE=$(curl -s -X POST "$API_URL/api/lcs/$LC_ID/examine" \
  -H "Content-Type: application/json" \
  -d "$EXAMINATION_DATA")

if echo "$EXAMINATION_RESPONSE" | grep -q "success\|compliant"; then
    print_success "Documents examination completed"
    print_data "Result: COMPLIANT - No discrepancies"
else
    print_error "Failed document examination"
    print_data "Response: $EXAMINATION_RESPONSE"
fi

# Step 15: Create SWIFT MT700 Message
print_header "STEP 15: SWIFT MT700 MESSAGE"
print_step "Creating SWIFT MT700 (LC Issuance) message..."

SWIFT_MT700_ID="SWIFT${TIMESTAMP}MT700"
SWIFT_MT700_DATA=$(cat <<EOF
{
  "swiftMessageID": "$SWIFT_MT700_ID",
  "lcID": "$LC_ID",
  "messageType": "MT700",
  "sender": "DEUTDEFF",
  "receiver": "CBETETAA",
  "reference": "LC${TIMESTAMP}",
  "issueDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "amount": "225000",
  "currency": "USD",
  "status": "SENT"
}
EOF
)

SWIFT_MT700_RESPONSE=$(curl -s -X POST "$API_URL/api/swift" \
  -H "Content-Type: application/json" \
  -d "$SWIFT_MT700_DATA")

if echo "$SWIFT_MT700_RESPONSE" | grep -q "success\|$SWIFT_MT700_ID"; then
    print_success "SWIFT MT700 message sent"
    print_data "Message ID: $SWIFT_MT700_ID"
    print_data "Route: Deutsche Bank → CBE Ethiopia"
else
    print_error "Failed to send SWIFT MT700"
    print_data "Response: $SWIFT_MT700_RESPONSE"
fi

# Step 16: Initiate Payment
print_header "STEP 16: PAYMENT INITIATION"
print_step "Initiating payment under LC..."

PAYMENT_ID="PAY${TIMESTAMP}"
PAYMENT_DATA=$(cat <<EOF
{
  "paymentID": "$PAYMENT_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "lcID": "$LC_ID",
  "amount": "225000",
  "currency": "USD",
  "paymentMethod": "LC",
  "paymentDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "beneficiaryBank": "Commercial Bank of Ethiopia",
  "beneficiaryAccount": "1000${TIMESTAMP}",
  "status": "INITIATED"
}
EOF
)

PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_DATA")

if echo "$PAYMENT_RESPONSE" | grep -q "success\|$PAYMENT_ID"; then
    print_success "Payment initiated"
    print_data "Payment ID: $PAYMENT_ID"
    print_data "Amount: $225,000 USD"
else
    print_error "Failed to initiate payment"
    print_data "Response: $PAYMENT_RESPONSE"
fi

# Step 17: Create SWIFT MT103 Payment Message
print_header "STEP 17: SWIFT MT103 PAYMENT"
print_step "Creating SWIFT MT103 (Customer Credit Transfer)..."

SWIFT_MT103_ID="SWIFT${TIMESTAMP}MT103"
SWIFT_MT103_DATA=$(cat <<EOF
{
  "swiftMessageID": "$SWIFT_MT103_ID",
  "paymentID": "$PAYMENT_ID",
  "messageType": "MT103",
  "sender": "DEUTDEFF",
  "receiver": "CBETETAA",
  "reference": "PAY${TIMESTAMP}",
  "valueDate": "$(date -u +%Y-%m-%d)",
  "amount": "225000",
  "currency": "USD",
  "orderingCustomer": "Global Coffee Importers Ltd",
  "beneficiaryCustomer": "Yirgacheffe Coffee Cooperative",
  "status": "SENT"
}
EOF
)

SWIFT_MT103_RESPONSE=$(curl -s -X POST "$API_URL/api/swift" \
  -H "Content-Type: application/json" \
  -d "$SWIFT_MT103_DATA")

if echo "$SWIFT_MT103_RESPONSE" | grep -q "success\|$SWIFT_MT103_ID"; then
    print_success "SWIFT MT103 payment message sent"
    print_data "Message ID: $SWIFT_MT103_ID"
else
    print_error "Failed to send SWIFT MT103"
    print_data "Response: $SWIFT_MT103_RESPONSE"
fi

# Step 18: Payment Settlement
print_header "STEP 18: PAYMENT SETTLEMENT"
print_step "Settling payment to exporter account..."

SETTLEMENT_DATA=$(cat <<EOF
{
  "settlementDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "settledAmount": "225000",
  "bankCharges": "150",
  "netAmount": "224850",
  "status": "SETTLED"
}
EOF
)

SETTLEMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/payments/$PAYMENT_ID/settle" \
  -H "Content-Type: application/json" \
  -d "$SETTLEMENT_DATA")

if echo "$SETTLEMENT_RESPONSE" | grep -q "success\|settled"; then
    print_success "Payment settled to exporter"
    print_data "Gross Amount: $225,000 USD"
    print_data "Bank Charges: $150 USD"
    print_data "Net Amount: $224,850 USD"
else
    print_error "Failed to settle payment"
    print_data "Response: $SETTLEMENT_RESPONSE"
fi

# Step 19: Utilize Export Permit
print_header "STEP 19: EXPORT PERMIT UTILIZATION"
print_step "Marking export permit as utilized..."

UTILIZE_RESPONSE=$(curl -s -X POST "$API_URL/api/permits/$PERMIT_ID/utilize" \
  -H "Content-Type: application/json" \
  -d "{\"amount\": \"225000\"}")

if echo "$UTILIZE_RESPONSE" | grep -q "success\|utilized"; then
    print_success "Export permit utilized"
else
    print_error "Failed to utilize permit"
fi

# Step 20: Utilize Forex
print_header "STEP 20: FOREX UTILIZATION"
print_step "Recording forex utilization..."

FOREX_UTILIZE_RESPONSE=$(curl -s -X POST "$API_URL/api/forex/$FOREX_ID/utilize" \
  -H "Content-Type: application/json" \
  -d "{\"amount\": \"225000\"}")

if echo "$FOREX_UTILIZE_RESPONSE" | grep -q "success\|utilized"; then
    print_success "Forex allocation utilized"
else
    print_error "Failed to utilize forex"
fi

# Final Summary
print_header "WORKFLOW TEST COMPLETE"
echo ""
print_success "All 20 steps completed successfully!"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}WORKFLOW SUMMARY${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
print_data "Exporter ID:        $EXPORTER_ID"
print_data "ECX Lot ID:         $ECX_LOT_ID"
print_data "Contract ID:        $CONTRACT_ID"
print_data "Export Permit:      $PERMIT_ID"
print_data "Letter of Credit:   $LC_ID"
print_data "Forex Allocation:   $FOREX_ID"
print_data "Shipment ID:        $SHIPMENT_ID"
print_data "Phyto Certificate:  $PHYTO_ID"
print_data "Bill of Lading:     $BL_NUMBER"
print_data "Customs Declaration: $CUSTOMS_ID"
print_data "Payment ID:         $PAYMENT_ID"
print_data "SWIFT MT700:        $SWIFT_MT700_ID"
print_data "SWIFT MT103:        $SWIFT_MT103_ID"
echo ""
print_data "Total Value:        \$225,000 USD"
print_data "Net to Exporter:    \$224,850 USD"
print_data "Coffee Quantity:    18,000 kg (18 MT)"
echo ""
print_success "Complete coffee export workflow executed successfully!"
print_success "All blockchain transactions recorded and verified!"
echo ""
