#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Get tokens
BANK_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')
CUSTOMS_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
SHIPPING_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')

echo "=== 1. Acceptance Financing Cost Calculation ==="
curl -s -X POST "$API_URL/banking/lc/LC-CNT-1794325819/acceptance-financing" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "financingAmount": 60000.00,
    "financingPeriod": 60,
    "tenor": 60,
    "interestRate": 7.5,
    "discountRate": 6.8,
    "financingBank": "Awash Bank",
    "acceptanceDate": "2024-12-15",
    "maturityDate": "2025-02-15"
  }' | jq '.'

echo -e "\n=== 2. FORWARD Forex Conversion ==="
curl -s -X POST "$API_URL/banking/payment/PAY-TEST-002/apply-forex" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentAmount": 50000.00,
    "currency": "EUR",
    "targetCurrency": "USD",
    "forexRate": 1.08,
    "conversionType": "FORWARD",
    "conversionDate": "2025-01-15",
    "settlementDate": "2025-03-15"
  }' | jq '.'

echo -e "\n=== 3. HOUSE_BL ==="
curl -s -X POST "$API_URL/shipping/bookings/BK-TEST-005/bill-of-lading/issue" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blType": "HOUSE_BL",
    "blNumber": "HBL-TEST-'$(date +%s)'",
    "masterBLNumber": "MBL-TEST-001",
    "shipper": "Test Shipper",
    "consignee": "Test Consignee",
    "vesselName": "MV TEST",
    "portOfLoading": "Djibouti",
    "portOfDischarge": "Rotterdam",
    "cargoDescription": "Coffee",
    "grossWeight": 10000.00,
    "packageCount": 200,
    "freightTerms": "FOB"
  }' | jq '.'

echo -e "\n=== 4. Duty Calculation ==="
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

echo -e "\n=== 5. Customs Valuation TRANSACTION ==="
curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/valuation" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valuationMethod": "TRANSACTION",
    "invoiceValue": 100000.00,
    "invoiceCurrency": "USD",
    "adjustedValue": 106000.00,
    "adjustments": [
      {"type": "freight", "amount": 5000.00},
      {"type": "insurance", "amount": 1000.00}
    ],
    "isRelatedParty": false
  }' | jq '.'
