#!/bin/bash

# Simple test for payment release endpoint

API_BASE="http://localhost:3001/api/v1"

# Test values
PAYMENT_ID="PAY-E2E-1793607494"  # From last successful run
EXPORTER_ID="EXP-E2E-1793607494"

echo "=== Testing Payment Release Endpoint ==="
echo ""

# Step 1: Login as NBE admin
echo "1. Logging in as NBE admin..."
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  "$API_BASE/auth/login" \
  -d '{"username":"nbe_admin","password":"password123"}')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

NBE_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NBE_TOKEN" ]; then
    echo "ERROR: Failed to get NBE token"
    exit 1
fi

echo "NBE Token: ${NBE_TOKEN:0:20}..."
echo ""

# Step 2: Release payment
echo "2. Releasing payment..."
echo "Payment ID: $PAYMENT_ID"
echo "Exporter ID: $EXPORTER_ID"
echo ""

RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/payments/$PAYMENT_ID/release" \
  -d "{
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 135000,
    \"releaseDate\": \"2026-11-02\"
  }")

echo "Release Response:"
echo "$RELEASE_RESPONSE" | jq '.' 2>/dev/null || echo "$RELEASE_RESPONSE"
echo ""

# Check if successful
if echo "$RELEASE_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Payment released successfully!"
else
    echo "✗ Payment release failed"
    exit 1
fi
