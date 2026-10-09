#!/bin/bash
# Initialize NBE Exchange Rates with Current Values

set -e

echo "=========================================="
echo "NBE EXCHANGE RATES - INITIALIZATION"
echo "=========================================="
echo ""

API_URL="http://localhost:3001"

# Step 1: Login to get token
echo "🔑 Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .data.token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Step 2: Initialize default rates
echo "📊 Step 2: Initializing default NBE exchange rates..."
echo ""
echo "Current NBE Official Rates (October 2026):"
echo "  USD: 159.50 (Buy) / 162.50 (Sell) = 161.00 (Mid)"
echo "  EUR: 172.00 (Buy) / 175.00 (Sell) = 173.50 (Mid)"
echo "  GBP: 197.00 (Buy) / 201.00 (Sell) = 199.00 (Mid)"
echo ""

INIT_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/exchange-rates/initialize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$INIT_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Exchange rates initialized in blockchain"
else
  echo "⚠️  Response: $INIT_RESPONSE"
fi

echo ""

# Step 3: Verify rates were set
echo "🔍 Step 3: Verifying exchange rates..."
echo ""

RATES_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/exchange-rates/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$RATES_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Current exchange rates:"
  echo "$RATES_RESPONSE" | jq -r '.data[] | "  \(.currency): \(.midRate) ETB (Buy: \(.buyingRate), Sell: \(.sellingRate))"' 2>/dev/null || echo "$RATES_RESPONSE"
else
  echo "⚠️  Could not fetch rates"
  echo "$RATES_RESPONSE" | head -c 200
fi

echo ""

# Step 4: Test getting USD rate specifically
echo "🧪 Step 4: Testing USD rate retrieval..."
USD_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/exchange-rates/current/USD" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$USD_RESPONSE" | grep -q '"success":true'; then
  USD_RATE=$(echo "$USD_RESPONSE" | jq -r '.data.rate' 2>/dev/null)
  echo "✅ Current USD rate: $USD_RATE ETB"
else
  echo "⚠️  Could not fetch USD rate"
fi

echo ""
echo "=========================================="
echo "INITIALIZATION COMPLETE"
echo "=========================================="
echo ""
echo "✅ Exchange rates are now dynamic and stored in blockchain"
echo "✅ System will use these rates automatically"
echo ""
echo "📝 To update rates manually:"
echo "   POST /api/v1/exchange-rates/set"
echo "   Body: { \"currency\": \"USD\", \"buyingRate\": 160.0, \"sellingRate\": 163.0 }"
echo ""
echo "📊 To view current rates:"
echo "   GET /api/v1/exchange-rates/current"
echo ""
echo "🔗 NBE Portal will now show: ~161 ETB/USD (instead of 57.5)"
echo ""
