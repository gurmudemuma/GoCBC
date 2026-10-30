#!/bin/bash

# Complete LC Workflow Test with NBE Retention Policy Setup
# Step 1: Set NBE retention policy (if not exists)
# Step 2: Run complete LC workflow: Issue → Forex Request → Allocate → Examine → Payment

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Complete LC Workflow Test with NBE Policy Setup              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 0: Check and set NBE retention policy
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 0: NBE RETENTION POLICY SETUP"
echo "═══════════════════════════════════════════════════════════════"

# Check if policy exists
POLICY_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/retention/policy/COFFEE")
POLICY_EXISTS=$(echo "$POLICY_CHECK" | jq -r '.success // false')

if [ "$POLICY_EXISTS" = "true" ]; then
    RETENTION_RATE=$(echo "$POLICY_CHECK" | jq -r '.data.RetentionRate // .data.retentionRate')
    echo "✓ NBE Retention Policy already exists"
    echo "  Commodity: COFFEE"
    echo "  Retention Rate: ${RETENTION_RATE}%"
else
    echo "→ Setting NBE Retention Policy for COFFEE..."
    
    POLICY_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "commodityType": "COFFEE",
            "retentionRate": 40,
            "setBy": "NBE Director General",
            "justification": "Per NBE FXD/01/2024 - Coffee export earnings retention policy"
        }' \
        "$API_URL/retention/policy")
    
    POLICY_SUCCESS=$(echo "$POLICY_RESPONSE" | jq -r '.success // false')
    
    if [ "$POLICY_SUCCESS" = "true" ]; then
        echo "✅ NBE Retention Policy set successfully!"
        echo "  Commodity: COFFEE"
        echo "  Retention Rate: 40%"
        echo "  Surrender Rate: 60%"
    else
        ERROR_MSG=$(echo "$POLICY_RESPONSE" | jq -r '.error.message // "Unknown error"')
        echo "❌ Failed to set policy: $ERROR_MSG"
        echo ""
        echo "Response:"
        echo "$POLICY_RESPONSE" | jq '.'
        exit 1
    fi
fi

echo ""
sleep 2

# Step 1: Find or create APPROVED LC
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 1: FIND APPROVED LC"
echo "═══════════════════════════════════════════════════════════════"

LC_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc")
LC_ID=$(echo "$LC_DATA" | jq -r '.data[] | select(.status == "APPROVED") | .lcId' | head -1)

if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
    echo "No APPROVED LC found - using existing test LC"
    LC_ID="LC-1793296548"
fi

echo "Using LC: $LC_ID"

# Get LC details
LC_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc/$LC_ID")
CONTRACT_ID=$(echo "$LC_DETAILS" | jq -r '.data.contractId // .data.contractID')
EXPORTER_ID=$(echo "$LC_DETAILS" | jq -r '.data.exporterId // .data.exporterID')
LC_AMOUNT=$(echo "$LC_DETAILS" | jq -r '.data.amount')
CURRENT_STATUS=$(echo "$LC_DETAILS" | jq -r '.data.status')

echo "Contract ID: $CONTRACT_ID"
echo "Exporter ID: $EXPORTER_ID"
echo "Amount: \$$LC_AMOUNT USD"
echo "Status: $CURRENT_STATUS"
echo ""
sleep 1

# Step 2: Issue LC (if not already issued)
if [ "$CURRENT_STATUS" = "APPROVED" ]; then
    echo "═══════════════════════════════════════════════════════════════"
    echo "STEP 2: ISSUE LC"
    echo "═══════════════════════════════════════════════════════════════"
    
    ISSUE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"terms": "Standard UCP 600 terms"}' \
        "$API_URL/banking/lc/$LC_ID/issue")
    
    ISSUE_SUCCESS=$(echo "$ISSUE_RESPONSE" | jq -r '.success // false')
    
    if [ "$ISSUE_SUCCESS" = "true" ]; then
        echo "✅ LC issued successfully"
        CURRENT_STATUS="ISSUED"
    else
        echo "❌ Failed to issue LC"
        echo "$ISSUE_RESPONSE" | jq '.'
        exit 1
    fi
    echo ""
    sleep 2
fi

# Step 3: Create Forex Request
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 3A: CREATE FOREX REQUEST"
echo "═══════════════════════════════════════════════════════════════"

FOREX_ID="FOREX-$(date +%s)"

