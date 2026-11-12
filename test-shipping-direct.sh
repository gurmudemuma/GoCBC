#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Login
echo "Logging in..."
SHIPPING_LOGIN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}')
echo "Login response: $SHIPPING_LOGIN"
SHIPPING_TOKEN=$(echo "$SHIPPING_LOGIN" | jq -r '.data.token')
echo "Token: $SHIPPING_TOKEN"
echo ""

if [ "$SHIPPING_TOKEN" = "null" ] || [ -z "$SHIPPING_TOKEN" ]; then
    echo "❌ Login failed. Trying admin account..."
    SHIPPING_LOGIN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}')
    SHIPPING_TOKEN=$(echo "$SHIPPING_LOGIN" | jq -r '.data.token')
    echo "Admin token: $SHIPPING_TOKEN"
    echo ""
fi

echo "=== TEST 1: HOUSE_BL ==="
curl -s -X POST "$API_URL/shipping/bookings/BK-TEST-005/bill-of-lading/issue" \
    -H "Authorization: Bearer $SHIPPING_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "blType": "HOUSE_BL",
        "blNumber": "HBL-TEST-001",
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
    }' | jq '{success, error, message}'

echo -e "\n=== TEST 2: Booking Amendment ==="
curl -s -X PUT "$API_URL/shipping/bookings/BK-TEST-001/amend" \
    -H "Authorization: Bearer $SHIPPING_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "amendmentReason": "Change in container size",
        "originalDetails": {"containerType": "20FT"},
        "amendedDetails": {"containerType": "40FT"},
        "requestedBy": "EXP4886039"
    }' | jq '{success, error, message}'

echo -e "\n=== TEST 3: Booking Cancellation ==="
curl -s -X DELETE "$API_URL/shipping/bookings/BK-TEST-007/cancel" \
    -H "Authorization: Bearer $SHIPPING_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "cancellationReason": "Shipment delayed",
        "cancelledBy": "EXP4886039"
    }' | jq '{success, error, message}'
