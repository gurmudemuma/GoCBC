#!/bin/bash
# CECBS Detailed End-to-End Workflow Test
# Tests all portals and complete coffee export workflow from application to payment

API="http://localhost:3001/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result tracker
test_result() {
    local test_name=$1
    local success=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✓ $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     CECBS DETAILED END-TO-END WORKFLOW TEST           ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PHASE 1: AUTHENTICATION - All Portal Users
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 1] AUTHENTICATION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Admin
ADMIN_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "Admin login" "$([[ -n "$ADMIN_TOKEN" ]] && echo true || echo false)"

# ECTA Admin
ECTA_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"ectaAdmin","password":"password123"}')
ECTA_TOKEN=$(echo "$ECTA_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "ECTA Admin login" "$([[ -n "$ECTA_TOKEN" ]] && echo true || echo false)"

# ECX Admin
ECX_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"ecxAdmin","password":"password123"}')
ECX_TOKEN=$(echo "$ECX_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "ECX Admin login" "$([[ -n "$ECX_TOKEN" ]] && echo true || echo false)"

# NBE Admin
NBE_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"nbeAdmin","password":"password123"}')
NBE_TOKEN=$(echo "$NBE_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "NBE Admin login" "$([[ -n "$NBE_TOKEN" ]] && echo true || echo false)"

# Bank Admin
BANK_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"bankAdmin","password":"password123"}')
BANK_TOKEN=$(echo "$BANK_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "Bank Admin login" "$([[ -n "$BANK_TOKEN" ]] && echo true || echo false)"

# Customs Admin
CUSTOMS_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"customsAdmin","password":"password123"}')
CUSTOMS_TOKEN=$(echo "$CUSTOMS_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "Customs Admin login" "$([[ -n "$CUSTOMS_TOKEN" ]] && echo true || echo false)"

# Shipping Admin
SHIPPING_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"shippingAdmin","password":"password123"}')
SHIPPING_TOKEN=$(echo "$SHIPPING_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "Shipping Admin login" "$([[ -n "$SHIPPING_TOKEN" ]] && echo true || echo false)"

# Test Exporter
EXPORTER_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"testexporter","password":"password123"}')
EXPORTER_TOKEN=$(echo "$EXPORTER_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "Test Exporter login" "$([[ -n "$EXPORTER_TOKEN" ]] && echo true || echo false)"

echo ""
# ============================================================================
# PHASE 2: EXPORTER APPLICATION WORKFLOW
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 2] EXPORTER APPLICATION WORKFLOW${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate unique IDs
TIMESTAMP=$(date +%s)
APP_ID="APP-TEST-${TIMESTAMP}"
TEST_EMAIL="exporter${TIMESTAMP}@test.com"

# Submit exporter application
echo -e "${CYAN}→ Submitting exporter application...${NC}"
APP_RESULT=$(curl -s -X POST "$API/exporters/exporter-applications" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Premium Coffee Exports Ltd",
    "tinNumber": "TIN-'$TIMESTAMP'",
    "businessLicenseNumber": "BL-'$TIMESTAMP'",
    "capitalRequirement": "5000000",
    "professionalTaster": "yes",
    "tasterCertificate": "CERT-'$TIMESTAMP'",
    "contactPerson": "John Doe",
    "email": "'$TEST_EMAIL'",
    "phone": "+251911234567",
    "address": "Bole Road, Addis Ababa",
    "city": "Addis Ababa",
    "region": "Addis Ababa",
    "exporterType": "company",
    "laboratoryFacility": "yes",
    "laboratoryCertificateNumber": "LAB-'$TIMESTAMP'"
  }')

APP_ID_CREATED=$(echo "$APP_RESULT" | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)
APP_SUCCESS=$(echo "$APP_RESULT" | grep -o '"success":true' | wc -l)
test_result "Submit exporter application" "$([[ $APP_SUCCESS -eq 1 && -n "$APP_ID_CREATED" ]] && echo true || echo false)"
echo -e "  ${BLUE}Application ID: $APP_ID_CREATED${NC}"

# ECTA views pending applications
echo -e "${CYAN}→ ECTA viewing pending applications...${NC}"
PENDING_APPS=$(curl -s -X GET "$API/exporters/exporter-applications?status=pending" \
  -H "Authorization: Bearer $ECTA_TOKEN")
PENDING_COUNT=$(echo "$PENDING_APPS" | grep -o '"applicationId"' | wc -l)
test_result "ECTA view pending applications" "$([[ $PENDING_COUNT -gt 0 ]] && echo true || echo false)"

# ECTA approves application
EXP_ID="EXP$(echo $TIMESTAMP | cut -c5-11)"
LICENSE_NUM="ECTA-${TIMESTAMP}"
LICENSE_EXPIRY=$(date -d '+1 year' +%Y-%m-%d 2>/dev/null || date -v+1y +%Y-%m-%d 2>/dev/null || echo "2027-12-31")

echo -e "${CYAN}→ ECTA approving application (Blockchain Registration)...${NC}"
APPROVE_RESULT=$(curl -s -X POST "$API/exporters/exporter-applications/$APP_ID_CREATED/approve" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "'$EXP_ID'",
    "ectaLicenseNumber": "'$LICENSE_NUM'",
    "licenseExpiryDate": "'$LICENSE_EXPIRY'",
    "bankName": "Commercial Bank of Ethiopia",
    "bankAccountNumber": "1000'$TIMESTAMP'",
    "bankBranch": "Addis Ababa Main Branch",
    "bankBranchCode": "001"
  }')

APPROVE_SUCCESS=$(echo "$APPROVE_RESULT" | grep -o '"success":true' | wc -l)
BLOCKCHAIN_TX=$(echo "$APPROVE_RESULT" | grep -o '"txId":"[^"]*"' | cut -d'"' -f4)
test_result "ECTA approve application (Blockchain)" "$([[ $APPROVE_SUCCESS -eq 1 ]] && echo true || echo false)"
if [ -n "$BLOCKCHAIN_TX" ]; then
    echo -e "  ${BLUE}Blockchain TX: $BLOCKCHAIN_TX${NC}"
fi
echo -e "  ${BLUE}Exporter ID: $EXP_ID${NC}"
echo -e "  ${BLUE}License: $LICENSE_NUM${NC}"

# Verify exporter account created
echo -e "${CYAN}→ Verifying exporter account creation...${NC}"
NEW_EXPORTER_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"'$EXP_ID'","password":"'$EXP_ID'@"}')
NEW_EXPORTER_TOKEN=$(echo "$NEW_EXPORTER_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
test_result "New exporter account login" "$([[ -n "$NEW_EXPORTER_TOKEN" ]] && echo true || echo false)"

echo ""

# ============================================================================
# PHASE 3: SALES CONTRACT WORKFLOW
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 3] SALES CONTRACT WORKFLOW${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CONTRACT_ID="SC${TIMESTAMP}"
BUYER_ID="BUYER-US-001"
QUANTITY=20000
PRICE_PER_KG=7.25
TOTAL_VALUE=$(echo "$QUANTITY * $PRICE_PER_KG" | bc)

# Exporter creates sales contract
echo -e "${CYAN}→ Exporter creating sales contract...${NC}"
CONTRACT_RESULT=$(curl -s -X POST "$API/contracts" \
  -H "Authorization: Bearer $NEW_EXPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractID": "'$CONTRACT_ID'",
    "exporterID": "'$EXP_ID'",
    "buyerID": "'$BUYER_ID'",
    "buyerName": "American Coffee Importers Inc",
    "buyerCountry": "USA",
    "buyerBank": "JP Morgan Chase Bank",
    "exporterBank": "Commercial Bank of Ethiopia",
    "coffeeType": "Yirgacheffe Grade 1",
    "quantity": '$QUANTITY',
    "pricePerKg": '$PRICE_PER_KG',
    "currency": "USD",
    "paymentTerms": "L/C at sight",
    "deliveryTerms": "FOB Djibouti",
    "contractDate": "'$(date +%Y-%m-%d)'",
    "eudrRequired": true
  }')

CONTRACT_SUCCESS=$(echo "$CONTRACT_RESULT" | grep -o '"success":true' | wc -l)
test_result "Create sales contract" "$([[ $CONTRACT_SUCCESS -eq 1 ]] && echo true || echo false)"
echo -e "  ${BLUE}Contract: $CONTRACT_ID${NC}"
echo -e "  ${BLUE}Quantity: $QUANTITY kg${NC}"
echo -e "  ${BLUE}Value: \$$TOTAL_VALUE USD${NC}"

# ECTA approves contract
echo -e "${CYAN}→ ECTA approving contract...${NC}"
sleep 1
APPROVE_CONTRACT=$(curl -s -X POST "$API/contracts/$CONTRACT_ID/approve" \
  -H "Authorization: Bearer $ECTA_TOKEN")
APPROVE_CONTRACT_SUCCESS=$(echo "$APPROVE_CONTRACT" | grep -o '"success":true' | wc -l)
test_result "ECTA approve contract" "$([[ $APPROVE_CONTRACT_SUCCESS -eq 1 ]] && echo true || echo false)"

# ECX views contract for market oversight
echo -e "${CYAN}→ ECX viewing contract for market oversight...${NC}"
ECX_CONTRACTS=$(curl -s -X GET "$API/contracts?status=approved" \
  -H "Authorization: Bearer $ECX_TOKEN")
ECX_VIEW_SUCCESS=$(echo "$ECX_CONTRACTS" | grep -o "$CONTRACT_ID" | wc -l)
test_result "ECX view approved contracts" "$([[ $ECX_VIEW_SUCCESS -gt 0 ]] && echo true || echo false)"

echo ""

# ============================================================================
# PHASE 4: LETTER OF CREDIT WORKFLOW
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 4] LETTER OF CREDIT WORKFLOW${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LC_NUMBER="LC${TIMESTAMP}"

# Exporter requests LC
echo -e "${CYAN}→ Exporter requesting Letter of Credit...${NC}"
LC_REQUEST=$(curl -s -X POST "$API/banking/lc" \
  -H "Authorization: Bearer $NEW_EXPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lcNumber": "'$LC_NUMBER'",
    "contractID": "'$CONTRACT_ID'",
    "exporterID": "'$EXP_ID'",
    "issuingBank": "JP Morgan Chase Bank",
    "advisingBank": "Commercial Bank of Ethiopia",
    "amount": '$TOTAL_VALUE',
    "currency": "USD",
    "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d 2>/dev/null || date -v+90d +%Y-%m-%d 2>/dev/null || echo "2027-12-31")'",
    "paymentTerms": "At sight",
    "documents": ["Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin", "ICO Certificate"]
  }')

LC_SUCCESS=$(echo "$LC_REQUEST" | grep -o '"success":true' | wc -l)
test_result "Request Letter of Credit" "$([[ $LC_SUCCESS -eq 1 ]] && echo true || echo false)"
echo -e "  ${BLUE}LC Number: $LC_NUMBER${NC}"

# Bank views pending LCs
echo -e "${CYAN}→ Bank viewing pending LCs...${NC}"
BANK_LCS=$(curl -s -X GET "$API/banking/lc?status=pending" \
  -H "Authorization: Bearer $BANK_TOKEN")
BANK_VIEW_SUCCESS=$(echo "$BANK_LCS" | grep -o "$LC_NUMBER" | wc -l)
test_result "Bank view pending LCs" "$([[ $BANK_VIEW_SUCCESS -gt 0 ]] && echo true || echo false)"

# Bank approves LC
echo -e "${CYAN}→ Bank approving LC...${NC}"
BANK_APPROVE=$(curl -s -X POST "$API/banking/lc/$LC_NUMBER/approve" \
  -H "Authorization: Bearer $BANK_TOKEN")
BANK_APPROVE_SUCCESS=$(echo "$BANK_APPROVE" | grep -o '"success":true' | wc -l)
test_result "Bank approve LC" "$([[ $BANK_APPROVE_SUCCESS -eq 1 ]] && echo true || echo false)"

# NBE views LC for forex allocation
echo -e "${CYAN}→ NBE viewing LC for forex allocation...${NC}"
NBE_LCS=$(curl -s -X GET "$API/banking/lc?status=approved" \
  -H "Authorization: Bearer $NBE_TOKEN")
NBE_VIEW_SUCCESS=$(echo "$NBE_LCS" | grep -o "$LC_NUMBER" | wc -l)
test_result "NBE view approved LCs" "$([[ $NBE_VIEW_SUCCESS -gt 0 ]] && echo true || echo false)"

echo ""

# ============================================================================
# PHASE 5: QUALITY CONTROL & CERTIFICATION
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 5] QUALITY CONTROL & CERTIFICATION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

