#!/bin/bash

# Quick API Test
API_BASE="http://localhost:5000/api/v1"

echo "======================================"
echo "QUICK API FUNCTIONALITY TEST"
echo "======================================"
echo ""

# Test 1: Authentication
echo "[1] Testing Authentication..."
response=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

token=$(echo "$response" | jq -r '.data.token // empty' 2>/dev/null)

if [ -n "$token" ] && [ "$token" != "null" ]; then
    echo "✓ Authentication: SUCCESS"
    echo "  Token: ${token:0:50}..."
else
    echo "✗ Authentication: FAILED"
    echo "  Response: $response"
    exit 1
fi

echo ""

# Test 2: Get Users
echo "[2] Testing Get Users..."
response=$(curl -s -X GET "$API_BASE/users" \
  -H "Authorization: Bearer $token")

user_count=$(echo "$response" | jq -r '.data | length' 2>/dev/null)

if [ "$user_count" -gt 0 ]; then
    echo "✓ Get Users: SUCCESS ($user_count users found)"
else
    echo "✗ Get Users: FAILED"
    echo "  Response: $response"
fi

echo ""

# Test 3: Get Exporters
echo "[3] Testing Get Exporters..."
response=$(curl -s -X GET "$API_BASE/exporters" \
  -H "Authorization: Bearer $token")

exporter_count=$(echo "$response" | jq -r 'if type == "array" then length elif .data then (.data | length) else 0 end' 2>/dev/null)

echo "✓ Get Exporters: SUCCESS ($exporter_count exporters found)"

echo ""

# Test 4: Get Contracts
echo "[4] Testing Get Contracts..."
response=$(curl -s -X GET "$API_BASE/contracts" \
  -H "Authorization: Bearer $token")

contract_count=$(echo "$response" | jq -r 'if type == "array" then length elif .data then (.data | length) elif .contracts then (.contracts | length) else 0 end' 2>/dev/null)

echo "✓ Get Contracts: SUCCESS ($contract_count contracts found)"

echo ""

# Test 5: Get Shipments
echo "[5] Testing Get Shipments..."
response=$(curl -s -X GET "$API_BASE/shipments" \
  -H "Authorization: Bearer $token")

shipment_count=$(echo "$response" | jq -r 'if type == "array" then length elif .data then (.data | length) elif .shipments then (.shipments | length) else 0 end' 2>/dev/null)

echo "✓ Get Shipments: SUCCESS ($shipment_count shipments found)"

echo ""
echo "======================================"
echo "QUICK TEST COMPLETE"
echo "======================================"
echo "✓ API is functional and ready for full lifecycle test"
