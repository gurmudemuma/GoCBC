#!/bin/bash
# Test Forex Repatriation API Endpoint with Fresh Authentication

set -e

echo "=========================================="
echo "FOREX REPATRIATION API TEST"
echo "=========================================="
echo ""

API_URL="http://localhost:3001"

# Step 1: Login to get fresh token
echo "🔑 Step 1: Getting fresh authentication token..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "Login response: $LOGIN_RESPONSE" | head -c 200
echo ""

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .data.token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to get authentication token"
  echo "Full response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:30}..."
echo ""

# Step 2: Test GET /api/v1/repatriation
echo "🧪 Step 2: Testing GET /api/v1/repatriation..."
echo ""

REPATRIATION_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/repatriation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$REPATRIATION_RESPONSE" | jq . 2>/dev/null || echo "$REPATRIATION_RESPONSE"
echo ""

# Check if successful
if echo "$REPATRIATION_RESPONSE" | grep -q '"success":true'; then
  echo "✅ SUCCESS: Repatriation API is working!"
  
  # Count records
  COUNT=$(echo "$REPATRIATION_RESPONSE" | jq -r '.count // 0' 2>/dev/null)
  echo "📊 Found $COUNT repatriation records"
else
  echo "⚠️  API returned error or no data"
  if echo "$REPATRIATION_RESPONSE" | grep -q "AUTHENTICATION_ERROR"; then
    echo "❌ Authentication still failing - check API server"
  fi
fi

echo ""

# Step 3: Test other endpoints
echo "🧪 Step 3: Testing additional endpoints..."
echo ""

# Test overdue endpoint
echo "Testing GET /api/v1/repatriation/overdue/all"
OVERDUE_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/repatriation/overdue/all" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$OVERDUE_RESPONSE" | grep -q '"success":true'; then
  OVERDUE_COUNT=$(echo "$OVERDUE_RESPONSE" | jq -r '.data | length' 2>/dev/null)
  echo "✅ Overdue endpoint working - $OVERDUE_COUNT overdue records"
else
  echo "⚠️  Overdue endpoint returned: $(echo $OVERDUE_RESPONSE | head -c 100)"
fi

echo ""

# Step 4: Check blockchain connection
echo "🔗 Step 4: Testing blockchain connectivity..."
echo ""

HEALTH_RESPONSE=$(curl -s -X GET "$API_URL/api/health")
echo "Health check: $HEALTH_RESPONSE" | head -c 200
echo ""

echo ""
echo "=========================================="
echo "TEST COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Authentication: ✅ Working (token obtained)"
echo "- Repatriation API: $(echo $REPATRIATION_RESPONSE | grep -q 'success":true' && echo '✅ Working' || echo '⚠️  Check logs')"
echo "- Blockchain: $(echo $HEALTH_RESPONSE | grep -q 'blockchain' && echo '✅ Connected' || echo '⚠️  Check connection')"
echo ""
echo "Access UI at: http://localhost:3000"
echo "Login: admin / admin123"
echo "Navigate: NBE Portal → Forex Repatriation tab"
echo ""
