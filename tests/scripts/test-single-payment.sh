#!/bin/bash

API_BASE="http://localhost:5001/api/v1"

echo "=== Testing Payment Recording ==="

# Login
TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:20}..."

# Record payment
echo ""
echo "Recording payment..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments/record" \
  -d '{
    "paymentID": "PAY-TEST-001",
    "contractID": "CONTRACT-E2E-1793614023",
    "shipmentID": "SHIP-E2E-1793614023",
    "exporterID": "EXP-E2E-1793614023",
    "lcID": "LC-E2E-1793614023",
    "amountUSD": 135000,
    "currency": "USD",
    "swiftReference": "SWIFT-TEST-001",
    "paymentDate": "2026-11-02",
    "payerName": "European Coffee Importers GmbH",
    "payerBank": "Deutsche Bank AG"
  }' | jq '.'
