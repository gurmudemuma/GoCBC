#!/bin/bash

echo "=== Testing Real Authentication ===" > /tmp/real-auth-test.txt
echo "" >> /tmp/real-auth-test.txt

# Test authentication with the actual users
echo "1. Testing ECTA admin login..." >> /tmp/real-auth-test.txt
ECTA_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}')
echo "$ECTA_RESPONSE" | jq . >> /tmp/real-auth-test.txt 2>&1
ECTA_TOKEN=$(echo "$ECTA_RESPONSE" | jq -r '.data.token // empty')
echo "ECTA Token extracted: ${ECTA_TOKEN:0:50}..." >> /tmp/real-auth-test.txt
echo "" >> /tmp/real-auth-test.txt

echo "2. Testing Bank admin login..." >> /tmp/real-auth-test.txt
BANK_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}')
echo "$BANK_RESPONSE" | jq . >> /tmp/real-auth-test.txt 2>&1
BANK_TOKEN=$(echo "$BANK_RESPONSE" | jq -r '.data.token // empty')
echo "Bank Token extracted: ${BANK_TOKEN:0:50}..." >> /tmp/real-auth-test.txt
echo "" >> /tmp/real-auth-test.txt

if [ -n "$ECTA_TOKEN" ] && [ "$ECTA_TOKEN" != "null" ]; then
  echo "3. Testing LC creation with valid token..." >> /tmp/real-auth-test.txt
  LC_DATA='{
    "lcID": "LC-TEST-'$(date +%s)'",
    "contractID": "CONT-1793271357",
    "exporterID": "EXP-TEST-1793271347",
    "bankName": "Commercial Bank of Ethiopia",
    "amount": 4250,
    "currency": "USD",
    "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
  }'
  
  LC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/banking/lc/request \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ECTA_TOKEN" \
    -d "$LC_DATA")
  echo "LC Creation Response:" >> /tmp/real-auth-test.txt
  echo "$LC_RESPONSE" | jq . >> /tmp/real-auth-test.txt 2>&1
else
  echo "❌ Cannot test LC creation - no valid ECTA token" >> /tmp/real-auth-test.txt
fi

cat /tmp/real-auth-test.txt
