#!/bin/bash

# =============================================================================
# CECBS Complete Portal Workflow - Automated (No Prompts)
# Creates REAL end-to-end workflow data in the system
# =============================================================================

set -e

API="http://localhost:3001"

echo "=============================================="
echo "CECBS Complete Portal Workflow Creation"
echo "=============================================="
echo ""
echo "Creating complete end-to-end workflow data..."
echo ""

# Generate unique IDs
TIMESTAMP=$(date +%s)
TEST_EMAIL="exporter_${TIMESTAMP}@cecbs.et"
TEST_COMPANY="Test Coffee Exporter ${TIMESTAMP}"

echo "=============================================="
echo "Step 1: Admin Authentication"
echo "=============================================="

ADMIN_RESPONSE=$(curl -s -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "Login Response: $ADMIN_RESPONSE" | head -c 200
echo ""

# Extract token using multiple methods
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  # Try alternative parsing
  ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null || echo "")
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: Could not extract token"
  echo "Full response: $ADMIN_RESPONSE"
  exit 1
fi

echo "✓ Admin authenticated"
echo "Token: ${ADMIN_TOKEN:0:50}..."
echo ""

sleep 1

echo "=============================================="
echo "Step 2: Create Export Contract"
echo "=============================================="

CONTRACT_ID="CNT-${TIMESTAMP}"

CONTRACT_RESPONSE=$(curl -s -X POST "$API/api/v1/contracts" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "EXP001",
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
    "status": "DRAFT"
  }')

echo "Contract Response: $CONTRACT_RESPONSE" | head -c 200
echo ""
echo "✓ Contract created: $CONTRACT_ID"
echo ""

sleep 1

echo "=============================================="
echo "Step 3: Approve Contract"
echo "=============================================="

CONTRACT_APPROVE=$(curl -s -X PATCH "$API/api/v1/contracts/$CONTRACT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED", "approvedBy": "ECTA Officer"}')

echo "✓ Contract approved"
echo ""

sleep 1

echo "=============================================="
echo "Step 4: Request LC"
echo "=============================================="

LC_ID="LC-${TIMESTAMP}"

LC_RESPONSE=$(curl -s -X POST "$API/api/v1/banking/lc/request" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lcId": "'"$LC_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "EXP001",
    "amount": 85000,
    "currency": "USD",
    "bankName": "Commercial Bank of Ethiopia",
    "lcType": "SIGHT",
    "status": "REQUESTED"
  }')

echo "LC Response: $LC_RESPONSE" | head -c 200
echo ""
echo "✓ LC requested: $LC_ID"
echo ""

sleep 1

echo "=============================================="
echo "Step 5: Approve LC"
echo "=============================================="

LC_APPROVE=$(curl -s -X PATCH "$API/api/v1/banking/lcs/$LC_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED", "approvedBy": "Bank Officer"}')

echo "✓ LC approved"
echo ""

sleep 1

echo "=============================================="
echo "Step 6: Declare Forex"
echo "=============================================="

FOREX_ID="FX-${TIMESTAMP}"

FOREX_RESPONSE=$(curl -s -X POST "$API/api/v1/forex/declare" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "forexId": "'"$FOREX_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "EXP001",
    "lcNumber": "'"$LC_ID"'",
    "contractValue": 85000,
    "currency": "USD",
    "requestedAmount": 85000,
    "status": "SUBMITTED"
  }')

echo "Forex Response: $FOREX_RESPONSE" | head -c 200
echo ""
echo "✓ Forex declared: $FOREX_ID"
echo ""

sleep 1

echo "=============================================="
echo "Step 7: Allocate Forex"
echo "=============================================="

FOREX_APPROVE=$(curl -s -X PATCH "$API/api/v1/forex/$FOREX_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ALLOCATED",
    "exchangeRate": 57.50,
    "approvedBy": "NBE Officer"
  }')

echo "✓ Forex allocated (Rate: 57.50 ETB/USD)"
echo ""

sleep 1

echo "=============================================="
echo "Step 8: Register Shipment"
echo "=============================================="

SHIPMENT_ID="SHP-${TIMESTAMP}"

SHIPMENT_RESPONSE=$(curl -s -X POST "$API/api/v1/shipments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "'"$SHIPMENT_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "EXP001",
    "quantity": 10000,
    "coffeeType": "Arabica Sidamo Grade 2",
    "transportMode": "SEA",
    "portOfLoading": "Djibouti Port",
    "portOfDischarge": "Hamburg Port",
    "currentLocation": "Warehouse - Addis Ababa",
    "status": "CREATED"
  }')

echo "Shipment Response: $SHIPMENT_RESPONSE" | head -c 200
echo ""
echo "✓ Shipment registered: $SHIPMENT_ID"
echo ""

sleep 1

echo "=============================================="
echo "Step 9: Quality Inspection"
echo "=============================================="

CERT_ID="QC-${TIMESTAMP}"

QUALITY_RESPONSE=$(curl -s -X POST "$API/api/v1/quality/certificates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "'"$CERT_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "EXP001",
    "inspectorId": "INSP001",
    "coffeeType": "Arabica Sidamo Grade 2",
    "quantity": 10000,
    "qualityGrade": "Grade 2",
    "moistureContent": 11.2,
    "defectPercentage": 2.8,
    "cuppingScore": 86,
    "result": "PASSED",
    "certificateNumber": "CERT-'"$TIMESTAMP"'",
    "status": "ISSUED"
  }')

