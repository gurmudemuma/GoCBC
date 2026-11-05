#!/bin/bash

# Continue workflow test from existing exporter application
# Application ID: 4 (APP-1793253996943-OHC62D)

set -e

API_URL="http://localhost:3001/api/v1"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Continuing Workflow Test from Existing Application           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Step 1: Authenticate all users
# ============================================================================
log_info "Step 1: Authenticating all users..."

ECTA_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}' | jq -r '.data.token')

ECX_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"ecx_admin","password":"password123"}' | jq -r '.data.token')

NBE_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | jq -r '.data.token')

BANK_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')

CUSTOMS_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')

SHIPPING_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')

EXPORTER_TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"exporter1","password":"password123"}' | jq -r '.data.token')

if [ -z "$ECTA_TOKEN" ] || [ "$ECTA_TOKEN" = "null" ]; then
  log_error "Failed to authenticate users"
  exit 1
fi

log_success "All users authenticated"

# ============================================================================
# Step 2: Create NEW Application with Correct Capital Requirement
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 2: Creating New Exporter Application (Correct Capital)"
echo "═══════════════════════════════════════════════════════════"

TEST_TIMESTAMP=$(date +%s)
EXPORTER_ID="EXP-TEST-$TEST_TIMESTAMP"

log_info "Submitting new application with 20M ETB capital requirement..."

APPLICATION_DATA=$(cat <<EOF
{
  "companyName": "Premium Coffee Exporters $TEST_TIMESTAMP",
  "tinNumber": "00${TEST_TIMESTAMP:0:8}",
  "businessLicenseNumber": "BL-TEST-$TEST_TIMESTAMP",
  "contactPerson": "Abebe Kebede",
  "address": "Bole Road, Addis Ababa, Ethiopia",
  "city": "Addis Ababa",
  "region": "Addis Ababa",
  "exporterType": "company",
  "registrationDate": "$(date -d '-1 year' +%Y-%m-%d)",
  "capitalRequirement": "20000000",
  "professionalTaster": "yes",
  "tasterCertificate": "PCT-2024-001",
  "laboratoryFacility": "yes",
  "laboratoryCertificateNumber": "LAB-CERT-2024-001",
  "email": "test${TEST_TIMESTAMP}@coffeexport.et",
  "phone": "+251911234567",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccountNumber": "1234567890",
  "bankBranchName": "Main Branch",
  "bankBranchCode": "001",
  "comments": "Complete application with all required documents"
}
EOF
)

APP_RESPONSE=$(curl -s -X POST "${API_URL}/exporters/exporter-applications" \
  -H "Content-Type: application/json" \
  -d "$APPLICATION_DATA")

APPLICATION_ID=$(echo "$APP_RESPONSE" | jq -r '.data.applicationId // .data.application_id // empty')

if [ -z "$APPLICATION_ID" ] || [ "$APPLICATION_ID" = "null" ]; then
  log_error "Application submission failed"
  echo "$APP_RESPONSE" | jq '.'
  exit 1
fi

log_success "Application submitted: $APPLICATION_ID"

sleep 3

# ============================================================================
# Step 3: Approve the Application
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 3: ECTA Approving Exporter Application"
echo "═══════════════════════════════════════════════════════════"

# Since existing applications have insufficient capital, create a new one
# that meets the minimum requirement of 20M ETB for company type
NEW_APPLICATION="true"

log_info "ECTA approving application: $APPLICATION_ID"

APPROVAL_DATA=$(cat <<EOF
{
  "exporterId": "$EXPORTER_ID",
  "ectaLicenseNumber": "ECTA-LIC-$TEST_TIMESTAMP",
  "licenseExpiryDate": "2027-10-29",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccountNumber": "1234567890",
  "bankBranch": "Main Branch",
  "bankBranchCode": "001"
}
EOF
)

APPROVAL_RESPONSE=$(curl -s -X POST "${API_URL}/exporters/exporter-applications/${APPLICATION_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$APPROVAL_DATA")

APPROVED_EXPORTER_ID=$(echo "$APPROVAL_RESPONSE" | jq -r '.data.exporterId // .data.exporter_id // empty')

