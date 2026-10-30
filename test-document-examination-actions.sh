#!/bin/bash

# Quick test of Document Examination Dialog Actions

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo "=== Testing Document Examination Actions ==="
echo ""

# 1. Get an APPROVED LC
echo "1. Fetching APPROVED LC..."
LC=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc" | jq -r '.data[] | select(.status == "APPROVED") | .lcId' | head -1)
echo "   Using LC: $LC"
echo ""

# 2. Get LC details with documents
echo "2. Fetching LC details..."
LC_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc/$LC")
echo "   Documents: $(echo "$LC_DATA" | jq '.data.documents | length')"
DOC_ID=$(echo "$LC_DATA" | jq -r '.data.documents[0].documentId')
echo "   First Document: $DOC_ID"
echo ""

# 3. Test View Document (opens in browser - just check endpoint)
echo "3. Testing View Document..."
VIEW_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/documents/$DOC_ID/view?token=$TOKEN")
if [ "$VIEW_CODE" = "200" ]; then
    echo "   ✓ View endpoint working (HTTP $VIEW_CODE)"
else
    echo "   ✗ View endpoint failed (HTTP $VIEW_CODE)"
fi
echo ""

# 4. Test Download Document
echo "4. Testing Download Document..."
DOWNLOAD_CODE=$(curl -s -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}" "$API_URL/documents/$DOC_ID/download")
if [ "$DOWNLOAD_CODE" = "200" ]; then
    echo "   ✓ Download endpoint working (HTTP $DOWNLOAD_CODE)"
else
    echo "   ✗ Download endpoint failed (HTTP $DOWNLOAD_CODE)"
fi
echo ""

# 5. Test Allocate Forex (if not already allocated)
echo "5. Testing Forex Allocation..."
FOREX_EXISTS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex" | jq -r --arg lc "$LC" '.data[]? | select(.lcId == $lc) | .forexId')
if [ -z "$FOREX_EXISTS" ] || [ "$FOREX_EXISTS" = "null" ]; then
    CONTRACT_ID=$(echo "$LC_DATA" | jq -r '.data.contractId')
    FOREX_ID="FOREX-$(date +%s)"
    
    FOREX_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"forexId\": \"$FOREX_ID\",
            \"lcId\": \"$LC\",
            \"amount\": 4250,
            \"exchangeRate\": 57.5,
            \"retentionRate\": 0.7
        }" \
        "$API_URL/forex/allocate")
    
    if [ "$(echo "$FOREX_RESPONSE" | jq -r '.success')" = "true" ]; then
        echo "   ✓ Forex allocation working"
        echo "   Forex ID: $(echo "$FOREX_RESPONSE" | jq -r '.data.forexID')"
    else
        echo "   ✗ Forex allocation failed"
        echo "   Error: $(echo "$FOREX_RESPONSE" | jq -r '.error.message')"
    fi
else
    echo "   ⚠ Forex already allocated: $FOREX_EXISTS"
fi
echo ""

# 6. Test Document Examination (mark as examined)
echo "6. Testing Document Examination..."
EXAM_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{
        \"compliant\": true,
        \"discrepancies\": \"\"
    }" \
    "$API_URL/banking/lc/$LC/examine-documents")

if [ "$(echo "$EXAM_RESPONSE" | jq -r '.success')" = "true" ]; then
    echo "   ✓ Document examination working"
else
    echo "   ⚠ Document examination response: $(echo "$EXAM_RESPONSE" | jq -r '.message // .error.message')"
fi
echo ""

# 7. Test Payment Release
echo "7. Testing Payment Release..."
LC_AMOUNT=$(echo "$LC_DATA" | jq -r '.data.amount')
PAYMENT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{
        \"amount\": $LC_AMOUNT,
        \"currency\": \"USD\"
    }" \
    "$API_URL/banking/lc/$LC/release-payment")

if [ "$(echo "$PAYMENT_RESPONSE" | jq -r '.success')" = "true" ]; then
    echo "   ✓ Payment release working"
else
    echo "   ⚠ Payment release response: $(echo "$PAYMENT_RESPONSE" | jq -r '.message // .error.message')"
fi
echo ""

echo "=== Summary ==="
echo "All critical endpoints have been tested."
echo "Check the results above to see which actions are working."
