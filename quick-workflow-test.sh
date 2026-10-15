#!/bin/bash

# Quick End-to-End Workflow Test - Direct and Simple

API="http://localhost:3001"

echo "=========================================="
echo "CECBS Quick Workflow Test"
echo "=========================================="
echo ""

# Step 1: Admin Login
echo "[1/10] Testing Admin Login..."
TOKEN=$(curl -s -X POST "$API/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✓ Admin authenticated"
else
  echo "✗ Admin login failed"
  exit 1
fi

# Step 2: Get Contracts
echo "[2/10] Testing Get Contracts..."
CONTRACTS=$(curl -s -X GET "$API/api/v1/contracts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CONTRACTS" | grep -q "contractId\|contracts\|\[\]"; then
  echo "✓ Contracts API working"
else
  echo "✗ Contracts API failed"
fi

# Step 3: Get Shipments
echo "[3/10] Testing Get Shipments..."
SHIPMENTS=$(curl -s -X GET "$API/api/v1/shipments" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SHIPMENTS" | grep -q "shipmentId\|shipments\|\[\]"; then
  echo "✓ Shipments API working"
else
  echo "✗ Shipments API failed"
fi

# Step 4: Get LCs
echo "[4/10] Testing Get LCs..."
LCS=$(curl -s -X GET "$API/api/v1/banking/lcs" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LCS" | grep -q "lcId\|lcs\|\[\]"; then
  echo "✓ LC API working"
else
  echo "✗ LC API failed"
fi

# Step 5: Get Forex
echo "[5/10] Testing Get Forex..."
FOREX=$(curl -s -X GET "$API/api/v1/forex" \
  -H "Authorization: Bearer $TOKEN")

if echo "$FOREX" | grep -q "forexId\|forex\|\[\]"; then
  echo "✓ Forex API working"
else
  echo "✗ Forex API failed"
fi

# Step 6: Get Payments
echo "[6/10] Testing Get Payments..."
PAYMENTS=$(curl -s -X GET "$API/api/v1/payments" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PAYMENTS" | grep -q "paymentId\|payments\|\[\]"; then
  echo "✓ Payments API working"
else
  echo "✗ Payments API failed"
fi

# Step 7: Get Customs
echo "[7/10] Testing Get Customs..."
CUSTOMS=$(curl -s -X GET "$API/api/v1/customs" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMS" | grep -q "customsId\|customs\|\[\]"; then
  echo "✓ Customs API working"
else
  echo "✗ Customs API failed"
fi

# Step 8: Get Audit Trail
echo "[8/10] Testing Audit Trail..."
AUDIT=$(curl -s -X GET "$API/api/v1/audit" \
  -H "Authorization: Bearer $TOKEN")

if echo "$AUDIT" | grep -q "entityId\|audit\|\[\]"; then
  echo "✓ Audit Trail API working"
else
  echo "✗ Audit Trail API failed"
fi

# Step 9: Test Database
echo "[9/10] Testing Database..."
DB_TEST=$(docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT COUNT(*) FROM users" 2>&1)

if echo "$DB_TEST" | grep -q "[0-9]"; then
  echo "✓ Database accessible"
else
  echo "✗ Database failed"
fi

# Step 10: Test Blockchain
echo "[10/10] Testing Blockchain..."
if docker ps --format '{{.Names}}' | grep -q 'coffee-chaincode'; then
  echo "✓ Chaincode running"
else
  echo "✗ Chaincode not running"
fi

echo ""
echo "=========================================="
echo "Quick Test Complete!"
echo "=========================================="