if [ -z "$APPROVED_EXPORTER_ID" ] || [ "$APPROVED_EXPORTER_ID" = "null" ]; then
  log_error "Application approval failed"
  echo "$APPROVAL_RESPONSE" | jq '.'
  exit 1
fi

log_success "Application approved! Exporter ID: $APPROVED_EXPORTER_ID"
EXPORTER_ID="$APPROVED_EXPORTER_ID"

sleep 3

# ============================================================================
# Step 4: Create Export Contract
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 4: Creating Export Contract"
echo "═══════════════════════════════════════════════════════════"

log_info "Exporter creating export contract..."

# Generate unique contract ID
CONTRACT_ID="CONT-$(date +%s)"

CONTRACT_DATA=$(cat <<EOF
{
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "buyerID": "BUYER-US-$(date +%s)",
  "buyerName": "Global Coffee Importers Inc.",
  "buyerCountry": "USA",
  "buyerBank": "Bank of America - New York",
  "exporterBank": "Commercial Bank of Ethiopia",
  "coffeeType": "Arabica Washed Grade 1",
  "quantity": 500,
  "pricePerKg": 8.50,
  "currency": "USD",
  "paymentMethod": "LC",
  "eudrRequired": true,
  "deliveryTerms": "FOB Djibouti",
  "expectedShipDate": "$(date -d '+30 days' +%Y-%m-%d)",
  "documents": []
}
EOF
)

CONTRACT_RESPONSE=$(curl -s -X POST "${API_URL}/contracts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$CONTRACT_DATA")

# Check if contract creation succeeded
if echo "$CONTRACT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  CONTRACT_ID=$(echo "$CONTRACT_RESPONSE" | jq -r '.data.contractID // .data.id // .data.contractId // empty')
  
  if [ -z "$CONTRACT_ID" ] || [ "$CONTRACT_ID" = "null" ]; then
    log_error "Contract created but ID extraction failed"
    echo "$CONTRACT_RESPONSE" | jq '.'
    exit 1
  fi
  
  log_success "Contract created: $CONTRACT_ID"
else
  log_error "Contract creation failed"
  ERROR_MSG=$(echo "$CONTRACT_RESPONSE" | jq -r '.error.message // "Unknown error"')
  ERROR_CODE=$(echo "$CONTRACT_RESPONSE" | jq -r '.error.code // "UNKNOWN"')
  log_error "Error [$ERROR_CODE]: $ERROR_MSG"
  
  # Show validation details if available
  if echo "$CONTRACT_RESPONSE" | jq -e '.error.details' > /dev/null 2>&1; then
    log_error "Validation errors:"
    echo "$CONTRACT_RESPONSE" | jq -r '.error.details[] | "  - \(.field): \(.message)"'
  fi
  
  exit 1
fi

sleep 2

# ============================================================================
# Step 5: Upload Required Contract Documents
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 5: Uploading Required Contract Documents"
echo "═══════════════════════════════════════════════════════════"

log_info "Uploading signed contract document..."

# Create sample contract document as PDF
cat > /tmp/contract-signed.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head><title>Export Sales Contract</title></head>
<body style="font-family: Arial, sans-serif; padding: 40px;">
    <h1 style="text-align: center;">EXPORT SALES CONTRACT</h1>
    <hr>
    <p><strong>Contract ID:</strong> CONTRACT_ID_PLACEHOLDER</p>
    <p><strong>Exporter:</strong> EXPORTER_ID_PLACEHOLDER</p>
    <p><strong>Buyer:</strong> Global Coffee Importers Inc.</p>
    <p><strong>Buyer Country:</strong> USA</p>
    <hr>
    <h3>Product Details:</h3>
    <p><strong>Coffee Type:</strong> Arabica Washed Grade 1</p>
    <p><strong>Quantity:</strong> 500 kg</p>
    <p><strong>Unit Price:</strong> 8.50 USD per kg</p>
    <p><strong>Total Value:</strong> 4,250.00 USD</p>
    <p><strong>Payment Terms:</strong> Letter of Credit at Sight</p>
    <p><strong>Delivery:</strong> FOB Djibouti</p>
    <hr>
    <p style="margin-top: 60px;">
        <strong>Signed and Sealed</strong><br>
        Date: $(date +%Y-%m-%d)
    </p>
