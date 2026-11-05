#!/bin/bash

API_BASE="http://localhost:3001/api/v1"
TEST_ID="1793641731"

echo "=========================================="
echo "FINAL STATUS VERIFICATION"
echo "Test ID: $TEST_ID"
echo "=========================================="
echo

# Login as NBE
echo "1. Logging in as NBE..."
NBE_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NBE_TOKEN" ]; then
    echo "❌ NBE login failed"
    exit 1
fi
echo "✅ NBE logged in"
echo

# Check retention policy
echo "2. Checking Retention Policy for COFFEE..."
POLICY=$(curl -s -X GET \
  -H "Authorization: Bearer $NBE_TOKEN" \
  "$API_BASE/forex/retention-policy/COFFEE")

if echo "$POLICY" | grep -q '"success":true'; then
    echo "✅ Retention policy is ACTIVE"
    echo "$POLICY" | jq -r '.data | "   Rate: \(.retentionRate)%, Status: \(.status)"' 2>/dev/null
else
    echo "❌ Retention policy NOT found"
fi
echo

# Check exchange rate
echo "3. Checking Exchange Rate for USD..."
RATE=$(curl -s -X GET \
  -H "Authorization: Bearer $NBE_TOKEN" \
  "$API_BASE/forex/exchange-rate/USD" 2>/dev/null || echo '{"success":false}')

if echo "$RATE" | grep -q '"success":true'; then
    echo "✅ Exchange rate is ACTIVE"
    echo "$RATE" | jq -r '.data | "   Buy: \(.buyingRate), Sell: \(.sellingRate), Status: \(.status)"' 2>/dev/null
else
    echo "❌ Exchange rate NOT found - trying query endpoint..."
    # The GET endpoint might not exist, check database instead
fi
echo

# Check forex allocation status
echo "4. Checking Forex Allocation Status..."
FOREX_ID="FOREX_LC-E2E-${TEST_ID}_REQUEST"
FOREX=$(curl -s -X GET \
  -H "Authorization: Bearer $NBE_TOKEN" \
  "$API_BASE/forex/${FOREX_ID}")

if echo "$FOREX" | grep -q '"forex_id"'; then
    STATUS=$(echo "$FOREX" | jq -r '.data.status // .status' 2>/dev/null)
    echo "✅ Forex found: $FOREX_ID"
    echo "   Status: $STATUS"
    if [ "$STATUS" = "ALLOCATED" ]; then
        echo "   ✅ Forex IS allocated"
    else
        echo "   ❌ Forex NOT allocated (status: $STATUS)"
    fi
else
    echo "❌ Forex NOT found: $FOREX_ID"
fi
echo

# Check shipment status  
echo "5. Checking Shipment Status..."
SHIP_ID="SHIP-E2E-${TEST_ID}"
echo "   Checking PostgreSQL for: $SHIP_ID"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT shipment_id, status, blockchain_synced FROM shipments WHERE shipment_id = '$SHIP_ID'" 2>/dev/null | head -1

echo

# Check LC status
echo "6. Checking LC Status..."
LC_ID="LC-E2E-${TEST_ID}"
echo "   Checking PostgreSQL for: $LC_ID"
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -c "SELECT lc_id, status FROM letters_of_credit WHERE lc_id = '$LC_ID'" 2>/dev/null | head -1

echo
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
