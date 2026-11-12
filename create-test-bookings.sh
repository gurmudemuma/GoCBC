#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Login as shipping admin
LOGIN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}')
TOKEN=$(echo "$LOGIN" | jq -r '.data.token')

echo "Creating test bookings..."

for booking_num in "BK-TEST-001" "BK-TEST-002" "BK-TEST-003" "BK-TEST-004" "BK-TEST-005" "BK-TEST-006" "BK-TEST-007" "BK-TEST-008" "BK-TEST-009"; do
    echo "Creating $booking_num..."
    RESULT=$(curl -s -X POST "$API_URL/shipping/bookings" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"bookingNumber\": \"$booking_num\",
            \"shipperName\": \"Test Shipper\",
            \"consigneeName\": \"Test Consignee\",
            \"cargoDescription\": \"Test Cargo\",
            \"containerType\": \"20FT\",
            \"quantity\": 1,
            \"portOfLoading\": \"Djibouti\",
            \"portOfDischarge\": \"Rotterdam\",
            \"estimatedDepartureDate\": \"2025-01-15\",
            \"estimatedArrivalDate\": \"2025-02-15\"
        }")
    
    SUCCESS=$(echo "$RESULT" | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo "  ✓ Created $booking_num"
    else
        ERROR=$(echo "$RESULT" | jq -r '.error.message // "Unknown error"')
        echo "  ℹ $booking_num: $ERROR (may already exist)"
    fi
done

echo "✅ Test bookings setup complete"
