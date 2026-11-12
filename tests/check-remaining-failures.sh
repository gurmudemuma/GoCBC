#!/bin/bash
# Check script for the remaining previously-failing endpoints (diagnostic —
# prints each endpoint's raw JSON; it does not keep a pass/fail count).
#
# Fixed 2026-11-12 (W3) so it runs on this VM instead of the Docker host:
# - Host-era IDs are gone: LC-CNT-1794325819, PAY-TEST-002, BK-TEST-005 and
#   DEC-1794312425 (0 such rows exist on this VM) are replaced by a live
#   ISSUED LC, a live payment id, a real booking created by this script,
#   and a live SUBMITTED declaration resolved from the API.
# - Duty calculation now sends customsValueUSD/origin (the field names the
#   route reads — customs.ts); the old customsValue/originCountry were
#   silently ignored in favour of the stored declaration values.
# - The B/L number was already run-unique (timestamped); the booking was
#   not — a B/L must reference a real booking, so this script creates one
#   first (the booking route reads bookingID, not bookingNumber).

API_URL="http://localhost:3001/api/v1"
RUN_ID=$(date +%s)

# Get tokens
BANK_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}' | jq -r '.data.token')
CUSTOMS_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
SHIPPING_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')

# --- Resolve live fixtures from this VM (no hardcoded host-era IDs) ---
echo "=== Resolving live fixtures ==="

# Live ISSUED LC (transfer/acceptance/deferred endpoints read it on-chain).
LC_ID=$(curl -s -X GET "$API_URL/banking/lcs" -H "Authorization: Bearer $BANK_TOKEN" | jq -r '.data[]? | select(.status == "ISSUED") | .lcId' | sed -n '1p')
echo "LC: ${LC_ID:-<none found>}"

# Real payment id: first non-empty payment for an ISSUED LC's exporter.
PAY_ID=""
for EXP_ID in $(curl -s -X GET "$API_URL/banking/lcs" -H "Authorization: Bearer $BANK_TOKEN" | jq -r '.data[]? | select(.status == "ISSUED") | .exporterId' | sort -u | head -8); do
  PAY_ID=$(curl -s -X GET "$API_URL/banking/payments?exporterId=$EXP_ID" -H "Authorization: Bearer $BANK_TOKEN" | jq -r '.data[]?.paymentId // empty' | grep -v '^$' | sed -n '1p')
  [ -n "$PAY_ID" ] && break
done
echo "Payment: ${PAY_ID:-<none found — forex test will be skipped>}"

# Live SUBMITTED declaration (duty/valuation do not change its status).
DECL_ID=$(curl -s -X GET "$API_URL/customs/declarations?limit=100" -H "Authorization: Bearer $CUSTOMS_TOKEN" | jq -r '.data[]? | select(.status == "SUBMITTED") | .declarationId' | sed -n '1p')
echo "Declaration: ${DECL_ID:-<none found — customs tests will fail>}"

# Real booking for the B/L test (a B/L must reference a real booking; the
# booking route reads bookingID, not bookingNumber, and REQUIRES shipmentID
# — resolve a live CREATED shipment from the API and link it).
SHIP_ID=$(curl -s -X GET "$API_URL/shipments?limit=100" -H "Authorization: Bearer $SHIPPING_TOKEN" | jq -r '.data[]? | select(.status == "CREATED") | .shipmentId' | sed -n '1p')
echo "Shipment for booking: ${SHIP_ID:-<none found — booking creation will fail>}"
BOOKING_ID="BK-CHECK-REM-$RUN_ID"
BOOKING_RESP=$(curl -s -X POST "$API_URL/shipping/bookings" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingID\": \"$BOOKING_ID\",
    \"shipmentID\": \"$SHIP_ID\",
    \"containerType\": \"20FT\",
    \"numberOfContainers\": 1,
    \"portOfLoading\": \"Djibouti\",
    \"portOfDischarge\": \"Rotterdam\",
    \"estimatedDepartureDate\": \"2025-01-15\",
    \"estimatedArrivalDate\": \"2025-02-15\"
  }")
BOOKING_ID=$(echo "$BOOKING_RESP" | jq -r '.data.bookingID // empty')
if [ -z "$BOOKING_ID" ]; then
  echo "WARNING: booking creation failed: $(echo "$BOOKING_RESP" | jq -r '.error.message // "unknown error"')"
fi
echo "Booking: ${BOOKING_ID:-<creation failed>}"

echo "=== 1. Acceptance Financing Cost Calculation (LC $LC_ID) ==="
curl -s -X POST "$API_URL/banking/lc/$LC_ID/acceptance-financing" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "financingAmount": 60000.00,
    "financingPeriod": 60,
    "tenor": 60,
    "interestRate": 7.5,
    "discountRate": 6.8,
    "financingBank": "Awash Bank",
    "acceptanceDate": "2024-12-15",
    "maturityDate": "2025-02-15"
  }' | jq '.'

echo -e "\n=== 2. FORWARD Forex Conversion (payment $PAY_ID) ==="
if [ -z "$PAY_ID" ]; then
  echo "SKIP: no live payment id could be resolved on this VM"
else
curl -s -X POST "$API_URL/banking/payment/$PAY_ID/apply-forex" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentAmount": 50000.00,
    "currency": "EUR",
    "targetCurrency": "USD",
    "forexRate": 1.08,
    "conversionType": "FORWARD",
    "conversionDate": "2025-01-15",
    "settlementDate": "2025-03-15"
  }' | jq '.'
fi

echo -e "\n=== 3. HOUSE_BL (booking $BOOKING_ID) ==="
curl -s -X POST "$API_URL/shipping/bookings/$BOOKING_ID/bill-of-lading/issue" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blType": "HOUSE_BL",
    "blNumber": "HBL-TEST-'$(date +%s)'",
    "masterBLNumber": "MBL-TEST-001",
    "shipper": "Test Shipper",
    "consignee": "Test Consignee",
    "vesselName": "MV TEST",
    "portOfLoading": "Djibouti",
    "portOfDischarge": "Rotterdam",
    "cargoDescription": "Coffee",
    "grossWeight": 10000.00,
    "packageCount": 200,
    "freightTerms": "FOB"
  }' | jq '.'

echo -e "\n=== 4. Duty Calculation (declaration $DECL_ID) ==="
curl -s -X POST "$API_URL/customs/declaration/$DECL_ID/calculate-duty" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customsValueUSD": 100000.00,
    "currency": "USD",
    "exchangeRate": 55.75,
    "hsCode": "0901.11",
    "origin": "Ethiopia"
  }' | jq '.'

echo -e "\n=== 5. Customs Valuation TRANSACTION (declaration $DECL_ID) ==="
curl -s -X POST "$API_URL/customs/declaration/$DECL_ID/valuation" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valuationMethod": "TRANSACTION",
    "invoiceValue": 100000.00,
    "invoiceCurrency": "USD",
    "adjustedValue": 106000.00,
    "adjustments": [
      {"type": "freight", "amount": 5000.00},
      {"type": "insurance", "amount": 1000.00}
    ],
    "isRelatedParty": false
  }' | jq '.'
