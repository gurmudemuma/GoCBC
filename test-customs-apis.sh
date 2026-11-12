#!/bin/bash

API_URL="http://localhost:3001/api/v1"

# Login as customs admin
echo "Logging in as customs admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

CUSTOMS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$CUSTOMS_TOKEN" = "null" ] || [ -z "$CUSTOMS_TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test 1: COMESA duty calculation
echo "TEST 1: COMESA duty calculation with preferences"
echo "================================================"
COMESA_RESPONSE=$(curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/calculate-duty" \
    -H "Authorization: Bearer $CUSTOMS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "customsValueUSD": 100000.00,
        "hsCode": "0901.11",
        "origin": "Ethiopia",
        "exchangeRate": 55.75,
        "applyPreferences": true
    }')

echo "$COMESA_RESPONSE" | jq .
echo ""

# Test 2: TRANSACTION valuation
echo "TEST 2: TRANSACTION valuation method"
echo "====================================="
TRANSACTION_RESPONSE=$(curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/valuation" \
    -H "Authorization: Bearer $CUSTOMS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "valuationMethod": "TRANSACTION",
        "invoiceValue": 100000.00,
        "invoiceCurrency": "USD",
        "adjustedValue": 106000.00,
        "adjustments": [
            {"type": "freight", "amount": 5000.00},
            {"type": "insurance", "amount": 1000.00}
        ],
        "isRelatedParty": false
    }')

echo "$TRANSACTION_RESPONSE" | jq .
echo ""

# Test 3: IDENTICAL valuation
echo "TEST 3: IDENTICAL goods valuation method"
echo "========================================="
IDENTICAL_RESPONSE=$(curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/valuation" \
    -H "Authorization: Bearer $CUSTOMS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "valuationMethod": "IDENTICAL",
        "invoiceValue": 95000.00,
        "invoiceCurrency": "USD",
        "adjustedValue": 100000.00,
        "comparableGoodsValue": 98000.00,
        "comparableGoodsReference": "REF-2024-001"
    }')

echo "$IDENTICAL_RESPONSE" | jq .
echo ""

# Test 4: FALLBACK valuation
echo "TEST 4: FALLBACK valuation method"
echo "=================================="
FALLBACK_RESPONSE=$(curl -s -X POST "$API_URL/customs/declaration/DEC-1794312425/valuation" \
    -H "Authorization: Bearer $CUSTOMS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "valuationMethod": "FALLBACK",
        "invoiceValue": 90000.00,
        "invoiceCurrency": "USD",
        "adjustedValue": 95000.00,
        "adjustmentReason": "Market analysis and comparable transaction data"
    }')

echo "$FALLBACK_RESPONSE" | jq .