QUALITY_ID="QC${TIMESTAMP}"

# Exporter requests quality inspection
echo -e "${CYAN}→ Exporter requesting quality inspection...${NC}"
QUALITY_REQUEST=$(curl -s -X POST "$API/quality/inspections" \
  -H "Authorization: Bearer $NEW_EXPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionID": "'$QUALITY_ID'",
    "exporterID": "'$EXP_ID'",
    "contractID": "'$CONTRACT_ID'",
    "coffeeType": "Yirgacheffe Grade 1",
    "quantity": '$QUANTITY',
    "sampleSize": 1000,
    "requestedDate": "'$(date +%Y-%m-%d)'"
  }')

QUALITY_SUCCESS=$(echo "$QUALITY_REQUEST" | grep -o '"success":true' | wc -l)
test_result "Request quality inspection" "$([[ $QUALITY_SUCCESS -eq 1 ]] && echo true || echo false)"

# ECTA performs quality inspection
echo -e "${CYAN}→ ECTA performing quality inspection...${NC}"
QUALITY_RESULT=$(curl -s -X POST "$API/quality/inspections/$QUALITY_ID/complete" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "Grade 1",
    "cupQuality": "Excellent",
    "moistureContent": 11.5,
    "defectCount": 2,
    "screenSize": 15,
    "passed": true,
    "certificationNumber": "QC-'$TIMESTAMP'",
    "inspectorName": "ECTA Inspector",
    "remarks": "Premium quality Yirgacheffe coffee"
  }')