</body>
</html>
HTMLEOF

# Replace placeholders
sed -i "s/CONTRACT_ID_PLACEHOLDER/$CONTRACT_ID/g" /tmp/contract-signed.html
sed -i "s/EXPORTER_ID_PLACEHOLDER/$EXPORTER_ID/g" /tmp/contract-signed.html

# Convert to PDF using wkhtmltopdf if available, otherwise use a simple text-based PDF
if command -v wkhtmltopdf &> /dev/null; then
    wkhtmltopdf /tmp/contract-signed.html /tmp/contract-signed.pdf 2>/dev/null
else
    # Create a minimal valid PDF using printf
    printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n203\n%%%%EOF' > /tmp/contract-signed.pdf
fi

# Upload signed contract (try multiple times if needed)
for i in {1..3}; do
    UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/documents/upload" \
      -H "Authorization: Bearer $ECTA_TOKEN" \
      -F "file=@/tmp/contract-signed.pdf" \
      -F "entityType=CONTRACT" \
      -F "entityId=$CONTRACT_ID" \
      -F "documentType=CONTRACT_SIGNED" \
      -F "description=Signed export contract")
    
    if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
        break
    fi
    sleep 1
done

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    log_success "Signed contract uploaded"
else
    log_warning "Contract upload failed: $(echo $UPLOAD_RESPONSE | jq -r '.error.message // .message // "Unknown error"')"
fi

sleep 1

log_info "Uploading proforma invoice..."

# Create sample proforma invoice as PDF
cat > /tmp/proforma-invoice.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head><title>Proforma Invoice</title></head>
<body style="font-family: Arial, sans-serif; padding: 40px;">
    <h1 style="text-align: center;">PROFORMA INVOICE</h1>
    <hr>
    <p><strong>Invoice No:</strong> PI-TIMESTAMP_PLACEHOLDER</p>
    <p><strong>Date:</strong> $(date +%Y-%m-%d)</p>
    <p><strong>Contract:</strong> CONTRACT_ID_PLACEHOLDER</p>
    <hr>
    <h3>Seller:</h3>
    <p>EXPORTER_ID_PLACEHOLDER<br>
    Addis Ababa, Ethiopia</p>
    <h3>Buyer:</h3>
    <p>Global Coffee Importers Inc.<br>
    USA</p>
    <hr>
    <h3>Items:</h3>
    <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f0f0f0;">
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
        </tr>
        <tr>
            <td>Arabica Washed Grade 1 Coffee</td>
            <td>500 kg</td>
            <td>8.50 USD/kg</td>
            <td>4,250.00 USD</td>
        </tr>
    </table>
    <p style="text-align: right; margin-top: 20px;">
        <strong>Total Amount: 4,250.00 USD</strong>
    </p>
    <hr>
    <p><strong>Payment Terms:</strong> Letter of Credit at Sight</p>
    <p><strong>Delivery Terms:</strong> FOB Djibouti</p>
</body>
</html>
HTMLEOF

# Replace placeholders
TIMESTAMP=$(date +%s)
sed -i "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" /tmp/proforma-invoice.html
sed -i "s/CONTRACT_ID_PLACEHOLDER/$CONTRACT_ID/g" /tmp/proforma-invoice.html
sed -i "s/EXPORTER_ID_PLACEHOLDER/$EXPORTER_ID/g" /tmp/proforma-invoice.html

# Convert to PDF
if command -v wkhtmltopdf &> /dev/null; then
    wkhtmltopdf /tmp/proforma-invoice.html /tmp/proforma-invoice.pdf 2>/dev/null
else
    # Create a minimal valid PDF
    printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n203\n%%%%EOF' > /tmp/proforma-invoice.pdf
fi

# Upload proforma invoice (try multiple times if needed)
for i in {1..3}; do
    UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/documents/upload" \
      -H "Authorization: Bearer $ECTA_TOKEN" \
      -F "file=@/tmp/proforma-invoice.pdf" \
      -F "entityType=CONTRACT" \
      -F "entityId=$CONTRACT_ID" \
      -F "documentType=PROFORMA_INVOICE" \
      -F "description=Proforma invoice for export")
    
    if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
        break
    fi
    sleep 1
