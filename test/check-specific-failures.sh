#!/bin/bash
# Check script for previously-failing endpoints (diagnostic — prints each
# endpoint's raw JSON; it does not keep a pass/fail count).
#
# Fixed 2026-11-12 (W3) so it runs on this VM instead of the Docker host:
# - Forex payload now uses the fields the route actually validates
#   (banking.ts): paymentAmount/currency/targetCurrency/forexRate —
#   the old fromCurrency/toCurrency/amount/exchangeRate were all rejected
#   with VALIDATION_ERROR.
# - Container stuffing report now sends containerNumber (required).
# - Customs valuation now sends adjustedValue (required, must be numeric).
# - Duty calculation now sends customsValueUSD/origin (the field names the
#   route reads — customs.ts); the old customsValue/originCountry were
#   silently ignored in favour of the stored declaration values.
# - Host-era IDs are gone: PAY-TEST-001, BK-TEST-001/005 and DEC-1794312425
#   (0 such rows exist on this VM) are replaced by a live payment id, a
#   real booking created by this script, and a live SUBMITTED declaration
#   resolved from the API. The B/L number is run-unique so reruns never
#   collide (HBL-TEST-UNIQUE-002 already exists in bills_of_lading).
# - The retention-penalty test now creates a real retention account first
#   instead of assuming account id 1 exists (it does not on this VM).

API_URL="http://localhost:3001/api/v1"
RUN_ID=$(date +%s)

# Login and get tokens
echo "=== Getting tokens ==="
BANK_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"bank_admin","password":"password123"}')
BANK_TOKEN=$(echo "$BANK_RESPONSE" | jq -r '.data.token')

NBE_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"nbe_admin","password":"password123"}')
NBE_TOKEN=$(echo "$NBE_RESPONSE" | jq -r '.data.token')

CUSTOMS_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}')
CUSTOMS_TOKEN=$(echo "$CUSTOMS_RESPONSE" | jq -r '.data.token')

SHIPPING_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}')
SHIPPING_TOKEN=$(echo "$SHIPPING_RESPONSE" | jq -r '.data.token')

EXPORTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"exporter1","password":"password123"}')
EXPORTER_USER_ID=$(echo "$EXPORTER_RESPONSE" | jq -r '.data.user.id // empty')

# --- Resolve live fixtures from this VM (no hardcoded host-era IDs) ---
echo "=== Resolving live fixtures ==="

# Real payment id: first non-empty payment for an ISSUED LC's exporter.
PAY_ID=""
for EXP_ID in $(curl -s -X GET "$API_URL/banking/lcs" -H "Authorization: Bearer $BANK_TOKEN" | jq -r '.data[]? | select(.status == "ISSUED") | .exporterId' | sort -u | head -8); do
  PAY_ID=$(curl -s -X GET "$API_URL/banking/payments?exporterId=$EXP_ID" -H "Authorization: Bearer $BANK_TOKEN" | jq -r '.data[]?.paymentId // empty' | grep -v '^$' | sed -n '1p')
  [ -n "$PAY_ID" ] && break
done
echo "Payment: ${PAY_ID:-<none found — forex test will be skipped>}"

# Live SUBMITTED declaration (amend/duty/valuation do not change its status).
DECL_ID=$(curl -s -X GET "$API_URL/customs/declarations?limit=100" -H "Authorization: Bearer $CUSTOMS_TOKEN" | jq -r '.data[]? | select(.status == "SUBMITTED") | .declarationId' | sed -n '1p')
echo "Declaration: ${DECL_ID:-<none found — customs tests will fail>}"

# Real booking (a B/L must reference a real booking; the booking route reads
# bookingID, not bookingNumber, and REQUIRES shipmentID — resolve a live
# CREATED shipment from the API and link it).
SHIP_ID=$(curl -s -X GET "$API_URL/shipments?limit=100" -H "Authorization: Bearer $SHIPPING_TOKEN" | jq -r '.data[]? | select(.status == "CREATED") | .shipmentId' | sed -n '1p')
echo "Shipment for booking: ${SHIP_ID:-<none found — booking creation will fail>}"
BOOKING_ID="BK-CHECK-SPEC-$RUN_ID"
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

