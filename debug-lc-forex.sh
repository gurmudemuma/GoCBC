#!/bin/bash

echo "=== Testing LC and Forex Response Format ===" > /tmp/lc-forex-debug.txt
echo "" >> /tmp/lc-forex-debug.txt

# Authenticate
ECTA_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta_admin","password":"password123"}')
ECTA_TOKEN=$(echo "$ECTA_LOGIN" | jq -r '.data.token')

BANK_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank_admin","password":"password123"}')
BANK_TOKEN=$(echo "$BANK_LOGIN" | jq -r '.data.token')

NBE_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}')
NBE_TOKEN=$(echo "$NBE_LOGIN" | jq -r '.data.token')

# Test LC creation
echo "1. Testing LC Creation Response Format..." >> /tmp/lc-forex-debug.txt
LC_DATA='{
  "lcID": "LC-TEST-'$(date +%s)'",
  "contractID": "CONT-1793272266",
  "exporterID": "EXP-TEST-1793272256",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": 4250,
  "currency": "USD",
  "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
}'

LC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/banking/lc/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$LC_DATA")

echo "LC Response:" >> /tmp/lc-forex-debug.txt
echo "$LC_RESPONSE" | jq . >> /tmp/lc-forex-debug.txt 2>&1

LC_ID=$(echo "$LC_RESPONSE" | jq -r '.data.lcID // .data.lcId // empty')
echo "Extracted LC ID: '$LC_ID'" >> /tmp/lc-forex-debug.txt
if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
  echo "❌ LC ID extraction FAILED" >> /tmp/lc-forex-debug.txt
else
  echo "✅ LC ID extraction SUCCESS" >> /tmp/lc-forex-debug.txt
fi

echo "" >> /tmp/lc-forex-debug.txt

# Test Forex allocation
echo "2. Testing Forex Allocation Response Format..." >> /tmp/lc-forex-debug.txt
FOREX_DATA='{
  "forexID": "FOREX-TEST-'$(date +%s)'",
  "lcID": "'$LC_ID'",
  "contractID": "CONT-1793272266",
  "exporterID": "EXP-TEST-1793272256",
  "amount": 4250,
  "currency": "USD",
  "exchangeRate": 120.5
}'

FOREX_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/forex/allocate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -d "$FOREX_DATA")

echo "Forex Response:" >> /tmp/lc-forex-debug.txt
echo "$FOREX_RESPONSE" | jq . >> /tmp/lc-forex-debug.txt 2>&1

FOREX_ID=$(echo "$FOREX_RESPONSE" | jq -r '.data.forexID // .data.forexId // empty')
echo "Extracted Forex ID: '$FOREX_ID'" >> /tmp/lc-forex-debug.txt
if [ -z "$FOREX_ID" ] || [ "$FOREX_ID" = "null" ]; then
  echo "❌ Forex ID extraction FAILED" >> /tmp/lc-forex-debug.txt
else
  echo "✅ Forex ID extraction SUCCESS" >> /tmp/lc-forex-debug.txt
fi

echo "" >> /tmp/lc-forex-debug.txt

# Check what the workflow script expects
echo "3. What the workflow script expects..." >> /tmp/lc-forex-debug.txt
grep -A 5 "LC_ID=\$(echo" /home/guda/GoCBC/continue-workflow-from-existing.sh | head -6 >> /tmp/lc-forex-debug.txt
echo "" >> /tmp/lc-forex-debug.txt
grep -A 5 "FOREX_ID=\$(echo" /home/guda/GoCBC/continue-workflow-from-existing.sh | head -6 >> /tmp/lc-forex-debug.txt

cat /tmp/lc-forex-debug.txt
