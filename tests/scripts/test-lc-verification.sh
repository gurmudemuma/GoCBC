#!/bin/bash
# Quick test: Does LC verification run?

API_BASE="http://localhost:3001/api/v1"

# Login
TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"nbe_admin","password":"nbe123"}' | jq -r '.token')

echo "✓ Logged in as NBE admin"

# Allocate forex for existing LC (use one from previous test)
LC_ID="LC-E2E-1793690819"
FOREX_ID="FOREX_TEST_VERIFY_$(date +%s)"

echo "→ Allocating forex for LC: $LC_ID"
echo "→ Watch for 'Waiting for LC status to propagate' in logs..."

curl -s -X POST "$API_BASE/forex/allocate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"forexId\": \"$FOREX_ID\",
    \"lcId\": \"$LC_ID\",
    \"amount\": 135000,
    \"exchangeRate\": 120.5,
    \"retentionRate\": 40,
    \"officer\": \"NBE Officer\",
    \"approvalRef\": \"NBE-VERIFY-TEST\",
    \"expiryDate\": \"2026-12-31\"
  }" | jq '.'

echo ""
echo "→ Check API logs for verification messages:"
grep "Waiting for LC status\|LC.*verified\|Error verifying LC" /home/guda/GoCBC/logs/api.log | tail -5