QUALITY_COMPLETE=$(echo "$QUALITY_RESULT" | grep -o '"success":true' | wc -l)
test_result "ECTA complete quality inspection" "$([[ $QUALITY_COMPLETE -eq 1 ]] && echo true || echo false)"

echo ""

# ============================================================================
# PHASE 6: SHIPMENT & LOGISTICS
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 6] SHIPMENT & LOGISTICS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SHIPMENT_ID="SHIP${TIMESTAMP}"
ICO_NUMBER="ICO-${TIMESTAMP}"

# Exporter creates shipment
echo -e "${CYAN}→ Exporter creating shipment...${NC}"
SHIPMENT_RESULT=$(curl -s -X POST "$API/shipments" \
  -H "Authorization: Bearer $NEW_EXPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentID": "'$SHIPMENT_ID'",
    "contractID": "'$CONTRACT_ID'",
    "exporterID": "'$EXP_ID'",
    "buyerID": "'$BUYER_ID'",
    "origin": "Yirgacheffe, Ethiopia",
    "destination": "New York, USA",
    "quantity": '$QUANTITY',
    "grade": "Grade 1",
    "icoNumber": "'$ICO_NUMBER'",
    "channel": "SEA",
    "forexRate": 57.50,
    "valueUSD": '$TOTAL_VALUE',
    "containerNumber": "CONT'$TIMESTAMP'",
    "vesselName": "MSC Mediterranean",
    "portOfLoading": "Djibouti",
    "portOfDischarge": "New York",
    "eudrCompliant": true
  }')

