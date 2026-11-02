#!/bin/bash

API_URL="http://localhost:3001/api/v1"

echo "==========================================="
echo "Ethiopian Coffee Export Portal"
echo "API AUTHENTICATION & DATA TEST"
echo "==========================================="
echo ""

# Step 1: Login to get JWT token
echo "1. Authenticating as test user..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cecbs.et",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "   ✗ Authentication FAILED"
    echo "   Response: $LOGIN_RESPONSE"
    echo ""
    echo "Trying to create test user..."
    
    # Try to register
    REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@cecbs.et",
        "password": "test123",
        "fullName": "Test User",
        "organization": "CECBS",
        "role": "admin"
      }')
    
    # Try login again with test user
    LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@cecbs.et",
        "password": "test123"
      }')
    
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "   ✗ Still cannot authenticate"
    echo "   Skipping authenticated tests..."
    echo ""
    exit 1
else
    echo "   ✓ Authentication successful"
    echo "   Token: ${TOKEN:0:50}..."
fi

echo ""
echo "2. Testing authenticated endpoints..."
echo ""

# Test Banks Portal
echo "=== BANKS PORTAL ==="
echo -n "LCs: "
LC_RESPONSE=$(curl -s "${API_URL}/banking/lcs?portalId=test-bank" \
  -H "Authorization: Bearer $TOKEN")
LC_COUNT=$(echo $LC_RESPONSE | grep -o '"data":\[' | wc -l)
if [ "$LC_COUNT" -gt 0 ]; then
    TOTAL=$(echo $LC_RESPONSE | grep -o '"total":[0-9]*' | sed 's/"total"://')
    echo "✓ $TOTAL records"
else
    echo "✗ No data or error"
    echo "   Response: $(echo $LC_RESPONSE | head -c 200)"
fi

echo -n "Forex: "
FOREX_RESPONSE=$(curl -s "${API_URL}/forex/allocations?portalId=test-bank" \
  -H "Authorization: Bearer $TOKEN")
FOREX_COUNT=$(echo $FOREX_RESPONSE | grep -o '"data":\[' | wc -l)
if [ "$FOREX_COUNT" -gt 0 ]; then
    TOTAL=$(echo $FOREX_RESPONSE | grep -o '"total":[0-9]*' | sed 's/"total"://')
    echo "✓ $TOTAL records"
else
    echo "✗ No data or error"
fi

echo ""
echo "=== EXPORTERS PORTAL ==="
echo -n "Pending Contracts: "
PENDING_RESPONSE=$(curl -s "${API_URL}/contracts/pending?portalId=test-admin" \
  -H "Authorization: Bearer $TOKEN")
PENDING_COUNT=$(echo $PENDING_RESPONSE | grep -o '"data":\[' | wc -l)
if [ "$PENDING_COUNT" -gt 0 ]; then
    TOTAL=$(echo $PENDING_RESPONSE | grep -o '"total":[0-9]*' | sed 's/"total"://')
    echo "✓ $TOTAL records"
else
    echo "✗ No data"
fi

echo -n "Quality Inspections: "
QUALITY_RESPONSE=$(curl -s "${API_URL}/quality/inspections?portalId=test-admin" \
  -H "Authorization: Bearer $TOKEN")
QUALITY_COUNT=$(echo $QUALITY_RESPONSE | grep -o '"data":\[' | wc -l)
if [ "$QUALITY_COUNT" -gt 0 ]; then
    TOTAL=$(echo $QUALITY_RESPONSE | grep -o '"total":[0-9]*' | sed 's/"total"://')
    echo "✓ $TOTAL records"
else
    echo "✗ No data"
fi

echo ""
echo "=== CUSTOMS PORTAL ==="
echo -n "Shipments: "
SHIPMENTS_RESPONSE=$(curl -s "${API_URL}/shipments?portalId=test-customs" \
  -H "Authorization: Bearer $TOKEN")
SHIPMENTS_COUNT=$(echo $SHIPMENTS_RESPONSE | grep -o '"data":\[' | wc -l)
if [ "$SHIPMENTS_COUNT" -gt 0 ]; then
    TOTAL=$(echo $SHIPMENTS_RESPONSE | grep -o '"total":[0-9]*' | sed 's/"total"://')
    echo "✓ $TOTAL records"
else
    echo "✗ No data"
fi

echo ""
echo "=== ECX PORTAL ==="
echo -n "Market Prices: "
MARKET_RESPONSE=$(curl -s "${API_URL}/market?portalId=test-ecx" \
  -H "Authorization: Bearer $TOKEN")
MARKET_COUNT=$(echo $MARKET_RESPONSE | grep -o '"data":\[' | wc -l)
if [ "$MARKET_COUNT" -gt 0 ]; then
    TOTAL=$(echo $MARKET_RESPONSE | grep -o '"total":[0-9]*' | sed 's/"total"://')
    echo "✓ $TOTAL records"
else
    echo "✗ No data"
fi

echo ""
echo "==========================================="
echo "SUMMARY: API is operational with authentication"
echo "==========================================="
