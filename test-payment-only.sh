#!/bin/bash

API_BASE="http://localhost:5001/api/v1"

echo "=== Testing Payment Release ==="
echo ""

# Get latest payment ID from database
echo "1. Finding latest payment..."
PAYMENT_ID=$(curl -s -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ -z "$PAYMENT_ID" ]; then
    PAYMENT_ID="PAY-E2E-1793608688"
fi

EXPORTER_ID="EXP-E2E-1793608688"

echo "Payment ID: $PAYMENT_ID"
echo "Exporter ID: $EXPORTER_ID"
echo ""

# Login as NBE
echo "2. Logging in as NBE admin..."
NBE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{"username":"nbe_admin","password":"password123"}')

echo "Login response:"
echo "$NBE_RESPONSE" | jq '.' 2>/dev/null || echo "$NBE_RESPONSE"
echo ""

NBE_TOKEN=$(echo "$NBE_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NBE_TOKEN" ]; then
    echo "ERROR: Failed to get NBE token"
    exit 1
fi

echo "NBE Token obtained: ${NBE_TOKEN:0:20}..."
echo ""

# Release payment
echo "3. Releasing payment..."
RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments/$PAYMENT_ID/release" \
  -d "{
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 135000,
    \"releaseDate\": \"2026-11-02\"
  }")

echo "Release response:"
echo "$RELEASE_RESPONSE" | jq '.' 2>/dev/null || echo "$RELEASE_RESPONSE"
echo ""

if echo "$RELEASE_RESPONSE" | grep -q '"success":true'; then
    echo "✓ SUCCESS: Payment released"
    exit 0
else
    echo "✗ FAILED: Payment release failed"
    exit 1
fi