SHIPMENT_SUCCESS=$(echo "$SHIPMENT_RESULT" | grep -o '"success":true' | wc -l)
test_result "Create shipment" "$([[ $SHIPMENT_SUCCESS -eq 1 ]] && echo true || echo false)"
echo -e "  ${BLUE}Shipment: $SHIPMENT_ID${NC}"

# Customs views shipment for clearance
echo -e "${CYAN}→ Customs viewing shipment for clearance...${NC}"
CUSTOMS_SHIPMENTS=$(curl -s -X GET "$API/shipments/$SHIPMENT_ID" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN")
CUSTOMS_VIEW=$(echo "$CUSTOMS_SHIPMENTS" | grep -o "$SHIPMENT_ID" | wc -l)
test_result "Customs view shipment" "$([[ $CUSTOMS_VIEW -gt 0 ]] && echo true || echo false)"

# Customs performs risk assessment
echo -e "${CYAN}→ Customs performing risk assessment...${NC}"
CUSTOMS_RISK=$(curl -s -X POST "$API/customs/risk-assessment" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentID": "'$SHIPMENT_ID'",
    "exporterID": "'$EXP_ID'",
    "riskFactors": {
      "documentCompleteness": "complete",
      "priceVariance": "normal",
      "exporterHistory": "clean",
      "destinationRisk": "low"
    },
    "riskLevel": "LOW",
    "inspectionRequired": false
  }')

CUSTOMS_SUCCESS=$(echo "$CUSTOMS_RISK" | grep -o '"success":true' | wc -l)
test_result "Customs risk assessment" "$([[ $CUSTOMS_SUCCESS -eq 1 ]] && echo true || echo false)"

# Customs clears shipment
echo -e "${CYAN}→ Customs clearing shipment...${NC}"
CUSTOMS_CLEAR=$(curl -s -X POST "$API/customs/clearance" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentID": "'$SHIPMENT_ID'",
    "clearanceNumber": "CLR-'$TIMESTAMP'",
    "status": "cleared",
    "clearedBy": "Customs Officer",
    "clearedDate": "'$(date +%Y-%m-%d)'"
  }')

CUSTOMS_CLEAR_SUCCESS=$(echo "$CUSTOMS_CLEAR" | grep -o '"success":true' | wc -l)
test_result "Customs clear shipment" "$([[ $CUSTOMS_CLEAR_SUCCESS -eq 1 ]] && echo true || echo false)"

# Shipping company updates shipment status
echo -e "${CYAN}→ Shipping company updating shipment status...${NC}"
SHIPPING_UPDATE=$(curl -s -X POST "$API/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_TRANSIT",
    "location": "Red Sea",
    "updatedBy": "Shipping Coordinator"
  }')

SHIPPING_SUCCESS=$(echo "$SHIPPING_UPDATE" | grep -o '"success":true' | wc -l)
test_result "Shipping update status" "$([[ $SHIPPING_SUCCESS -eq 1 ]] && echo true || echo false)"

echo ""
# ============================================================================
# PHASE 7: DOCUMENT MANAGEMENT
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 7] DOCUMENT MANAGEMENT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DOC_ID="DOC${TIMESTAMP}"

