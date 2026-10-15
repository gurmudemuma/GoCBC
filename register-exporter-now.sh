#!/bin/bash

echo "=== Registering Exporter EXP001 ==="

# Login as admin
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: Failed to get admin token"
  echo "Login response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Admin token obtained: ${TOKEN:0:20}..."

# Register exporter via API
echo "Registering exporter..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/exporters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "EXP001",
    "name": "Test Coffee Exporter",
    "licenseNumber": "LIC001",
    "tinNumber": "TIN001",
    "address": "Addis Ababa, Ethiopia",
    "contactPerson": "John Doe",
    "email": "exporter@test.com",
    "phone": "+251911000001"
  }')

echo "Response: $RESPONSE"

# Check if successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Exporter EXP001 registered successfully"
else
  echo "⚠️ Registration response (might already exist): $RESPONSE"
fi

echo "Done"
