#!/bin/bash

OUTPUT_FILE="/tmp/lc-debug.txt"

echo "=== LC Creation Debug ===" > "$OUTPUT_FILE"
echo "Date: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Get tokens
echo "1. Authenticating users..." >> "$OUTPUT_FILE"

ECTA_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ecta","password":"password123"}')
ECTA_TOKEN=$(echo "$ECTA_LOGIN" | jq -r '.data.token // .token // empty')
echo "ECTA Token: ${ECTA_TOKEN:0:50}..." >> "$OUTPUT_FILE"

BANK_LOGIN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bank","password":"password123"}')
BANK_TOKEN=$(echo "$BANK_LOGIN" | jq -r '.data.token // .token // empty')
echo "Bank Token: ${BANK_TOKEN:0:50}..." >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"

# Try to create an LC
echo "2. Testing LC Creation..." >> "$OUTPUT_FILE"

LC_DATA='{
  "lcID": "LC-TEST-'$(date +%s)'",
  "contractID": "CONT-TEST-123",
  "exporterID": "EXP-TEST-123",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": 4250,
  "currency": "USD",
  "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
}'

echo "LC Data: $LC_DATA" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

LC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/banking/lc/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d "$LC_DATA")

echo "LC Response:" >> "$OUTPUT_FILE"
echo "$LC_RESPONSE" | jq . >> "$OUTPUT_FILE" 2>&1

echo "" >> "$OUTPUT_FILE"

# Check if the banking routes exist
echo "3. Checking Banking Routes..." >> "$OUTPUT_FILE"
BANKING_ROUTES=$(curl -s -X GET http://localhost:3001/api/v1/banking \
  -H "Authorization: Bearer $BANK_TOKEN")
echo "Banking routes response:" >> "$OUTPUT_FILE"
echo "$BANKING_ROUTES" | jq . >> "$OUTPUT_FILE" 2>&1

echo "" >> "$OUTPUT_FILE"

# Check API logs for LC-related errors
echo "4. Recent API logs (LC-related)..." >> "$OUTPUT_FILE"
docker logs cecbs-api 2>&1 | tail -100 | grep -i "lc\|letter\|credit\|banking" | tail -20 >> "$OUTPUT_FILE"

cat "$OUTPUT_FILE"