# Exporter uploads export documents
echo -e "${CYAN}→ Exporter uploading export documents...${NC}"
DOC_UPLOAD=$(curl -s -X POST "$API/documents" \
  -H "Authorization: Bearer $NEW_EXPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentID": "'$DOC_ID'",
    "shipmentID": "'$SHIPMENT_ID'",
    "contractID": "'$CONTRACT_ID'",
    "documentType": "COMMERCIAL_INVOICE",
    "fileName": "commercial_invoice_'$TIMESTAMP'.pdf",
    "fileHash": "sha256-'$TIMESTAMP'",
    "ipfsCID": "Qm'$TIMESTAMP'",
    "uploadedBy": "'$EXP_ID'"
  }')

DOC_SUCCESS=$(echo "$DOC_UPLOAD" | grep -o '"success":true' | wc -l)
test_result "Upload export document" "$([[ $DOC_SUCCESS -eq 1 ]] && echo true || echo false)"

# Bank verifies documents
echo -e "${CYAN}→ Bank verifying documents...${NC}"
DOC_VERIFY=$(curl -s -X POST "$API/documents/$DOC_ID/verify" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verified": true,
    "verifiedBy": "Bank Document Officer",
    "remarks": "All documents in order"
  }')

DOC_VERIFY_SUCCESS=$(echo "$DOC_VERIFY" | grep -o '"success":true' | wc -l)
test_result "Bank verify documents" "$([[ $DOC_VERIFY_SUCCESS -eq 1 ]] && echo true || echo false)"

echo ""

