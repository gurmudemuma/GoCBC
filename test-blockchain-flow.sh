#!/bin/bash

set -e

echo "=========================================="
echo "  Testing Blockchain Integration Flow"
echo "=========================================="
echo ""

# Step 1: Login as ECTA admin
echo "1. Logging in as ECTA admin..."
login_response=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ectaAdmin","password":"password123"}')

ecta_token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')

if [ -z "$ecta_token" ]; then
  echo "❌ Login failed"
  echo "Response: $login_response"
  exit 1
fi

echo "✓ Logged in (token: ${ecta_token:0:20}...)"
echo ""

# Step 2: Check if we have blockchain connectivity
echo "2. Testing blockchain query..."
query_response=$(curl -s "http://localhost:3001/api/v1/blockchain/query/exporter/TEST123" \
  -H "Authorization: Bearer $ecta_token")

echo "Query response: $query_response"
echo ""

# Step 3: Try to invoke chaincode directly
echo "3. Testing chaincode invocation (create exporter)..."
invoke_response=$(curl -s -X POST "http://localhost:3001/api/v1/blockchain/invoke" \
  -H "Authorization: Bearer $ecta_token" \
  -H "Content-Type: application/json" \
  -d '{
    "fcn": "createExporter",
    "args": ["TEST-EXP-001", "Test Exporter Ltd", "Active"]
  }')

echo "Invoke response: $invoke_response"
echo ""

# Step 4: Query what we just created
echo "4. Querying created exporter..."
query2_response=$(curl -s "http://localhost:3001/api/v1/blockchain/query/exporter/TEST-EXP-001" \
  -H "Authorization: Bearer $ecta_token")

echo "Query response: $query2_response"
echo ""

echo "=========================================="
echo "  Test Complete"
echo "=========================================="
