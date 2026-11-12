#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Login and get tokens
echo "=== Getting tokens ==="
BANK_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}')
BANK_TOKEN=$(echo "$BANK_RESPONSE" | jq -r '.data.token')

NBE_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"nbe_admin","password":"password123"}')
NBE_TOKEN=$(echo "$NBE_RESPONSE" | jq -r '.data.token')

CUSTOMS_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}')
CUSTOMS_TOKEN=$(echo "$CUSTOMS_RESPONSE" | jq -r '.data.token')

SHIPPING_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}')
SHIPPING_TOKEN=$(echo "$SHIPPING_RESPONSE" | jq -r '.data.token')

echo -e "\n========================================="
echo "TEST: Forex Conversion (PAY-TEST-001)"
echo "========================================="
curl -s -X POST "$API_URL/banking/payment/PAY-TEST-001/apply-forex" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "USD",
    "toCurrency": "ETB",
    "amount": 100000.00,
    "exchangeRate": 55.75,
    "conversionType": "SPOT",
    "conversionDate": "2024-11-10"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: HOUSE_BL Issuance"
echo "========================================="
curl -s -X POST "$API_URL/shipping/bookings/BK-TEST-005/bill-of-lading/issue" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blType": "HOUSE_BL",
    "blNumber": "HBL-TEST-UNIQUE-002",
    "masterBLNumber": "MBL-TEST-001",
    "shipper": "Actual Shipper",
    "consignee": "Actual Consignee",
    "vesselName": "MV CONTAINER KING",
    "portOfLoading": "Djibouti",
    "portOfDischarge": "Rotterdam",
    "cargoDescription": "Coffee Beans",
    "grossWeight": 10000.00,
    "packageCount": 200,
    "freightTerms": "FOB"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Booking Amendment"
echo "========================================="
curl -s -X PUT "$API_URL/shipping/bookings/BK-TEST-001/amend" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amendmentReason": "Change in container size",
    "originalDetails": {"containerType": "20FT", "quantity": 2},
    "amendedDetails": {"containerType": "40FT", "quantity": 1},
    "requestedBy": "EXP4886039"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Container Stuffing Report"
echo "========================================="
curl -s -X POST "$API_URL/shipping/containers/MAEU1234567/stuffing-report" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stuffingDate": "2024-11-10",
    "stuffingLocation": "Addis Ababa Warehouse",
    "supervisorName": "John Supervisor",
    "cargoDetails": [{"description": "Coffee", "packages": 300, "weight": 18000.00}],
    "sealNumber": "SEAL-78945612",
    "photos": ["photo1.jpg"]
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Declaration Amendment"
echo "========================================="
curl -s -X PUT "$API_URL/customs/declaration/DEC-1794312425/amend" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amendmentReason": "Correction in HS code",
    "originalValues": {"hsCode": "0901.11", "quantity": 18000},
    "amendedValues": {"hsCode": "0901.12", "quantity": 18000},
    "amendmentRequestedBy": "EXP4886039"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Duty Calculation"
echo "========================================="
curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/calculate-duty" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customsValue": 100000.00,
    "currency": "USD",
    "exchangeRate": 55.75,
    "hsCode": "0901.11",
    "originCountry": "Ethiopia"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Customs Valuation - TRANSACTION"
echo "========================================="
curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/valuation" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valuationMethod": "TRANSACTION",
    "invoiceValue": 100000.00,
    "invoiceCurrency": "USD",
    "adjustments": [
      {"type": "freight", "amount": 5000.00},
      {"type": "insurance", "amount": 1000.00}
    ],
    "isRelatedParty": false
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: UNAUTHORIZED_WITHDRAWAL Penalty"
echo "========================================="
curl -s -X POST "$API_URL/nbe/retention-accounts/1/calculate-penalty" \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "violationType": "UNAUTHORIZED_WITHDRAWAL",
    "requiredAmount": 20000.00,
    "actualAmount": 0.00,
    "notes": "Unauthorized withdrawal detected"
  }' | jq '.'