# ============================================================================
# PHASE 8: PAYMENT PROCESSING
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 8] PAYMENT PROCESSING${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PAYMENT_ID="PAY${TIMESTAMP}"

# Bank processes payment
echo -e "${CYAN}→ Bank processing payment...${NC}"
PAYMENT_PROCESS=$(curl -s -X POST "$API/payments" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentID": "'$PAYMENT_ID'",
    "lcNumber": "'$LC_NUMBER'",
    "contractID": "'$CONTRACT_ID'",
    "exporterID": "'$EXP_ID'",
    "amount": '$TOTAL_VALUE',
    "currency": "USD",
    "paymentMethod": "LC",
    "paymentDate": "'$(date +%Y-%m-%d)'"
  }')

PAYMENT_SUCCESS=$(echo "$PAYMENT_PROCESS" | grep -o '"success":true' | wc -l)
test_result "Process payment" "$([[ $PAYMENT_SUCCESS -eq 1 ]] && echo true || echo false)"
echo -e "  ${BLUE}Payment: $PAYMENT_ID${NC}"
echo -e "  ${BLUE}Amount: \$$TOTAL_VALUE USD${NC}"

# NBE tracks forex transaction
echo -e "${CYAN}→ NBE tracking forex transaction...${NC}"
NBE_FOREX=$(curl -s -X GET "$API/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $NBE_TOKEN")
NBE_TRACK=$(echo "$NBE_FOREX" | grep -o "$PAYMENT_ID" | wc -l)
test_result "NBE track forex transaction" "$([[ $NBE_TRACK -gt 0 ]] && echo true || echo false)"

# Exporter views payment confirmation
echo -e "${CYAN}→ Exporter viewing payment confirmation...${NC}"
EXPORTER_PAYMENT=$(curl -s -X GET "$API/payments?exporterID=$EXP_ID" \
  -H "Authorization: Bearer $NEW_EXPORTER_TOKEN")
EXPORTER_VIEW=$(echo "$EXPORTER_PAYMENT" | grep -o "$PAYMENT_ID" | wc -l)
test_result "Exporter view payment" "$([[ $EXPORTER_VIEW -gt 0 ]] && echo true || echo false)"

echo ""

# ============================================================================
# PHASE 9: BLOCKCHAIN VERIFICATION
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 9] BLOCKCHAIN VERIFICATION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Query exporter on blockchain
echo -e "${CYAN}→ Querying exporter on blockchain...${NC}"
BC_EXPORTER=$(curl -s -X GET "$API/blockchain/exporters/$EXP_ID" \
  -H "Authorization: Bearer $ECTA_TOKEN")
BC_EXP_SUCCESS=$(echo "$BC_EXPORTER" | grep -o "$EXP_ID" | wc -l)
test_result "Query exporter on blockchain" "$([[ $BC_EXP_SUCCESS -gt 0 ]] && echo true || echo false)"

# Query contract on blockchain
echo -e "${CYAN}→ Querying contract on blockchain...${NC}"
BC_CONTRACT=$(curl -s -X GET "$API/blockchain/contracts/$CONTRACT_ID" \
  -H "Authorization: Bearer $ECTA_TOKEN")
BC_CONTRACT_SUCCESS=$(echo "$BC_CONTRACT" | grep -o "$CONTRACT_ID" | wc -l)
test_result "Query contract on blockchain" "$([[ $BC_CONTRACT_SUCCESS -gt 0 ]] && echo true || echo false)"

# Query shipment on blockchain
echo -e "${CYAN}→ Querying shipment on blockchain...${NC}"
BC_SHIPMENT=$(curl -s -X GET "$API/blockchain/shipments/$SHIPMENT_ID" \
  -H "Authorization: Bearer $ECTA_TOKEN")
BC_SHIPMENT_SUCCESS=$(echo "$BC_SHIPMENT" | grep -o "$SHIPMENT_ID" | wc -l)
test_result "Query shipment on blockchain" "$([[ $BC_SHIPMENT_SUCCESS -gt 0 ]] && echo true || echo false)"

# Verify data integrity
echo -e "${CYAN}→ Verifying blockchain data integrity...${NC}"
BC_AUDIT=$(curl -s -X POST "$API/blockchain/audit" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "shipment",
    "entityID": "'$SHIPMENT_ID'"
  }')

BC_AUDIT_SUCCESS=$(echo "$BC_AUDIT" | grep -o '"success":true' | wc -l)
test_result "Blockchain data integrity check" "$([[ $BC_AUDIT_SUCCESS -eq 1 ]] && echo true || echo false)"

