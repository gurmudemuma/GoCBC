#!/bin/bash

# Test NBE LC monitoring endpoint

echo "Logging in as nbe_admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

echo "Token: $TOKEN"

echo "Testing /api/v1/nbe/lc-monitoring..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/nbe/lc-monitoring)

echo "Response:"
echo "$RESPONSE" | jq '.'

COUNT=$(echo "$RESPONSE" | jq -r '.count')
echo "LC Count: $COUNT"