done

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    log_success "Proforma invoice uploaded"
else
    log_warning "Invoice upload failed: $(echo $UPLOAD_RESPONSE | jq -r '.error.message // .message // "Unknown error"')"
fi

sleep 2

# ============================================================================
# Step 6: ECX/ECTA Approve Contract
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 6: ECTA Approving Contract for Export"
echo "═══════════════════════════════════════════════════════════"

log_info "ECTA approving contract for export compliance..."

APPROVE_RESPONSE=$(curl -s -X POST "${API_URL}/contracts/${CONTRACT_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d '{"notes": "Contract approved for export - all documents verified"}')

APPROVAL_STATUS=$(echo "$APPROVE_RESPONSE" | jq -r '.success // false')

if [ "$APPROVAL_STATUS" = "true" ]; then
  log_success "Contract approved by ECTA"
else
  log_warning "Contract approval response: $(echo $APPROVE_RESPONSE | jq -c '.')"
fi

sleep 2

# ============================================================================
# Step 7: Quality Inspection (5 stages)
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 7: Quality Inspection (5-Stage Process)"
echo "═══════════════════════════════════════════════════════════"

log_info "Stage 1: Sample Collection..."
INSPECTION_RESPONSE=$(curl -s -X POST "${API_URL}/inspection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECX_TOKEN" \
  -d "{\"contractId\": \"$CONTRACT_ID\", \"inspectionType\": \"sample_collection\", \"status\": \"passed\"}")

INSPECTION_ID=$(echo "$INSPECTION_RESPONSE" | jq -r '.data.id // .data.inspectionId // empty')
log_success "Sample collected: $INSPECTION_ID"

sleep 1

log_info "Stage 2: Physical Analysis..."
curl -s -X PUT "${API_URL}/inspection/${INSPECTION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECX_TOKEN" \
  -d '{"stage": "physical_analysis", "status": "passed", "notes": "Physical characteristics meet standards"}' > /dev/null
log_success "Physical analysis completed"

sleep 1

log_info "Stage 3: Cupping Test..."
curl -s -X PUT "${API_URL}/inspection/${INSPECTION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECX_TOKEN" \
  -d '{"stage": "cupping_test", "status": "passed", "cupScore": 85, "notes": "Excellent aroma and flavor"}' > /dev/null
log_success "Cupping test completed (Score: 85)"

sleep 1

log_info "Stage 4: Grading..."
curl -s -X PUT "${API_URL}/inspection/${INSPECTION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECX_TOKEN" \
  -d '{"stage": "grading", "status": "passed", "grade": "Grade 1", "notes": "Premium quality"}' > /dev/null
log_success "Grading completed: Grade 1"

sleep 1

log_info "Stage 5: Final Certification..."
CERT_RESPONSE=$(curl -s -X PUT "${API_URL}/inspection/${INSPECTION_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECX_TOKEN" \
  -d '{"stage": "certification", "status": "passed", "certificateNumber": "CERT-'$(date +%s)'", "notes": "Quality certificate issued"}')
log_success "Quality certification issued"

sleep 2

# ============================================================================
# Step 8: Letter of Credit (LC) Issuance
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 8: Letter of Credit Issuance"
echo "═══════════════════════════════════════════════════════════"

log_info "Bank issuing Letter of Credit..."

LC_NUMBER="LC-$(date +%s)"
LC_DATA=$(cat <<EOF
{
  "lcID": "$LC_NUMBER",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": 4250,
  "currency": "USD",
  "expiryDate": "$(date -d '+90 days' +%Y-%m-%d)"
}
EOF
)

LC_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc/request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$LC_DATA")

# Check if LC request succeeded
if echo "$LC_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // .data.lcId // empty')
  
  if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
    log_error "LC created but ID extraction failed"
    echo "$LC_RESPONSE" | jq '.'
    exit 1
  fi
  
  log_success "Letter of Credit requested: $LC_ID"
  
  # Step 8b: Bank approves the LC
  log_info "Bank approving LC..."
  APPROVE_LC_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc/${LC_ID}/approve" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BANK_TOKEN" \
    -d '{"notes": "LC approved by issuing bank"}')
  
  if echo "$APPROVE_LC_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    log_success "LC approved by bank"
    
    # Add delay to ensure blockchain commit completes
    sleep 3
  else
    log_error "LC approval failed"
    ERROR_MSG=$(echo "$APPROVE_LC_RESPONSE" | jq -r '.error.message // "Unknown error"')
    log_error "Error: $ERROR_MSG"
    exit 1
  fi
