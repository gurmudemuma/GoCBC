#!/bin/bash

echo "=========================================="
echo "Complete Login Test"
echo "=========================================="
echo ""

echo "1. Testing API Health..."
HEALTH=$(curl -s http://localhost:3001/health 2>&1)
echo "Health response: $HEALTH"
echo ""

echo "2. Testing Login Endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>&1)

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ LOGIN SUCCESSFUL!"
    echo ""
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token' 2>/dev/null)
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "Token received: ${TOKEN:0:50}..."
    fi
else
    echo "❌ LOGIN FAILED"
    ERROR=$(echo "$LOGIN_RESPONSE" | jq -r '.error.message' 2>/dev/null)
    echo "Error: $ERROR"
fi

echo ""
echo "=========================================="