echo "Creating forex request..."
echo "  Forex ID: $FOREX_ID"
echo "  Contract: $CONTRACT_ID"
echo "  Amount: \$$LC_AMOUNT USD"

REQUEST_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"forexId\": \"$FOREX_ID\",
        \"contractId\": \"$CONTRACT_ID\",
        \"exporterId\": \"$EXPORTER_ID\",
        \"amount\": $LC_AMOUNT,
        \"currency\": \"USD\"
    }" \
    "$API_URL/forex/request")

REQUEST_SUCCESS=$(echo "$REQUEST_RESPONSE" | jq -r '.success // false')

if [ "$REQUEST_SUCCESS" = "true" ]; then
    echo "✅ Forex request created"
else
    echo "❌ Failed to create forex request"
    echo "$REQUEST_RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo "Waiting 5 seconds for blockchain propagation..."
sleep 5
echo ""

# Step 4: Allocate Forex
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 3B: ALLOCATE FOREX"
echo "═══════════════════════════════════════════════════════════════"

echo "Allocating forex with NBE retention policy..."

ALLOCATE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"forexId\": \"$FOREX_ID\",
        \"lcId\": \"$LC_ID\",
        \"amount\": $LC_AMOUNT,
        \"exchangeRate\": 57.5,
        \"retentionRate\": 40,
        \"officer\": \"Bank Officer - Test\",
        \"approvalRef\": \"NBE-FOREX-$(date +%s)\",
        \"expiryDate\": \"2027-12-31\"
    }" \
    "$API_URL/forex/allocate")

ALLOCATE_SUCCESS=$(echo "$ALLOCATE_RESPONSE" | jq -r '.success // false')

if [ "$ALLOCATE_SUCCESS" = "true" ]; then
    RETENTION_AMOUNT=$(echo "$ALLOCATE_RESPONSE" | jq -r '.data.retentionAmount')
    RELEASE_AMOUNT=$(echo "$ALLOCATE_RESPONSE" | jq -r '.data.releaseAmount')
    
    echo "✅ Forex allocated successfully!"
    echo "  Total: \$$LC_AMOUNT USD"
    echo "  Retention (40%): \$$RETENTION_AMOUNT USD"
    echo "  Release (60%): \$$RELEASE_AMOUNT USD"
else
    echo "❌ Failed to allocate forex"
    ERROR_MSG=$(echo "$ALLOCATE_RESPONSE" | jq -r '.error.message // "Unknown error"')
    echo "Error: $ERROR_MSG"
    echo ""
    echo "Full response:"
    echo "$ALLOCATE_RESPONSE" | jq '.'
    exit 1
fi

echo ""
sleep 2

# Step 5: Examine Documents
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 4: EXAMINE DOCUMENTS"
echo "═══════════════════════════════════════════════════════════════"

EXAM_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "compliant": true,
        "discrepancies": ""
    }' \
    "$API_URL/banking/lc/$LC_ID/examine-documents")

EXAM_SUCCESS=$(echo "$EXAM_RESPONSE" | jq -r '.success // false')

if [ "$EXAM_SUCCESS" = "true" ]; then
    echo "✅ Documents examined and compliant"
else
    echo "❌ Failed to examine documents"
    echo "$EXAM_RESPONSE" | jq '.'
    exit 1
fi

echo ""
sleep 2

# Step 6: Release Payment
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 5: RELEASE PAYMENT"
echo "═══════════════════════════════════════════════════════════════"

PAYMENT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"amount\": $LC_AMOUNT,
        \"currency\": \"USD\"
    }" \
    "$API_URL/banking/lc/$LC_ID/release-payment")

PAYMENT_SUCCESS=$(echo "$PAYMENT_RESPONSE" | jq -r '.success // false')

if [ "$PAYMENT_SUCCESS" = "true" ]; then
    echo "✅ Payment released successfully!"
    echo "  Amount: \$$LC_AMOUNT USD"
else
    echo "❌ Failed to release payment"
    echo "$PAYMENT_RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✓✓✓  COMPLETE WORKFLOW SUCCESSFUL!  ✓✓✓                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Workflow completed successfully:"
echo "  ✓ NBE Retention Policy (40% for COFFEE)"
echo "  ✓ LC Issued"
echo "  ✓ Forex Requested"
echo "  ✓ Forex Allocated (with retention)"
echo "  ✓ Documents Examined"
echo "  ✓ Payment Released"
echo ""
echo "LC Status: PAYMENT_RELEASED"
echo ""
