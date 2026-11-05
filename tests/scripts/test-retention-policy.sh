#!/bin/bash

API_BASE="http://localhost:3001/api/v1"

echo "=== Testing Retention Policy and Forex Allocation ==="
echo

# Login as NBE
echo "1. Logging in as NBE..."
NBE_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NBE_TOKEN" ]; then
    echo "❌ NBE login failed"
    exit 1
fi
echo "✅ NBE logged in"
echo

# Set retention policy
echo "2. Setting retention policy for COFFEE..."
POLICY_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $NBE_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/forex/retention-policy" \
  -d '{
    "policyID": "NBE-COFFEE-POLICY-2024",
    "commodityType": "COFFEE",
    "retentionRate": 40,
    "setBy": "nbe_admin",
    "justification": "NBE Directive FXD/01/2024 - 40% retention for coffee exports"
  }')

echo "Response: $POLICY_RESULT"
echo

if echo "$POLICY_RESULT" | grep -q '"success":true'; then
    echo "✅ Retention policy set successfully"
elif echo "$POLICY_RESULT" | grep -q "already exists"; then
    echo "ℹ️  Retention policy already exists (this is OK)"
else
    echo "❌ Retention policy failed:"
    echo "$POLICY_RESULT" | jq '.' 2>/dev/null || echo "$POLICY_RESULT"
fi
echo

# Query retention policy
echo "3. Querying retention policy for COFFEE..."
QUERY_RESULT=$(curl -s -X GET \
  -H "Authorization: Bearer $NBE_TOKEN" \
  "$API_BASE/forex/retention-policy/COFFEE")

echo "Response: $QUERY_RESULT"
echo

if echo "$QUERY_RESULT" | grep -q '"success":true'; then
    echo "✅ Retention policy found on blockchain"
    echo "$QUERY_RESULT" | jq '.data' 2>/dev/null
else
    echo "❌ Retention policy NOT found on blockchain"
fi
echo

echo "=== Test Complete ==="
