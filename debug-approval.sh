#!/bin/bash

# Debug script to test approval with verbose output

API_URL="http://localhost:3001/api/v1"

# Login as admin
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token')

# Create ECTA user
ECTA_RESPONSE=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "ecta.debug",
    "email": "ecta.debug@ecta.gov.et",
    "password": "EctaPass123!",
    "fullName": "ECTA Debug",
    "organization": "ECTAMSP",
    "role": "ECTA",
    "phoneNumber": "+251911111112"
  }')

# Login as ECTA
ECTA_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "ecta.debug", "password": "EctaPass123!"}')

ECTA_TOKEN=$(echo "$ECTA_LOGIN" | jq -r '.data.token')

echo "Testing approval with SHORT timeout (10 seconds) to see immediate error..."
echo ""

# Try with a very short timeout to get the actual error quickly
QUICK_RESPONSE=$(curl -s --max-time 10 -X POST "$API_URL/exporters/exporter-applications/APP-1791893294510-WWPZTG/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ECTA_TOKEN" \
  -d '{
    "exporterId": "EXP-DEBUG-001",
    "ectaLicenseNumber": "ECTA-LIC-DEBUG-001",
    "licenseExpiryDate": "'$(date -d '+2 years' +%Y-%m-%d)'",
    "comments": "Debug test",
    "reviewedBy": "Debug Officer"
  }')

echo "Response after 10 seconds:"
echo "$QUICK_RESPONSE" | jq '.' 2>/dev/null || echo "$QUICK_RESPONSE"
echo ""
echo "Exit code: $?"

# Check if it's a timeout or actual error
if [ -z "$QUICK_RESPONSE" ]; then
    echo "⚠️  No response received - request timed out"
    echo ""
    echo "This suggests the blockchain network is:"
    echo "1. Not responding (peers down or not reachable)"
    echo "2. Taking too long to reach consensus"
    echo "3. Chaincode not deployed or initialized"
else
    echo "✓ Got a response (not a timeout)"
fi
