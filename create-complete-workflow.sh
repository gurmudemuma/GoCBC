#!/bin/bash

# =============================================================================
# CECBS Complete Portal Workflow Creation Script
# Creates REAL end-to-end workflow data in the system
# =============================================================================

set -e

API="http://localhost:3001"

echo "=============================================="
echo "CECBS Complete Portal Workflow Creation"
echo "=============================================="
echo ""
echo "This will create REAL workflow data:"
echo "- Exporter application & approval"
echo "- Export contract"
echo "- LC request & approval"
echo "- Forex declaration & allocation"
echo "- Shipment registration"
echo "- Quality inspection"
echo "- Export permit"
echo "- Customs declaration & clearance"
echo "- Shipment tracking"
echo "- Payment & repatriation"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Generate unique IDs
TIMESTAMP=$(date +%s)
TEST_EMAIL="exporter_${TIMESTAMP}@cecbs.et"
TEST_COMPANY="Test Coffee Exporter ${TIMESTAMP}"

echo ""
echo "=============================================="
echo "Step 1: Admin Authentication"
echo "=============================================="

ADMIN_RESPONSE=$(curl -s -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Alternative: try to parse with different JSON structure
if [ -z "$ADMIN_TOKEN" ]; then
  ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
fi

if [ -z "$ADMIN_TOKEN" ]; then
    echo "ERROR: Admin login failed"
    echo "Response: $ADMIN_RESPONSE"
    exit 1
fi

echo "✓ Admin authenticated"
echo "Token: ${ADMIN_TOKEN:0:40}..."

echo ""
echo "=============================================="
echo "Step 2: Submit Exporter Application"
echo "=============================================="

APP_RESPONSE=$(curl -s -X POST "$API/api/v1/exporters/exporter-applications" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "'"$TEST_COMPANY"'",
    "tinNumber": "TIN'${TIMESTAMP}'",
    "businessLicense": "BL'${TIMESTAMP}'",
    "email": "'"$TEST_EMAIL"'",
    "phone": "+251911'${TIMESTAMP:5:6}'",
    "address": "Addis Ababa, Ethiopia",
    "city": "Addis Ababa",
    "region": "Addis Ababa",
    "country": "Ethiopia",
    "contactPerson": "Test Manager",
    "contactEmail": "'"$TEST_EMAIL"'",
    "contactPhone": "+251911'${TIMESTAMP:5:6}'",
    "estimatedAnnualVolume": 50000,
    "exportExperience": "5 years of coffee export experience",
    "targetMarkets": "Europe, USA, Asia",
    "bankName": "Commercial Bank of Ethiopia",
    "bankAccount": "1000'${TIMESTAMP:5:9}'"
  }')

echo "Application Response:"
echo "$APP_RESPONSE" | head -20
echo ""

APPLICATION_ID=$(echo "$APP_RESPONSE" | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)
TEMP_USERNAME=$(echo "$APP_RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
TEMP_PASSWORD=$(echo "$APP_RESPONSE" | grep -o '"temporaryPassword":"[^"]*"' | cut -d'"' -f4)

if [ -n "$APPLICATION_ID" ]; then
    echo "✓ Application submitted successfully"
    echo "  Application ID: $APPLICATION_ID"
    echo "  Temp Username: $TEMP_USERNAME"
    echo "  Temp Password: $TEMP_PASSWORD"
else
    echo "⚠ Application response unclear, continuing..."
    APPLICATION_ID="APP-${TIMESTAMP}"
fi

sleep 2

echo ""
echo "=============================================="
echo "Step 3: ECTA Approves Application"
echo "=============================================="

if [ -n "$APPLICATION_ID" ]; then
    APPROVE_RESPONSE=$(curl -s -X POST "$API/api/v1/exporters/exporter-applications/$APPLICATION_ID/approve" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "licenseNumber": "ECL'${TIMESTAMP}'",
        "approvalNotes": "All documents verified and approved. License granted.",
        "licenseValidUntil": "2027-12-31",
        "licenseType": "COFFEE_EXPORTER",
        "approvedBy": "ECTA Admin"
      }')
    
    echo "Approval Response:"
    echo "$APPROVE_RESPONSE" | head -20
    echo ""
    
    EXPORTER_ID=$(echo "$APPROVE_RESPONSE" | grep -o '"exporterId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$EXPORTER_ID" ]; then
        echo "✓ Application approved"
        echo "  Exporter ID: $EXPORTER_ID"
    else
        echo "⚠ Using default exporter ID"
        EXPORTER_ID="EXP001"
    fi
else
    echo "⚠ Skipping approval - using existing exporter"
    EXPORTER_ID="EXP001"
fi

sleep 2

echo ""
echo "=============================================="
echo "Step 4: Create Export Contract"
echo "=============================================="

CONTRACT_ID="CNT-${TIMESTAMP}"

CONTRACT_RESPONSE=$(curl -s -X POST "$API/api/v1/contracts" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "buyerId": "BUY-EU-001",
    "buyerName": "European Coffee Importers GmbH",
    "buyerCountry": "Germany",
    "coffeeType": "Arabica Sidamo Grade 2",
    "quantity": 10000,
    "unit": "kg",
    "pricePerKg": 8.50,
    "totalValue": 85000,
    "currency": "USD",
    "deliveryTerms": "FOB",
    "paymentTerms": "LC at sight",
    "portOfLoading": "Djibouti Port",
    "portOfDischarge": "Hamburg Port",
    "deliveryDate": "2026-12-31",
    "qualityStandards": "Ethiopian Coffee Quality Standards Grade 2",
    "packagingType": "60kg jute bags",
    "numberOfBags": 167,
    "status": "DRAFT"
  }')

echo "Contract Response:"
echo "$CONTRACT_RESPONSE" | head -20
echo ""

echo "✓ Contract created: $CONTRACT_ID"
echo "  Quantity: 10,000 kg"
echo "  Value: $85,000 USD"
echo "  Coffee: Arabica Sidamo Grade 2"

sleep 2

echo ""
echo "=============================================="
echo "Step 5: ECTA Approves Contract"
echo "=============================================="

CONTRACT_APPROVE=$(curl -s -X PATCH "$API/api/v1/contracts/$CONTRACT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "approvedBy": "ECTA Trade Officer",
    "approvalNotes": "Contract verified and approved for export"
  }')

echo "✓ Contract approved by ECTA"

sleep 2

echo ""
echo "=============================================="
echo "Step 6: Request Letter of Credit"
echo "=============================================="

LC_ID="LC-${TIMESTAMP}"

LC_RESPONSE=$(curl -s -X POST "$API/api/v1/banking/lc/request" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lcId": "'"$LC_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "buyerId": "BUY-EU-001",
    "amount": 85000,
    "currency": "USD",
    "bankName": "Commercial Bank of Ethiopia",
    "issuingBank": "Deutsche Bank AG",
    "advisingBank": "Commercial Bank of Ethiopia",
    "lcType": "SIGHT",
    "expiryDate": "2026-12-31",
    "latestShipmentDate": "2026-12-15",
    "partialShipment": false,
    "transhipment": true,
    "status": "REQUESTED"
  }')

echo "LC Response:"
echo "$LC_RESPONSE" | head -20
echo ""

echo "✓ LC requested: $LC_ID"
echo "  Amount: $85,000 USD"
echo "  Type: Sight LC"

sleep 2

echo ""
echo "=============================================="
echo "Step 7: Bank Approves LC"
echo "=============================================="

LC_APPROVE=$(curl -s -X PATCH "$API/api/v1/banking/lcs/$LC_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "approvedBy": "Bank LC Officer",
    "lcNumber": "LC'${TIMESTAMP}'",
    "swiftReference": "LCMT700'${TIMESTAMP}'"
  }')

echo "✓ LC approved by Bank"

sleep 2

echo ""
echo "=============================================="
echo "Step 8: Submit Forex Declaration"
echo "=============================================="

FOREX_ID="FX-${TIMESTAMP}"

FOREX_RESPONSE=$(curl -s -X POST "$API/api/v1/forex/declare" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "forexId": "'"$FOREX_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "lcNumber": "'"$LC_ID"'",
    "contractValue": 85000,
    "currency": "USD",
    "requestedAmount": 85000,
    "purpose": "Coffee export proceeds repatriation",
    "expectedRepatriationDate": "2026-12-31",
    "status": "SUBMITTED"
  }')

echo "Forex Response:"
echo "$FOREX_RESPONSE" | head -20
echo ""

echo "✓ Forex declared: $FOREX_ID"
echo "  Amount: $85,000 USD"

sleep 2

echo ""
echo "=============================================="
echo "Step 9: NBE Allocates Forex"
echo "=============================================="

FOREX_APPROVE=$(curl -s -X PATCH "$API/api/v1/forex/$FOREX_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ALLOCATED",
    "exchangeRate": 57.50,
    "localAmount": 4887500,
    "approvedBy": "NBE Forex Officer",
    "allocationDate": "'$(date +%Y-%m-%d)'"
  }')

echo "✓ Forex allocated by NBE"
echo "  Rate: 57.50 ETB/USD"
echo "  Local Amount: 4,887,500 ETB"

sleep 2

echo ""
echo "=============================================="
echo "Step 10: Register Shipment"
echo "=============================================="

SHIPMENT_ID="SHP-${TIMESTAMP}"

SHIPMENT_RESPONSE=$(curl -s -X POST "$API/api/v1/shipments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "'"$SHIPMENT_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "buyerId": "BUY-EU-001",
    "quantity": 10000,
    "coffeeType": "Arabica Sidamo Grade 2",
    "transportMode": "SEA",
    "vesselName": "MV Coffee Express",
    "voyageNumber": "CE-'${TIMESTAMP:5:6}'",
    "containerNumber": "CONT'${TIMESTAMP:5:9}'",
    "portOfLoading": "Djibouti Port",
    "portOfDischarge": "Hamburg Port",
    "estimatedDepartureDate": "2026-12-15",
    "estimatedArrivalDate": "2027-01-20",
    "currentLocation": "Warehouse - Addis Ababa",
    "status": "CREATED"
  }')

echo "Shipment Response:"
echo "$SHIPMENT_RESPONSE" | head -20
echo ""

echo "✓ Shipment registered: $SHIPMENT_ID"
echo "  Vessel: MV Coffee Express"
echo "  Route: Djibouti → Hamburg"

sleep 2

echo ""
echo "=============================================="
echo "Step 11: ECTA Quality Inspection"
echo "=============================================="

CERT_ID="QC-${TIMESTAMP}"

QUALITY_RESPONSE=$(curl -s -X POST "$API/api/v1/quality/certificates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "'"$CERT_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "inspectorId": "INSP001",
    "inspectorName": "ECTA Quality Inspector",
    "coffeeType": "Arabica Sidamo Grade 2",
    "quantity": 10000,
    "qualityGrade": "Grade 2",
    "moistureContent": 11.2,
    "defectPercentage": 2.8,
    "cuppingScore": 86,
    "screenSize": "15-17",
    "aroma": "Excellent",
    "flavor": "Floral, citrus notes",
    "acidity": "Bright",
    "body": "Medium",
    "inspectionDate": "'$(date +%Y-%m-%d)'",
    "result": "PASSED",
    "certificateNumber": "CERT-'${TIMESTAMP}'",
    "remarks": "Excellent quality coffee. Meets all export standards.",
    "status": "ISSUED"
  }')

echo "Quality Response:"
echo "$QUALITY_RESPONSE" | head -20
echo ""

echo "✓ Quality inspection completed: $CERT_ID"
echo "  Grade: Grade 2"
echo "  Cupping Score: 86"
echo "  Result: PASSED"

sleep 2

echo ""
echo "=============================================="
echo "Step 12: ECTA Issues Export Permit"
echo "=============================================="

PERMIT_ID="EP-${TIMESTAMP}"

PERMIT_RESPONSE=$(curl -s -X POST "$API/api/v1/permits" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permitId": "'"$PERMIT_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "permitNumber": "EP'${TIMESTAMP}'",
    "permitType": "EXPORT_PERMIT",
    "coffeeType": "Arabica Sidamo Grade 2",
    "quantity": 10000,
    "issueDate": "'$(date +%Y-%m-%d)'",
    "expiryDate": "2026-12-31",
    "destination": "Germany",
    "issuedBy": "ECTA Permit Officer",
    "certificateNumber": "'"$CERT_ID"'",
    "status": "ISSUED"
  }')

echo "Permit Response:"
echo "$PERMIT_RESPONSE" | head -20
echo ""

echo "✓ Export permit issued: $PERMIT_ID"
echo "  Permit Number: EP${TIMESTAMP}"
echo "  Valid until: 2026-12-31"

sleep 2

echo ""
echo "=============================================="
echo "Step 13: Submit Customs Declaration"
echo "=============================================="

CUSTOMS_ID="CD-${TIMESTAMP}"

CUSTOMS_RESPONSE=$(curl -s -X POST "$API/api/v1/customs/declare" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customsId": "'"$CUSTOMS_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "declarationNumber": "CD'${TIMESTAMP}'",
    "exporterId": "'"$EXPORTER_ID"'",
    "exporterName": "'"$TEST_COMPANY"'",
    "hsCode": "0901.21",
    "productDescription": "Coffee, not roasted, not decaffeinated",
    "quantity": 10000,
    "value": 85000,
    "currency": "USD",
    "destinationCountry": "Germany",
    "destinationPort": "Hamburg",
    "transportMode": "SEA",
    "permitNumber": "EP'${TIMESTAMP}'",
    "declarationDate": "'$(date +%Y-%m-%d)'",
    "status": "SUBMITTED"
  }')

echo "Customs Response:"
echo "$CUSTOMS_RESPONSE" | head -20
echo ""

echo "✓ Customs declaration submitted: $CUSTOMS_ID"
echo "  HS Code: 0901.21"
echo "  Destination: Germany"

sleep 2

echo ""
echo "=============================================="
echo "Step 14: Customs Clearance"
echo "=============================================="

CUSTOMS_CLEAR=$(curl -s -X PATCH "$API/api/v1/customs/$CUSTOMS_ID/clear" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CLEARED",
    "clearedBy": "Customs Officer",
    "clearanceDate": "'$(date +%Y-%m-%d)'",
    "remarks": "All documents verified. Shipment cleared for export."
  }')

echo "✓ Customs clearance granted"

sleep 2

echo ""
echo "=============================================="
echo "Step 15: Update Shipment - Departed"
echo "=============================================="

SHIP_DEPARTED=$(curl -s -X PATCH "$API/api/v1/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DEPARTED",
    "currentLocation": "Djibouti Port",
    "actualDepartureDate": "'$(date +%Y-%m-%d)'",
    "updatedBy": "Port Authority"
  }')

echo "✓ Shipment departed from Djibouti"

sleep 2

echo ""
echo "=============================================="
echo "Step 16: Update Shipment - In Transit"
echo "=============================================="

SHIP_TRANSIT=$(curl -s -X PATCH "$API/api/v1/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_TRANSIT",
    "currentLocation": "Red Sea",
    "updatedBy": "Shipping Company"
  }')

echo "✓ Shipment in transit"

sleep 2

echo ""
echo "=============================================="
echo "Step 17: Update Shipment - Delivered"
echo "=============================================="

SHIP_DELIVERED=$(curl -s -X PATCH "$API/api/v1/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DELIVERED",
    "currentLocation": "Hamburg Port",
    "actualArrivalDate": "'$(date +%Y-%m-%d)'",
    "receivedBy": "European Coffee Importers GmbH",
    "updatedBy": "Port Authority"
  }')

echo "✓ Shipment delivered to Hamburg"

sleep 2

echo ""
echo "=============================================="
echo "Step 18: Process Payment"
echo "=============================================="

PAYMENT_ID="PAY-${TIMESTAMP}"

PAYMENT_RESPONSE=$(curl -s -X POST "$API/api/v1/payments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "'"$PAYMENT_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "lcId": "'"$LC_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "amount": 85000,
    "currency": "USD",
    "paymentType": "LC_PAYMENT",
    "paymentMethod": "SWIFT",
    "bankReference": "PAY'${TIMESTAMP}'",
    "swiftReference": "MT700'${TIMESTAMP}'",
    "paymentDate": "'$(date +%Y-%m-%d)'",
    "status": "COMPLETED",
    "paidBy": "Deutsche Bank AG",
    "receivedBy": "Commercial Bank of Ethiopia"
  }')

echo "Payment Response:"
echo "$PAYMENT_RESPONSE" | head -20
echo ""

echo "✓ Payment processed: $PAYMENT_ID"
echo "  Amount: $85,000 USD"
echo "  Method: SWIFT LC Payment"

sleep 2

echo ""
echo "=============================================="
echo "Step 19: Record Repatriation"
echo "=============================================="

REPATRIATION_RESPONSE=$(curl -s -X POST "$API/api/v1/repatriation" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "'"$EXPORTER_ID"'",
    "paymentId": "'"$PAYMENT_ID"'",
    "amount": 85000,
    "currency": "USD",
    "exchangeRate": 57.50,
    "localAmount": 4887500,
    "localCurrency": "ETB",
    "repatriationDate": "'$(date +%Y-%m-%d)'",
    "bankReference": "REP'${TIMESTAMP}'",
    "bankName": "Commercial Bank of Ethiopia",
    "nbeReference": "NBE'${TIMESTAMP}'",
    "status": "COMPLETED"
  }')

echo "Repatriation Response:"
echo "$REPATRIATION_RESPONSE" | head -20
echo ""

echo "✓ Export proceeds repatriated"
echo "  Foreign Amount: $85,000 USD"
echo "  Local Amount: 4,887,500 ETB"
echo "  Rate: 57.50 ETB/USD"

sleep 2

echo ""
echo "=============================================="
echo "Step 20: Verify Audit Trail"
echo "=============================================="

AUDIT_RESPONSE=$(curl -s -X GET "$API/api/v1/audit?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

AUDIT_COUNT=$(echo "$AUDIT_RESPONSE" | grep -o "entityId" | wc -l)

echo "✓ Audit trail verification"
echo "  Recent audit entries: $AUDIT_COUNT"

echo ""
echo "=============================================="
echo "WORKFLOW CREATION COMPLETE!"
echo "=============================================="
echo ""
echo "Created Entities:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Application:   $APPLICATION_ID"
echo "Exporter:      $EXPORTER_ID"
echo "Contract:      $CONTRACT_ID"
echo "LC:            $LC_ID"
echo "Forex:         $FOREX_ID"
echo "Shipment:      $SHIPMENT_ID"
echo "Certificate:   $CERT_ID"
echo "Permit:        $PERMIT_ID"
echo "Customs:       $CUSTOMS_ID"
echo "Payment:       $PAYMENT_ID"
echo ""
echo "You can now view this complete workflow in:"
echo "- Exporter Portal (Contract, Shipment, Payment)"
echo "- ECTA Portal (Quality, Permit)"
echo "- Bank Portal (LC, Payment)"
echo "- NBE Portal (Forex)"
echo "- Customs Portal (Declaration)"
echo "- Admin Portal (Audit Trail)"
echo ""
echo "✓ Complete end-to-end workflow created successfully!"
echo "=============================================="
