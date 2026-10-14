#!/bin/bash

API_URL="http://localhost:3001/api/v1"

echo "======================================"
echo "QUICK TEST - Forex & Shipment Status"
echo "======================================"

# Login as admin
echo -e "\n[1] Admin Login..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "❌ Admin login failed"
    exit 1
fi
echo "✅ Admin logged in"

# Create bank user
echo -e "\n[2] Creating Bank User..."
TIMESTAMP=$(date +%s)
BANK_USER="bank_test_$TIMESTAMP"
curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "'$BANK_USER'",
    "email": "'$BANK_USER'@test.com",
    "password": "password123",
    "role": "BANKS",
    "organization": "Commercial Bank of Ethiopia"
  }' > /dev/null

# Login as bank
echo "[3] Bank Login..."
BANK_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"'$BANK_USER'","password":"password123"}' | jq -r '.data.token')

if [ -z "$BANK_TOKEN" ] || [ "$BANK_TOKEN" = "null" ]; then
    echo "❌ Bank login failed"
    exit 1
fi
echo "✅ Bank logged in"

# Test: Check if forex allocation endpoint exists
echo -e "\n[4] Testing Forex Allocation Endpoint..."
echo "Testing with dummy LC (will fail if LC doesn't exist, but tests endpoint availability)"

FOREX_TEST=$(curl -s -X POST "$API_URL/banking/lc/LC-TEST-123/allocate-forex" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{
    "exchangeRate": 115.50,
    "allocatedAmount": 90000,
    "remarks": "Test forex allocation"
  }')

echo "Response:"
echo "$FOREX_TEST" | jq '.'

# Check if endpoint exists (even if LC doesn't exist, we should get proper error, not 404)
if echo "$FOREX_TEST" | jq -e '.error.code == "LC_NOT_FOUND"' > /dev/null 2>&1; then
    echo "✅ Forex allocation endpoint exists and works correctly!"
elif echo "$FOREX_TEST" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Forex allocation successful!"
elif echo "$FOREX_TEST" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_CODE=$(echo "$FOREX_TEST" | jq -r '.error.code')
    echo "⚠️  Endpoint exists but returned error: $ERROR_CODE"
else
    echo "❌ Unexpected response format"
fi

# Test: Run a quick LC workflow to test forex allocation
echo -e "\n[5] Testing Complete LC → Forex Workflow..."
echo "This will create a real LC and allocate forex..."

# Create LC
LC_ID="LC-TEST-$TIMESTAMP"
echo "Creating LC: $LC_ID"

LC_CREATE=$(curl -s -X POST "$API_URL/banking/lc/request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{
    "lcID": "'$LC_ID'",
    "contractID": "SC-DUMMY-123",
    "exporterID": "EXP-DUMMY-123",
    "bankName": "Commercial Bank of Ethiopia",
    "amount": "90000",
    "currency": "USD",
    "expiryDate": "'$(date -d '+90 days' +%Y-%m-%d)'"
  }')

if echo "$LC_CREATE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ LC created: $LC_ID"
    
    # Approve LC
    sleep 1
    LC_APPROVE=$(curl -s -X POST "$API_URL/banking/lc/$LC_ID/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BANK_TOKEN" \
      -d '{"comments": "Test approval"}')
    
    if echo "$LC_APPROVE" | jq -e '.success == true' > /dev/null 2>&1; then
        echo "✅ LC approved"
        
        # Issue LC
        sleep 1
        LC_ISSUE=$(curl -s -X POST "$API_URL/banking/lc/$LC_ID/issue" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $BANK_TOKEN" \
          -d '{"terms": "Test terms"}')
        
        if echo "$LC_ISSUE" | jq -e '.success == true' > /dev/null 2>&1; then
            echo "✅ LC issued"
            
            # ALLOCATE FOREX - THE KEY TEST
            sleep 1
            echo -e "\n🎯 ALLOCATING FOREX..."
            FOREX_ALLOC=$(curl -s -X POST "$API_URL/banking/lc/$LC_ID/allocate-forex" \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer $BANK_TOKEN" \
              -d '{
                "exchangeRate": 115.50,
                "allocatedAmount": 90000,
                "remarks": "Forex allocated for test transaction"
              }')
            
            echo "Forex Allocation Response:"
            echo "$FOREX_ALLOC" | jq '.'
            
            if echo "$FOREX_ALLOC" | jq -e '.success == true' > /dev/null 2>&1; then
                echo "✅✅✅ FOREX ALLOCATION SUCCESSFUL!"
                TX_ID=$(echo "$FOREX_ALLOC" | jq -r '.txId')
                echo "    Blockchain TxID: $TX_ID"
                
                # Verify LC status in CouchDB
                echo -e "\n[6] Verifying LC Status in CouchDB..."
                LC_DATA=$(curl -s "http://admin:adminpw@localhost:5984/coffeechannel_coffee/LC_$LC_ID")
                STATUS=$(echo "$LC_DATA" | jq -r '.Status')
                FOREX_AMT=$(echo "$LC_DATA" | jq -r '.ForexAllocated')
                RATE=$(echo "$LC_DATA" | jq -r '.ExchangeRate')
                
                echo "LC Status: $STATUS"
                echo "Forex Allocated: $FOREX_AMT"
                echo "Exchange Rate: $RATE"
                
                if [ "$STATUS" = "FOREX_ALLOCATED" ]; then
                    echo "✅✅✅ LC STATUS CORRECTLY SET TO FOREX_ALLOCATED!"
                else
                    echo "⚠️  LC status is: $STATUS (expected: FOREX_ALLOCATED)"
                fi
            else
                echo "❌ Forex allocation failed"
                echo "$FOREX_ALLOC" | jq '.error'
            fi
        else
            echo "❌ LC issue failed"
        fi
    else
        echo "❌ LC approval failed"
    fi
else
    echo "❌ LC creation failed"
    echo "$LC_CREATE" | jq '.'
fi

echo -e "\n======================================"
echo "TEST COMPLETE"
echo "======================================"
