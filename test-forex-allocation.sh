#!/bin/bash

# Quick test of forex allocation endpoint

API_URL="http://localhost:3001/api/v1"

# Login as admin
echo "Logging in as admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "❌ Admin login failed"
    echo "$ADMIN_RESPONSE" | jq '.'
    exit 1
fi

echo "✅ Admin logged in"

# Create a bank user for testing
echo "Creating bank user..."
BANK_CREATE=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "testbank",
    "email": "testbank@test.com",
    "password": "password123",
    "role": "BANKS",
    "organization": "Test Bank"
  }')

echo "Bank user response:"
echo "$BANK_CREATE" | jq '.'

# Login as bank
echo "Logging in as bank..."
BANK_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testbank","password":"password123"}')

BANK_TOKEN=$(echo "$BANK_RESPONSE" | jq -r '.data.token')

if [ -z "$BANK_TOKEN" ] || [ "$BANK_TOKEN" = "null" ]; then
    echo "❌ Bank login failed"
    echo "$BANK_RESPONSE" | jq '.'
    exit 1
fi

echo "✅ Bank logged in"

# Test forex allocation endpoint
echo "Testing forex allocation..."
LC_ID="LC-TEST-123"

FOREX_RESPONSE=$(curl -s -X POST "$API_URL/banking/lc/$LC_ID/allocate-forex" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -d '{
    "exchangeRate": 115.50,
    "allocatedAmount": 90000,
    "remarks": "Test forex allocation"
  }')

echo "Forex allocation response:"
echo "$FOREX_RESPONSE" | jq '.'

if echo "$FOREX_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Forex allocation endpoint works!"
else
    echo "❌ Forex allocation failed"
fi