echo "Quality Response: $QUALITY_RESPONSE" | head -c 200
echo ""
echo "✓ Quality inspection passed (Score: 86)"
echo ""

sleep 1

echo "=============================================="
echo "Step 10: Issue Export Permit"
echo "=============================================="

PERMIT_ID="EP-${TIMESTAMP}"

PERMIT_RESPONSE=$(curl -s -X POST "$API/api/v1/permits" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permitId": "'"$PERMIT_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "exporterId": "EXP001",
    "permitNumber": "EP'"$TIMESTAMP"'",
    "permitType": "EXPORT_PERMIT",
    "quantity": 10000,
    "issueDate": "'"$(date +%Y-%m-%d)"'",
    "expiryDate": "2026-12-31",
    "status": "ISSUED"
  }')

echo "Permit Response: $PERMIT_RESPONSE" | head -c 200
echo ""
echo "✓ Export permit issued: EP$TIMESTAMP"
echo ""

sleep 1

echo "=============================================="
echo "Step 11: Customs Declaration"
echo "=============================================="

CUSTOMS_ID="CD-${TIMESTAMP}"

CUSTOMS_RESPONSE=$(curl -s -X POST "$API/api/v1/customs/declare" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customsId": "'"$CUSTOMS_ID"'",
    "shipmentId": "'"$SHIPMENT_ID"'",
    "declarationNumber": "CD'"$TIMESTAMP"'",
    "exporterId": "EXP001",
    "hsCode": "0901.21",
    "quantity": 10000,
    "value": 85000,
    "currency": "USD",
    "destinationCountry": "Germany",
    "status": "SUBMITTED"
  }')

echo "Customs Response: $CUSTOMS_RESPONSE" | head -c 200
echo ""
echo "✓ Customs declaration submitted"
echo ""

sleep 1

echo "=============================================="
echo "Step 12: Clear Customs"
echo "=============================================="

CUSTOMS_CLEAR=$(curl -s -X PATCH "$API/api/v1/customs/$CUSTOMS_ID/clear" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CLEARED", "clearedBy": "Customs Officer"}')

echo "✓ Customs cleared"
echo ""

sleep 1

echo "=============================================="
echo "Step 13: Update Shipment - Departed"
echo "=============================================="

curl -s -X PATCH "$API/api/v1/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "DEPARTED", "currentLocation": "Djibouti Port"}' > /dev/null

echo "✓ Shipment departed"
echo ""

sleep 1

echo "=============================================="
echo "Step 14: Update Shipment - In Transit"
echo "=============================================="

curl -s -X PATCH "$API/api/v1/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_TRANSIT", "currentLocation": "Red Sea"}' > /dev/null

echo "✓ Shipment in transit"
echo ""

sleep 1

echo "=============================================="
echo "Step 15: Update Shipment - Delivered"
echo "=============================================="

curl -s -X PATCH "$API/api/v1/shipments/$SHIPMENT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "DELIVERED", "currentLocation": "Hamburg Port"}' > /dev/null

echo "✓ Shipment delivered"
echo ""

sleep 1

echo "=============================================="
echo "Step 16: Process Payment"
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
    "exporterId": "EXP001",
    "amount": 85000,
    "currency": "USD",
    "paymentType": "LC_PAYMENT",
    "status": "COMPLETED"
  }')

echo "Payment Response: $PAYMENT_RESPONSE" | head -c 200
echo ""
echo "✓ Payment processed: $85,000 USD"
echo ""

sleep 1

echo "=============================================="
echo "Step 17: Record Repatriation"
echo "=============================================="

REPATRIATION_RESPONSE=$(curl -s -X POST "$API/api/v1/repatriation" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "'"$CONTRACT_ID"'",
    "exporterId": "EXP001",
    "paymentId": "'"$PAYMENT_ID"'",
    "amount": 85000,
    "currency": "USD",
    "exchangeRate": 57.50,
    "localAmount": 4887500,
    "status": "COMPLETED"
  }')

echo "Repatriation Response: $REPATRIATION_RESPONSE" | head -c 200
echo ""
echo "✓ Export proceeds repatriated: 4,887,500 ETB"
echo ""

echo ""
echo "=============================================="
echo "WORKFLOW CREATION COMPLETE!"
echo "=============================================="
echo ""
echo "✓ Created Entities:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Contract:      $CONTRACT_ID"
echo "  LC:            $LC_ID"
echo "  Forex:         $FOREX_ID"
echo "  Shipment:      $SHIPMENT_ID"
echo "  Certificate:   $CERT_ID"
echo "  Permit:        $PERMIT_ID"
echo "  Customs:       $CUSTOMS_ID"
echo "  Payment:       $PAYMENT_ID"
echo ""
echo "✓ Workflow Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Quantity:      10,000 kg Arabica Grade 2"
echo "  Value:         \$85,000 USD"
echo "  Route:         Djibouti → Hamburg"
echo "  Quality:       Grade 2 (Score: 86)"
echo "  Forex Rate:    57.50 ETB/USD"
echo "  Repatriated:   4,887,500 ETB"
echo ""
echo "✓ View in Portals:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • Exporter Portal: Contract, Shipment, Payment"
echo "  • ECTA Portal: Quality Cert, Export Permit"
echo "  • Bank Portal: LC, Payment"
echo "  • NBE Portal: Forex Allocation"
echo "  • Customs Portal: Declaration"
echo ""
echo "✅ Complete end-to-end workflow created!"
echo "=============================================="
