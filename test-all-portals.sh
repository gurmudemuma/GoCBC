#!/bin/bash
# Test all portal data endpoints

echo "=== Testing All Portal Data Endpoints ==="
echo ""

API="http://localhost:3001/api/v1"

# Test authentication first
echo "1. Testing Authentication..."
LOGIN_RESPONSE=$(curl -s -X POST ${API}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"exporter1","password":"exporter1"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Test each portal's primary endpoint
echo "2. Testing Exporter Portal - Shipments..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/shipments \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Exporter Portal: Shipments loaded"
else
  echo "❌ Exporter Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "3. Testing Exporter Portal - Contracts..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/contracts \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Exporter Portal: Contracts loaded"
else
  echo "❌ Exporter Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "4. Testing ECTA Portal - Inspections..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/quality/inspections \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ ECTA Portal: Inspections loaded"
else
  echo "❌ ECTA Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "5. Testing Customs Portal - Declarations..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/customs/declarations \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Customs Portal: Declarations loaded"
else
  echo "❌ Customs Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "6. Testing Shipping Portal - Shipments..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/shipments \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Shipping Portal: Shipments loaded"
else
  echo "❌ Shipping Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "7. Testing Banks Portal - Payments..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/banking/payments \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Banks Portal: Payments loaded"
else
  echo "❌ Banks Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "8. Testing NBE Portal - Contracts..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/contracts \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ NBE Portal: Contracts loaded"
else
  echo "❌ NBE Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "9. Testing ECX Portal - Lots..."
RESPONSE=$(curl -s -w "\n%{http_code}" ${API}/ecx/lots \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ ECX Portal: Lots loaded"
else
  echo "❌ ECX Portal: Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "Check API logs for query details:"
echo "  tail -50 api/logs/combined.log | grep 'Chaincode query'"
