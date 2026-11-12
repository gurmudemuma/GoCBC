#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Login as shipping admin
echo "Logging in as shipping admin..."
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"shipping_admin","password":"shipping123"}')

SHIPPING_TOKEN=$(echo "$LOGIN" | jq -r '.data.token')

if [ "$SHIPPING_TOKEN" = "null" ] || [ -z "$SHIPPING_TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✅ Logged in"
echo ""

# Test 1: HOUSE_BL
echo "TEST 1: HOUSE_BL issuance"
echo "=========================="
HOUSE_BL=$(curl -s -X POST "$API_URL/shipping/bookings/BK-TEST-005/bill-of-lading/issue" \
    -H "Authorization: Bearer $SHIPPING_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "blType": "HOUSE_BL",
        "blNumber": "HBL-TEST-UNIQUE-001",
        "masterBLNumber": "MBL-TEST-001",
        "shipper": "Actual Shipper",
        "consignee": "Actual Consignee",
        "vesselName": "MV CONTAINER KING",
        "portOfLoading": "Djibouti",
        "portOfDischarge": "Rotterdam",
        "cargoDescription": "Coffee Beans",
        "grossWeight": 10000.00,
        "packageCount": 200,
        "freightTerms": "FOB"
    }')
echo "$HOUSE_BL" | jq .
echo ""

# Test 2: Booking Amendment
echo "TEST 2: Booking Amendment"
echo "========================="
AMENDMENT=$(curl -s -X PUT "$API_URL/shipping/bookings/BK-TEST-001/amend" \
    -H "Authorization: Bearer $SHIPPING_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "amendmentReason": "Change in container size",
        "originalDetails": {"containerType": "20FT", "quantity": 2},
        "amendedDetails": {"containerType": "40FT", "quantity": 1},
        "requestedBy": "EXP4886039"
    }')
echo "$AMENDMENT" | jq .
echo ""

# Test 3: Booking Cancellation
echo "TEST 3: Booking Cancellation"
echo "============================"
CANCELLATION=$(curl -s -X DELETE "$API_URL/shipping/bookings/BK-TEST-007/cancel" \
    -H "Authorization: Bearer $SHIPPING_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "cancellationReason": "Shipment delayed - buyer request",
        "cancelledBy": "EXP4886039"
    }')
echo "$CANCELLATION" | jq .
