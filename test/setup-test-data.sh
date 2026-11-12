#!/bin/bash
# Sets up test data for the comprehensive test suite.
#
# Fixed 2026-11-12 (W3): the booking route (api/src/routes/shipping.ts)
# reads bookingID/shipmentID and inserts shipmentID || null — it ignores
# the bookingNumber/shipperName fields this script used to send, so the old
# bookings were created with auto-generated BOOK-<timestamp> ids and the
# BK-TEST-001/007 numbers the suites looked for never existed. This script
# now sends bookingID explicitly (run-unique) plus the shipmentID of a real
# CREATED shipment resolved from the API, so the booking mirrors that
# shipment to FREIGHT_BOOKED (M2/M3: only from CREATED, sea freight).
# A bill of lading must reference a real booking, so the bookings created
# here are what the B/L tests should use.

API_URL="${API_URL:-http://localhost:3001/api/v1}"
RUN_ID=$(date +%s)

echo "=== Setting up test data for comprehensive test suite ==="

# Login as required users
SHIPPING_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')
CUSTOMS_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
EXPORTER_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"exporter1","password":"password123"}' | jq -r '.data.token')
if [ -z "$EXPORTER_TOKEN" ] || [ "$EXPORTER_TOKEN" = "null" ]; then
  echo "WARNING: exporter1 login failed — seed the user first (see scripts/seed-users.js)"
fi

# A real CREATED shipment for the booking mirror. If none exists, the
# bookings are still created (shipmentID null) but no mirror happens.
SHIPMENT_1=$(curl -s -X GET "$API_URL/shipments?limit=100" -H "Authorization: Bearer $SHIPPING_TOKEN" | jq -r '.data[]? | select(.status == "CREATED") | .shipmentId' | sed -n '1p')
SHIPMENT_2=$(curl -s -X GET "$API_URL/shipments?limit=100" -H "Authorization: Bearer $SHIPPING_TOKEN" | jq -r '.data[]? | select(.status == "CREATED") | .shipmentId' | sed -n '2p')
if [ -z "$SHIPMENT_2" ]; then
  SHIPMENT_2="$SHIPMENT_1"
fi
echo "Using CREATED shipment(s): ${SHIPMENT_1:-<none>} / ${SHIPMENT_2:-<none>}"

echo "1. Creating test bookings..."

# Create booking BK-SETUP-001-<RUN_ID> (linked to a real CREATED shipment)
BOOKING1_ID="BK-SETUP-001-$RUN_ID"
if [ -n "$SHIPMENT_1" ]; then SHIP1_JSON="\"shipmentID\": \"$SHIPMENT_1\","; else SHIP1_JSON=""; fi
BOOKING1=$(curl -s -X POST "$API_URL/shipping/bookings" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingID\": \"$BOOKING1_ID\",
    $SHIP1_JSON
    \"containerType\": \"20FT\",
    \"numberOfContainers\": 2,
    \"portOfLoading\": \"Djibouti\",
    \"portOfDischarge\": \"Rotterdam\",
    \"estimatedDepartureDate\": \"2025-01-15\",
    \"estimatedArrivalDate\": \"2025-02-15\"
  }")
echo "Booking 1: $(echo "$BOOKING1" | jq -r '.data.bookingID // "Failed"') (shipment: ${SHIPMENT_1:-none})"

# Create booking BK-SETUP-007-<RUN_ID> (cancellation test booking)
BOOKING7_ID="BK-SETUP-007-$RUN_ID"
if [ -n "$SHIPMENT_2" ]; then SHIP2_JSON="\"shipmentID\": \"$SHIPMENT_2\","; else SHIP2_JSON=""; fi
BOOKING7=$(curl -s -X POST "$API_URL/shipping/bookings" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingID\": \"$BOOKING7_ID\",
    $SHIP2_JSON
    \"containerType\": \"40FT\",
    \"numberOfContainers\": 1,
    \"portOfLoading\": \"Djibouti\",
    \"portOfDischarge\": \"Hamburg\",
    \"estimatedDepartureDate\": \"2025-01-20\",
    \"estimatedArrivalDate\": \"2025-02-20\"
  }")
echo "Booking 7: $(echo "$BOOKING7" | jq -r '.data.bookingID // "Failed"') (shipment: ${SHIPMENT_2:-none})"

echo -e "\n2. Live declarations available for amend/duty/valuation tests..."
# Creating a fresh declaration here would need a shipment in PERMIT_ISSUED
# state on-chain (full workflow), so the suites reuse live SUBMITTED
# declarations instead — list them so the run is traceable.
curl -s -X GET "$API_URL/customs/declarations?limit=100" -H "Authorization: Bearer $CUSTOMS_TOKEN" \
  | jq -r '.data[]? | select(.status == "SUBMITTED") | .declarationId' | head -5 \
  | sed 's/^/  SUBMITTED declaration: /'

echo -e "\nTest data setup complete!"
echo "BOOKING_001=$BOOKING1_ID"
echo "BOOKING_007=$BOOKING7_ID"
echo "SHIPMENT_1=${SHIPMENT_1:-}"
echo "SHIPMENT_2=${SHIPMENT_2:-}"
