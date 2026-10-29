#!/bin/bash

echo "=== Testing Payments Route ===" > /tmp/payments-route-test.txt
echo "" >> /tmp/payments-route-test.txt

# Get auth token
echo "1. Getting auth token..." >> /tmp/payments-route-test.txt
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bank@example.com","password":"password123"}')
echo "Login response: $LOGIN_RESPONSE" >> /tmp/payments-route-test.txt

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty')
echo "Token: ${TOKEN:0:50}..." >> /tmp/payments-route-test.txt
echo "" >> /tmp/payments-route-test.txt

# Test GET /api/v1/payments (should return empty or list)
echo "2. Testing GET /api/v1/payments..." >> /tmp/payments-route-test.txt
PAYMENTS_GET=$(curl -s -X GET http://localhost:3001/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
echo "Payments GET response: $PAYMENTS_GET" >> /tmp/payments-route-test.txt
echo "" >> /tmp/payments-route-test.txt

# Check if route exists (should not be 404)
if echo "$PAYMENTS_GET" | grep -q "NOT_FOUND.*Route"; then
  echo "❌ FAILED: Payments route still returns NOT_FOUND" >> /tmp/payments-route-test.txt
else
  echo "✅ SUCCESS: Payments route is responding" >> /tmp/payments-route-test.txt
fi

cat /tmp/payments-route-test.txt
