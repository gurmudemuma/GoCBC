#!/bin/bash

echo "=== Testing LC Approval and Forex Allocation ===" > /tmp/lc-approval-forex-test.txt
echo "" >> /tmp/lc-approval-forex-test.txt

# Auth
ECTA_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}')
ECTA_TOKEN=$(echo "$ECTA_LOGIN" | jq -r '.data.token')

BANK_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}')
BANK_TOKEN=$(echo "$BANK_LOGIN" | jq -r '.data.token')

# 1. Create LC
LC_ID="LC-TEST-$(date +%s)"
LC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/banking/lc/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d '{
    "lcID": "'$LC_ID'",
    "contractID": "CONT-1793272973",
    "exporterID": "EXP-TEST-1793272962",
    "bankName": "Commercial Bank of Ethiopia",
    "amount": 4250,
    "currency": "USD",
    "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
  }')

echo "1. LC Creation Response:" >> /tmp/lc-approval-forex-test.txt
echo "$LC_RESPONSE" | jq . >> /tmp/lc-approval-forex-test.txt
LC_ID_EXTRACTED=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // empty')
echo "Extracted LC ID: $LC_ID_EXTRACTED" >> /tmp/lc-approval-forex-test.txt
echo "" >> /tmp/lc-approval-forex-test.txt

# 2. Approve LC
echo "2. LC Approval Request (POST /banking/lc/$LC_ID_EXTRACTED/approve):" >> /tmp/lc-approval-forex-test.txt
APPROVE_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/v1/banking/lc/$LC_ID_EXTRACTED/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{"notes": "LC approved by issuing bank"}')
echo "$APPROVE_RESPONSE" | jq . >> /tmp/lc-approval-forex-test.txt
echo "" >> /tmp/lc-approval-forex-test.txt

# 3. Create Forex
FOREX_ID="FOREX-TEST-$(date +%s)"
echo "3. Forex Creation Request (POST /forex):" >> /tmp/lc-approval-forex-test.txt
FOREX_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/forex \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{
    "forexID": "'$FOREX_ID'",
    "contractID": "CONT-1793272973",
    "exporterID": "EXP-TEST-1793272962",
    "lcNumber": "'$LC_ID_EXTRACTED'",
    "amount": 4250,
    "currency": "USD",
    "status": "pending"
  }')
echo "$FOREX_RESPONSE" | jq . >> /tmp/lc-approval-forex-test.txt
FOREX_ID_EXTRACTED=$(echo "$FOREX_RESPONSE" | jq -r '.data.forexID // .data.forexId // empty')
echo "Extracted Forex ID: $FOREX_ID_EXTRACTED" >> /tmp/lc-approval-forex-test.txt

cat /tmp/lc-approval-forex-test.txt
