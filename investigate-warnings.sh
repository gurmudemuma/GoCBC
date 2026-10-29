#!/bin/bash

echo "=== Investigating LC Approval and Forex Warnings ===" > /tmp/investigate.txt
echo "" >> /tmp/investigate.txt

# Authenticate
echo "Authenticating users..." >> /tmp/investigate.txt
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

echo "✓ Authenticated" >> /tmp/investigate.txt
echo "" >> /tmp/investigate.txt

# Test 1: LC Creation
echo "===== TEST 1: LC CREATION =====" >> /tmp/investigate.txt
LC_ID="LC-INV-$(date +%s)"
LC_RESP=$(timeout 15 curl -s -X POST http://localhost:3001/api/v1/banking/lc/request \
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
  }' 2>&1)

if [ $? -eq 124 ]; then
  echo "❌ LC creation TIMED OUT after 15s" >> /tmp/investigate.txt
else
  echo "LC Creation Response:" >> /tmp/investigate.txt
  echo "$LC_RESP" | jq . >> /tmp/investigate.txt 2>&1
  
  LC_ID_RESULT=$(echo "$LC_RESP" | jq -r '.data.lcID // empty')
  if [ -n "$LC_ID_RESULT" ] && [ "$LC_ID_RESULT" != "null" ]; then
    echo "✅ LC ID extracted: $LC_ID_RESULT" >> /tmp/investigate.txt
    
    # Test 2: LC Approval
    echo "" >> /tmp/investigate.txt
    echo "===== TEST 2: LC APPROVAL =====" >> /tmp/investigate.txt
    echo "Approving LC: $LC_ID_RESULT" >> /tmp/investigate.txt
    
    APPROVE_RESP=$(timeout 15 curl -s -X POST "http://localhost:3001/api/v1/banking/lc/$LC_ID_RESULT/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BANK_TOKEN" \
      -d '{"notes": "LC approved by issuing bank"}' 2>&1)
    
    if [ $? -eq 124 ]; then
      echo "❌ LC approval TIMED OUT after 15s" >> /tmp/investigate.txt
    else
      echo "LC Approval Response:" >> /tmp/investigate.txt
      echo "$APPROVE_RESP" | jq . >> /tmp/investigate.txt 2>&1
      
      if echo "$APPROVE_RESP" | grep -q '"success":true'; then
        echo "✅ LC approval SUCCESS" >> /tmp/investigate.txt
      else
        echo "❌ LC approval FAILED" >> /tmp/investigate.txt
      fi
    fi
  else
    echo "❌ LC ID not extracted from response" >> /tmp/investigate.txt
  fi
fi

# Test 3: Forex Creation
echo "" >> /tmp/investigate.txt
echo "===== TEST 3: FOREX CREATION =====" >> /tmp/investigate.txt
FOREX_ID="FOREX-INV-$(date +%s)"
echo "Creating Forex: $FOREX_ID" >> /tmp/investigate.txt

FOREX_RESP=$(timeout 15 curl -s -X POST http://localhost:3001/api/v1/forex \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{
    "forexID": "'$FOREX_ID'",
    "contractID": "CONT-1793272973",
    "exporterID": "EXP-TEST-1793272962",
    "lcNumber": "'$LC_ID_RESULT'",
    "amount": 4250,
    "currency": "USD",
    "status": "pending"
  }' 2>&1)

if [ $? -eq 124 ]; then
  echo "❌ Forex creation TIMED OUT after 15s" >> /tmp/investigate.txt
else
  echo "Forex Creation Response:" >> /tmp/investigate.txt
  echo "$FOREX_RESP" | jq . >> /tmp/investigate.txt 2>&1
  
  FOREX_ID_RESULT=$(echo "$FOREX_RESP" | jq -r '.data.forexID // .data.forexId // empty')
  if [ -n "$FOREX_ID_RESULT" ] && [ "$FOREX_ID_RESULT" != "null" ]; then
    echo "✅ Forex ID extracted: $FOREX_ID_RESULT" >> /tmp/investigate.txt
  else
    echo "❌ Forex ID not extracted from response" >> /tmp/investigate.txt
  fi
fi

echo "" >> /tmp/investigate.txt
echo "===== INVESTIGATION COMPLETE =====" >> /tmp/investigate.txt

cat /tmp/investigate.txt
