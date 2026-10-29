#!/bin/bash

echo "=== Testing LC Response After Restart ===" > /tmp/lc-test-only.txt

# Authenticate
ECTA_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}')
ECTA_TOKEN=$(echo "$ECTA_LOGIN" | jq -r '.data.token')

# Create LC
LC_NUMBER="LC-TEST-$(date +%s)"
LC_DATA='{
  "lcID": "'$LC_NUMBER'",
  "contractID": "CONT-1793272266",
  "exporterID": "EXP-TEST-1793272256",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": 4250,
  "currency": "USD",
  "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
}'

echo "Sending LC request: $LC_NUMBER" >> /tmp/lc-test-only.txt
LC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/banking/lc/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$LC_DATA")

echo "LC Response:" >> /tmp/lc-test-only.txt
echo "$LC_RESPONSE" | jq . >> /tmp/lc-test-only.txt

LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // .data.lcId // empty')
echo "" >> /tmp/lc-test-only.txt
echo "Extracted LC ID: '$LC_ID'" >> /tmp/lc-test-only.txt

if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
  echo "❌ LC ID extraction FAILED" >> /tmp/lc-test-only.txt
else
  echo "✅ LC ID extraction SUCCESS: $LC_ID" >> /tmp/lc-test-only.txt
fi

cat /tmp/lc-test-only.txt
