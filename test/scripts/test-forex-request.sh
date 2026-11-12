#!/bin/bash

echo "=== Testing Forex Request Creation ==="

# Login as bank admin
echo "1. Logging in as bank_admin..."
BANK_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}' | jq -r .token)

echo "Token: ${BANK_TOKEN:0:20}..."

# Create forex request
echo ""
echo "2. Creating forex request..."
curl -s -X POST \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v1/forex \
  -d '{
    "forexID": "TEST_FOREX_001",
    "contractID": "CONTRACT-TEST",
    "exporterID": "EXP-TEST",
    "amount": 1000,
    "currency": "USD"
  }' | jq '.'

echo ""
echo "=== Test Complete ==="