# Real retention account (account id 1 does not exist on this VM).
RETENTION_ACCOUNT_ID="1"
if [ -n "$EXPORTER_USER_ID" ]; then
  RETENTION_RESP=$(curl -s -X POST "$API_URL/nbe/retention-accounts" \
    -H "Authorization: Bearer $NBE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"exporterId\": $EXPORTER_USER_ID,
      \"accountNumber\": \"RET-ACC-CHECK-SPEC-$RUN_ID\",
      \"accountType\": \"FOREX_RETENTION\",
      \"currency\": \"USD\",
      \"retentionPercentage\": 40.00,
      \"minimumBalance\": 50000.00
    }")
  RETENTION_ACCOUNT_ID=$(echo "$RETENTION_RESP" | jq -r '.data.accountId // empty')
  [ -z "$RETENTION_ACCOUNT_ID" ] && RETENTION_ACCOUNT_ID="1"
fi
echo "Retention account: $RETENTION_ACCOUNT_ID"

echo -e "\n========================================="
echo "TEST: Forex Conversion ($PAY_ID)"
echo "========================================="
if [ -z "$PAY_ID" ]; then
  echo "SKIP: no live payment id could be resolved on this VM"
else
curl -s -X POST "$API_URL/banking/payment/$PAY_ID/apply-forex" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentAmount": 100000.00,
    "currency": "USD",
    "targetCurrency": "ETB",
    "forexRate": 55.75,
    "conversionType": "SPOT",
    "conversionDate": "2024-11-10"
  }' | jq '.'
fi

echo -e "\n========================================="
echo "TEST: HOUSE_BL Issuance (booking $BOOKING_ID)"
echo "========================================="
curl -s -X POST "$API_URL/shipping/bookings/$BOOKING_ID/bill-of-lading/issue" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"blType\": \"HOUSE_BL\",
    \"blNumber\": \"HBL-CHECK-SPEC-$RUN_ID\",
    \"masterBLNumber\": \"MBL-TEST-001\",
    \"shipper\": \"Actual Shipper\",
    \"consignee\": \"Actual Consignee\",
    \"vesselName\": \"MV CONTAINER KING\",
    \"portOfLoading\": \"Djibouti\",
    \"portOfDischarge\": \"Rotterdam\",
    \"cargoDescription\": \"Coffee Beans\",
    \"grossWeight\": 10000.00,
    \"packageCount\": 200,
    \"freightTerms\": \"FOB\"
  }" | jq '.'

echo -e "\n========================================="
echo "TEST: Booking Amendment (booking $BOOKING_ID)"
echo "========================================="
curl -s -X PUT "$API_URL/shipping/bookings/$BOOKING_ID/amend" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amendmentReason": "Change in container size",
    "originalDetails": {"containerType": "20FT", "quantity": 2},
    "amendedDetails": {"containerType": "40FT", "quantity": 1},
    "requestedBy": "EXP4886039"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Container Stuffing Report"
echo "========================================="
curl -s -X POST "$API_URL/shipping/containers/MAEU1234567/stuffing-report" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumber": "MAEU1234567",
    "stuffingDate": "2024-11-10",
    "stuffingLocation": "Addis Ababa Warehouse",
    "supervisorName": "John Supervisor",
    "cargoDetails": [{"description": "Coffee", "packages": 300, "weight": 18000.00}],
    "sealNumber": "SEAL-78945612",
    "photos": ["photo1.jpg"]
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Declaration Amendment (declaration $DECL_ID)"
echo "========================================="
curl -s -X PUT "$API_URL/customs/declaration/$DECL_ID/amend" \
  -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amendmentReason": "Correction in HS code",
    "originalValues": {"hsCode": "0901.11", "quantity": 18000},
    "amendedValues": {"hsCode": "0901.12", "quantity": 18000},
    "amendmentRequestedBy": "EXP4886039"
  }' | jq '.'

echo -e "\n========================================="
echo "TEST: Duty Calculation (declaration $DECL_ID)"
echo "========================================="
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

echo -e "\n========================================="
echo "TEST: Customs Valuation - TRANSACTION (declaration $DECL_ID)"
echo "========================================="
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

echo -e "\n========================================="
echo "TEST: UNAUTHORIZED_WITHDRAWAL Penalty (retention account $RETENTION_ACCOUNT_ID)"
echo "========================================="
curl -s -X POST "$API_URL/nbe/retention-accounts/$RETENTION_ACCOUNT_ID/calculate-penalty" \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "violationType": "UNAUTHORIZED_WITHDRAWAL",
    "requiredAmount": 20000.00,
    "actualAmount": 0.00,
    "notes": "Unauthorized withdrawal detected"
  }' | jq '.'