echo ""
# ============================================================================
# PHASE 10: ANALYTICS & REPORTING
# ============================================================================
echo -e "${BOLD}${MAGENTA}[PHASE 10] ANALYTICS & REPORTING${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Admin views system analytics
echo -e "${CYAN}→ Admin viewing system analytics...${NC}"
ADMIN_ANALYTICS=$(curl -s -X GET "$API/analytics/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
ANALYTICS_SUCCESS=$(echo "$ADMIN_ANALYTICS" | grep -o '"success":true' | wc -l)
test_result "Admin view analytics" "$([[ $ANALYTICS_SUCCESS -eq 1 ]] && echo true || echo false)"

# ECTA views export statistics
echo -e "${CYAN}→ ECTA viewing export statistics...${NC}"
ECTA_STATS=$(curl -s -X GET "$API/analytics/exports?period=month" \
  -H "Authorization: Bearer $ECTA_TOKEN")
ECTA_STATS_SUCCESS=$(echo "$ECTA_STATS" | grep -o '"success":true' | wc -l)
test_result "ECTA view export statistics" "$([[ $ECTA_STATS_SUCCESS -eq 1 ]] && echo true || echo false)"

# NBE views forex statistics
echo -e "${CYAN}→ NBE viewing forex statistics...${NC}"
NBE_STATS=$(curl -s -X GET "$API/analytics/forex?period=month" \
  -H "Authorization: Bearer $NBE_TOKEN")
NBE_STATS_SUCCESS=$(echo "$NBE_STATS" | grep -o '"success":true' | wc -l)
test_result "NBE view forex statistics" "$([[ $NBE_STATS_SUCCESS -eq 1 ]] && echo true || echo false)"

# ECX views market analytics
echo -e "${CYAN}→ ECX viewing market analytics...${NC}"
ECX_MARKET=$(curl -s -X GET "$API/analytics/market" \
  -H "Authorization: Bearer $ECX_TOKEN")
ECX_MARKET_SUCCESS=$(echo "$ECX_MARKET" | grep -o '"success":true' | wc -l)
test_result "ECX view market analytics" "$([[ $ECX_MARKET_SUCCESS -eq 1 ]] && echo true || echo false)"

# Generate audit report
echo -e "${CYAN}→ Generating audit report...${NC}"
AUDIT_REPORT=$(curl -s -X POST "$API/audit/generate-report" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "complete_workflow",
    "entityID": "'$SHIPMENT_ID'",
    "startDate": "'$(date +%Y-%m-01)'",
    "endDate": "'$(date +%Y-%m-%d)'"
  }')

AUDIT_SUCCESS=$(echo "$AUDIT_REPORT" | grep -o '"success":true' | wc -l)
test_result "Generate audit report" "$([[ $AUDIT_SUCCESS -eq 1 ]] && echo true || echo false)"

echo ""
# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                  TEST SUMMARY                          ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo -e "${BOLD}Total Tests:${NC}    $TOTAL_TESTS"
echo -e "${BOLD}${GREEN}Passed:${NC}         $PASSED_TESTS"
echo -e "${BOLD}${RED}Failed:${NC}         $FAILED_TESTS"
echo -e "${BOLD}Pass Rate:${NC}      ${PASS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${BOLD}${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Complete Workflow Entities Created:${NC}"
    echo -e "  ${BLUE}• Application:${NC}    $APP_ID_CREATED"
    echo -e "  ${BLUE}• Exporter:${NC}       $EXP_ID"
    echo -e "  ${BLUE}• License:${NC}        $LICENSE_NUM"
    echo -e "  ${BLUE}• Contract:${NC}       $CONTRACT_ID"
    echo -e "  ${BLUE}• LC Number:${NC}      $LC_NUMBER"
    echo -e "  ${BLUE}• Quality ID:${NC}     $QUALITY_ID"
    echo -e "  ${BLUE}• Shipment:${NC}       $SHIPMENT_ID"
    echo -e "  ${BLUE}• ICO Number:${NC}     $ICO_NUMBER"
    echo -e "  ${BLUE}• Document:${NC}       $DOC_ID"
    echo -e "  ${BLUE}• Payment:${NC}        $PAYMENT_ID"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}${GREEN}🎉 CECBS system is fully operational!${NC}"
    echo ""
    echo -e "${BOLD}Verified Workflows:${NC}"
    echo -e "  ✓ Multi-portal authentication (8 portals)"
    echo -e "  ✓ Exporter application & approval"
    echo -e "  ✓ Sales contract registration & approval"
    echo -e "  ✓ Letter of Credit processing"
    echo -e "  ✓ Quality control & certification"
    echo -e "  ✓ Shipment creation & tracking"
    echo -e "  ✓ Customs clearance & risk assessment"
    echo -e "  ✓ Document management & verification"
    echo -e "  ✓ Payment processing & forex tracking"
    echo -e "  ✓ Blockchain data integrity"
    echo -e "  ✓ Analytics & reporting"
    echo ""
    exit 0
else
    echo -e "${BOLD}${RED}⚠ SOME TESTS FAILED${NC}"
    echo ""
    echo -e "${YELLOW}Review the failed tests above for details.${NC}"
    echo ""
    exit 1
fi
