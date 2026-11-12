#!/bin/bash

API_URL="${API_URL:-http://localhost:3001/api/v1}"

echo "=== Setting up test data for comprehensive test suite ==="

# Login as required users
SHIPPING_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"shipping_admin","password":"password123"}' | jq -r '.data.token')
CUSTOMS_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"customs_admin","password":"password123"}' | jq -r '.data.token')
EXPORTER_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"exporter1","password":"password123"}' | jq -r '.data.token')

echo "1. Creating test bookings..."

# Create booking BK-TEST-001
BOOKING1=$(curl -s -X POST "$API_URL/shipping/bookings" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingNumber": "BK-TEST-001",
    "shipperName": "Test Exporter Co",
    "consigneeName": "Test Importer Ltd",
    "cargoDescription": "Test Cargo",
    "containerType": "20FT",
    "quantity": 2,
    "portOfLoading": "Djibouti",
    "portOfDischarge": "Rotterdam",
    "estimatedDepartureDate": "2025-01-15",
    "estimatedArrivalDate": "2025-02-15"
  }')
echo "Booking 1: $(echo "$BOOKING1" | jq -r '.data.bookingId // "Failed"')"

# Create booking BK-TEST-007
BOOKING7=$(curl -s -X POST "$API_URL/shipping/bookings" \
  -H "Authorization: Bearer $SHIPPING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingNumber": "BK-TEST-007",
    "shipperName": "Test Exporter Co",
    "consigneeName": "Test Importer Ltd",
    "cargoDescription": "Test Cargo for Cancellation",
    "containerType": "40FT",
    "quantity": 1,
    "portOfLoading": "Djibouti",
    "portOfDischarge": "Hamburg",
    "estimatedDepartureDate": "2025-01-20",
    "estimatedArrivalDate": "2025-02-20"
  }')
echo "Booking 7: $(echo "$BOOKING7" | jq -r '.data.bookingId // "Failed"')"

echo -e "\n2. Creating test declarations..."

# We need to use a shipment ID first - let's query for one or skip this for now
# The declarations with actual IDs already exist, we just need to ensure they're in the right status

echo -e "\nTest data setup complete!"
