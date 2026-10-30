#!/bin/bash

# Set NBE Retention Policy for Coffee Exports
# Per NBE FXD/01/2024: 40% retention requirement for coffee exports

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo "==============================================="
echo "Setting NBE Retention Policy for Coffee"
echo "==============================================="
echo ""

# Set 40% retention policy for COFFEE
RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "commodityType": "COFFEE",
        "retentionRate": 40,
        "setBy": "NBE Director General",
        "justification": "Per NBE FXD/01/2024 - Coffee export earnings retention policy"
    }' \
    "$API_URL/retention/policy")

echo "Response:"
echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "✅ NBE Retention Policy Set Successfully!"
    echo ""
    echo "Policy Details:"
    echo "  Commodity: COFFEE"
    echo "  Retention Rate: 40%"
    echo "  Surrender Rate: 60%"
    echo "  Status: ACTIVE"
    echo ""
    echo "Banks can now allocate forex for coffee exports."
else
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error // "Unknown error"')
    echo ""
    echo "❌ Failed to set retention policy: $ERROR_MSG"
    exit 1
fi