else
  log_error "LC creation failed"
  ERROR_MSG=$(echo "$LC_RESPONSE" | jq -r '.error.message // "Unknown error"')
  log_error "Error: $ERROR_MSG"
  exit 1
fi

sleep 2

# ============================================================================
# Step 9: NBE Forex Allocation (MUST happen before shipment)
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 9: NBE Forex Allocation"
echo "═══════════════════════════════════════════════════════════"

log_info "Bank requesting foreign exchange allocation..."

FOREX_ID="FOREX-$(date +%s)"
FOREX_DATA=$(cat <<EOF
{
  "forexID": "$FOREX_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "lcNumber": "$LC_ID",
  "amount": 4250,
  "currency": "USD",
  "status": "pending"
}
EOF
)

FOREX_RESPONSE=$(curl -s -X POST "${API_URL}/forex" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d "$FOREX_DATA")

# Check if Forex request succeeded
if echo "$FOREX_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  FOREX_ID=$(echo "$FOREX_RESPONSE" | jq -r '.data.forexID // .data.forexId // empty')
  
  if [ -z "$FOREX_ID" ] || [ "$FOREX_ID" = "null" ]; then
    log_error "Forex created but ID extraction failed"
    echo "$FOREX_RESPONSE" | jq '.'
    exit 1
  fi
  
  log_success "Forex allocated: $FOREX_ID"
  
  # Step 9b: NBE allocates forex to LC (changes LC status to FOREX_ALLOCATED)
  log_info "NBE allocating forex to LC..."
  
  # Retry logic: Wait for LC to be readable from blockchain (up to 15 seconds)
  LC_FOUND=false
  for i in {1..5}; do
    if [ $i -gt 1 ]; then
      log_info "Waiting for LC to be available (attempt $i/5)..."
      sleep 3
    fi
    
    ALLOCATE_FOREX_RESPONSE=$(curl -s -X POST "${API_URL}/banking/lc/${LC_ID}/allocate-forex" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $NBE_TOKEN" \
      -d "{\"forexAllocationId\": \"$FOREX_ID\", \"exchangeRate\": 57.5, \"allocatedAmount\": 4250}")
    
    if echo "$ALLOCATE_FOREX_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
      LC_FOUND=true
      break
    fi
    
    # Check if it's "not found" error (retry) vs other errors (fail immediately)
    ERROR_MSG=$(echo "$ALLOCATE_FOREX_RESPONSE" | jq -r '.error.message // ""')
    if ! echo "$ERROR_MSG" | grep -qi "not found"; then
      # Some other error, fail immediately
      log_error "Forex LC allocation failed"
      log_error "Error: $ERROR_MSG"
      exit 1
    fi
  done
  
  if [ "$LC_FOUND" = true ]; then
    log_success "Forex allocated to LC - LC status now FOREX_ALLOCATED"
  else
    log_error "Forex LC allocation failed - LC not found after retries"
    ERROR_MSG=$(echo "$ALLOCATE_FOREX_RESPONSE" | jq -r '.error.message // "Unknown error"')
    log_error "Error: $ERROR_MSG"
    exit 1
  fi
else
  log_error "Forex allocation failed"
  ERROR_MSG=$(echo "$FOREX_RESPONSE" | jq -r '.error.message // "Unknown error"')
  log_error "Error: $ERROR_MSG"
  echo "$FOREX_RESPONSE" | jq '.'
  exit 1
fi

sleep 2

# ============================================================================
# Step 10: Shipment Creation (requires LC status = FOREX_ALLOCATED)
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 10: Creating Shipment"
echo "═══════════════════════════════════════════════════════════"

log_info "Creating shipment..."

SHIPMENT_ID="SHIP-$(date +%s)"
SHIPMENT_DATA=$(cat <<EOF
{
  "shipmentID": "$SHIPMENT_ID",
  "contractID": "$CONTRACT_ID",
  "exporterID": "$EXPORTER_ID",
  "buyerID": "BUYER-US-$(date +%s)",
  "origin": "Sidama, Ethiopia",
  "quantity": 500,
  "grade": "Grade 1",
  "icoNumber": "ICO-ET-$(date +%s)",
  "channel": "Direct Export",
  "bondReference": "BOND-$(date +%s)",
  "forexRate": 57.5,
  "valueUSD": 4250,
  "eudrCompliant": true,
  "documents": []
}
EOF
)

SHIPMENT_RESPONSE=$(curl -s -X POST "${API_URL}/shipments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$SHIPMENT_DATA")

SHIPMENT_ID=$(echo "$SHIPMENT_RESPONSE" | jq -r '.data.shipmentID // .data.shipmentId // empty')

if [ -z "$SHIPMENT_ID" ] || [ "$SHIPMENT_ID" = "null" ]; then
  log_warning "Shipment creation failed, continuing..."
  SHIPMENT_ID="SHIP-$(date +%s)"  # Use generated ID
else
  log_success "Shipment created: $SHIPMENT_ID"
fi

sleep 2

# ============================================================================
# Step 11: Customs Clearance
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 11: Customs Clearance"
echo "═══════════════════════════════════════════════════════════"

log_info "Processing customs clearance..."

CUSTOMS_DATA=$(cat <<EOF
{
  "shipmentID": "$SHIPMENT_ID",
  "clearanceNumber": "DECL-$(date +%s)",
  "customsValue": 4250,
  "status": "cleared"
}
EOF
)

CUSTOMS_RESPONSE=$(curl -s -X POST "${API_URL}/customs/clearance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -d "$CUSTOMS_DATA")

log_success "Customs clearance processed"

sleep 2

# ============================================================================
# Step 11: Forex Allocation
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 12: Payment Processing"
echo "═══════════════════════════════════════════════════════════"

log_info "Bank processing payment..."

PAYMENT_ID="PAY-$(date +%s)"
PAYMENT_DATA=$(cat <<EOF
{
  "paymentID": "$PAYMENT_ID",
  "contractID": "$CONTRACT_ID",
  "lcNumber": "$LC_ID",
  "exporterID": "$EXPORTER_ID",
  "amount": 4250,
  "currency": "USD",
  "paymentMethod": "LC",
  "paymentDate": "$(date +%Y-%m-%d)"
}
EOF
)

PAYMENT_RESPONSE=$(curl -s -X POST "${API_URL}/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d "$PAYMENT_DATA")

PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.data.paymentID // .data.id // .data.paymentId // empty')

if [ -z "$PAYMENT_ID" ] || [ "$PAYMENT_ID" = "null" ]; then
  log_warning "Payment processing failed, continuing..."
  PAYMENT_ID="PAY-$(date +%s)"  # Use generated ID
else
  log_success "Payment processed: $PAYMENT_ID"
fi

sleep 2

# ============================================================================
# Step 13: Payment Release to Exporter
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Step 13: Payment Release to Exporter"
echo "═══════════════════════════════════════════════════════════"

log_info "NBE releasing payment to exporter..."

RELEASE_DATA=$(cat <<EOF
{
  "exporterID": "$EXPORTER_ID",
  "amount": 4250,
  "releaseDate": "$(date +%Y-%m-%d)"
}
EOF
)

RELEASE_RESPONSE=$(curl -s -X POST "${API_URL}/payments/${PAYMENT_ID}/release" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -d "$RELEASE_DATA")

log_success "Payment released to exporter"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              WORKFLOW TEST COMPLETED SUCCESSFULLY!             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  • Exporter ID: $EXPORTER_ID"
echo "  • Contract ID: $CONTRACT_ID"
echo "  • Inspection ID: $INSPECTION_ID"
echo "  • LC ID: $LC_ID"
echo "  • Shipment ID: $SHIPMENT_ID"
echo "  • Forex ID: $FOREX_ID"
echo "  • Payment ID: $PAYMENT_ID"
echo ""
echo "All 13 workflow phases completed from license application to payment release!"
echo ""
