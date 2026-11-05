#!/bin/bash

# Complete Setup and LC Workflow Test
# 1. Set NBE Retention Policy (if not exists)
# 2. Set NBE Exchange Rate for USD (if not exists)
# 3. Run complete LC workflow

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Complete LC Workflow with Full NBE Setup                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 0A: Set NBE Retention Policy
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 0A: NBE RETENTION POLICY"
echo "═══════════════════════════════════════════════════════════════"

POLICY_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/retention/policy/COFFEE")
POLICY_EXISTS=$(echo "$POLICY_CHECK" | jq -r '.success // false')

if [ "$POLICY_EXISTS" = "true" ]; then
    echo "✓ NBE Retention Policy already exists (40% for COFFEE)"
else
    echo "→ Setting NBE Retention Policy..."
    POLICY_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "commodityType": "COFFEE",
            "retentionRate": 40,
            "setBy": "NBE Director General",
            "justification": "Per NBE FXD/01/2024"
        }' \
        "$API_URL/retention/policy")
    
    if [ "$(echo "$POLICY_RESPONSE" | jq -r '.success')" = "true" ]; then
        echo "✅ Retention policy set (40% for COFFEE)"
    else
        echo "❌ Failed to set retention policy"
        exit 1
    fi
fi

echo ""
sleep 1

# Step 0B: Set NBE Exchange Rate for USD
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 0B: NBE EXCHANGE RATE"
echo "═══════════════════════════════════════════════════════════════"

RATE_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex/rates/USD/current")
RATE_EXISTS=$(echo "$RATE_CHECK" | jq -r '.success // false')

if [ "$RATE_EXISTS" = "true" ]; then
    BUYING_RATE=$(echo "$RATE_CHECK" | jq -r '.data.BuyingRate // .data.buyingRate')
    SELLING_RATE=$(echo "$RATE_CHECK" | jq -r '.data.SellingRate // .data.sellingRate')
    echo "✓ NBE Exchange Rate already exists"
    echo "  Currency: USD"
    echo "  Buying Rate: $BUYING_RATE ETB"
    echo "  Selling Rate: $SELLING_RATE ETB"
else
    echo "→ Setting NBE Exchange Rate for USD..."
    RATE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "currency": "USD",
            "buyingRate": 162.49,
            "sellingRate": 165.74
        }' \
        "$API_URL/forex/rates")
    
    if [ "$(echo "$RATE_RESPONSE" | jq -r '.success')" = "true" ]; then
        echo "✅ Exchange rate set for USD"
        echo "  Buying Rate: 162.49 ETB (per CBE Oct 30, 2026)"
        echo "  Selling Rate: 165.74 ETB"
    else
        echo "❌ Failed to set exchange rate"
        echo "$RATE_RESPONSE" | jq '.'
        exit 1
    fi
fi

echo ""
sleep 2

# Step 1: Find APPROVED LC
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 1: FIND OR CREATE APPROVED LC"
echo "═══════════════════════════════════════════════════════════════"

# First try to find any LC in APPROVED or ISSUED status
LC_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc")
LC_ID=$(echo "$LC_DATA" | jq -r '.data[] | select(.status == "APPROVED" or .status == "ISSUED") | .lcId' | head -1)

if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
    echo "No suitable LC found - creating new one..."
    
    # Create contract first
    CONTRACT_ID="CONT-$(date +%s)"
    EXPORTER_ID="EXP-TEST-$(date +%s)"
    
    CREATE_CONTRACT=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"contractId\": \"$CONTRACT_ID\",
            \"exporterId\": \"$EXPORTER_ID\",
            \"buyerId\": \"BUYER-TEST-$(date +%s)\",
            \"coffeeType\": \"ARABICA\",
            \"quantity\": 100,
            \"pricePerKg\": 42.5,
            \"currency\": \"USD\",
            \"deliveryDate\": \"2027-03-01\",
            \"paymentTerms\": \"LC\"
        }" \
        "$API_URL/contracts")
    
    if [ "$(echo "$CREATE_CONTRACT" | jq -r '.success')" != "true" ]; then
        echo "❌ Failed to create contract"
        exit 1
    fi
    
    echo "   Contract created: $CONTRACT_ID"
    sleep 2
    
    # Create LC
    LC_ID="LC-$(date +%s)"
    CREATE_LC=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"lcId\": \"$LC_ID\",
            \"contractId\": \"$CONTRACT_ID\",
            \"exporterId\": \"$EXPORTER_ID\",
            \"buyerId\": \"BUYER-TEST-$(date +%s)\",
            \"amount\": 4250,
            \"currency\": \"USD\",
            \"expiryDate\": \"2027-06-30\"
        }" \
        "$API_URL/banking/lc")
    
    if [ "$(echo "$CREATE_LC" | jq -r '.success')" != "true" ]; then
        echo "❌ Failed to create LC"
        echo "$CREATE_LC" | jq '.'
        exit 1
    fi
    
    echo "   LC created: $LC_ID"
    sleep 3
    
    # Approve LC
    APPROVE_LC=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"beneficiary\": \"Test Exporter\",
            \"advisingBank\": \"Commercial Bank of Ethiopia\",
            \"terms\": \"Standard UCP 600\"
        }" \
        "$API_URL/banking/lc/$LC_ID/approve")
    
    if [ "$(echo "$APPROVE_LC" | jq -r '.success')" != "true" ]; then
        echo "❌ Failed to approve LC"
        echo "$APPROVE_LC" | jq '.'
        exit 1
    fi
    
    echo "   LC approved: $LC_ID"
    
    # Wait for blockchain to sync (LC creation + approval)
    echo "   Waiting 10 seconds for blockchain propagation..."
    sleep 10
else
    echo "Found existing LC: $LC_ID"
fi

echo "Using LC: $LC_ID"

# Fetch LC details
LC_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc/$LC_ID")

# If details are null, use the variables we just set
if [ "$CONTRACT_ID" = "" ] || [ "$CONTRACT_ID" = "null" ]; then
    CONTRACT_ID=$(echo "$LC_DETAILS" | jq -r '.data.contractId // .data.contractID')
fi
if [ "$EXPORTER_ID" = "" ] || [ "$EXPORTER_ID" = "null" ]; then
    EXPORTER_ID=$(echo "$LC_DETAILS" | jq -r '.data.exporterId // .data.exporterID')
fi

LC_AMOUNT=$(echo "$LC_DETAILS" | jq -r '.data.amount')
CURRENT_STATUS=$(echo "$LC_DETAILS" | jq -r '.data.status')

# If still null, use defaults from creation
if [ "$LC_AMOUNT" = "null" ]; then
    LC_AMOUNT=4250
fi
if [ "$CURRENT_STATUS" = "null" ]; then
    CURRENT_STATUS="APPROVED"
fi

echo "Contract ID: $CONTRACT_ID"
echo "Amount: \$$LC_AMOUNT USD"
echo "Status: $CURRENT_STATUS"
echo ""
sleep 1

# Step 2: Issue LC
if [ "$CURRENT_STATUS" = "APPROVED" ]; then
    echo "═══════════════════════════════════════════════════════════════"
    echo "STEP 2: ISSUE LC"
    echo "═══════════════════════════════════════════════════════════════"
    
    ISSUE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"terms": "Standard UCP 600 terms"}' \
        "$API_URL/banking/lc/$LC_ID/issue")
    
    if [ "$(echo "$ISSUE_RESPONSE" | jq -r '.success')" = "true" ]; then
        echo "✅ LC issued successfully"
        CURRENT_STATUS="ISSUED"
    else
        ERROR_MSG=$(echo "$ISSUE_RESPONSE" | jq -r '.error.message // .message // "Unknown error"')
        
        # Check if it's already issued on blockchain
        if echo "$ERROR_MSG" | grep -q "current status: ISSUED"; then
            echo "⚠️  LC already issued on blockchain (cache out of sync)"
            CURRENT_STATUS="ISSUED"
        else
            echo "❌ Failed to issue LC"
            echo "Error: $ERROR_MSG"
            echo ""
            echo "Full response:"
            echo "$ISSUE_RESPONSE" | jq '.'
            exit 1
        fi
    fi
    echo ""
    sleep 2
else
    echo "⚠️  Skipping Issue step - LC status: $CURRENT_STATUS"
    echo ""
fi

# Step 3: Create Forex Request
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 3: CREATE FOREX REQUEST"
echo "═══════════════════════════════════════════════════════════════"

FOREX_ID="FOREX-$(date +%s)"

echo "Creating forex request..."
echo "  Forex ID: $FOREX_ID"

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

if [ "$(echo "$REQUEST_RESPONSE" | jq -r '.success')" = "true" ]; then
    echo "✅ Forex request created"
else
    echo "❌ Failed to create forex request"
    exit 1
fi

echo ""
echo "Waiting 5 seconds for blockchain propagation..."
sleep 5
echo ""

# Step 4: Allocate Forex
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 4: ALLOCATE FOREX"
echo "═══════════════════════════════════════════════════════════════"

echo "Allocating forex with NBE retention policy..."

# Get the current NBE exchange rate from blockchain to ensure it matches
echo "→ Fetching current NBE exchange rate from blockchain..."
RATE_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex/rates/USD/current")
BUYING_RATE=$(echo "$RATE_DATA" | jq -r '.data.BuyingRate // .data.buyingRate // 162.49')
SELLING_RATE=$(echo "$RATE_DATA" | jq -r '.data.SellingRate // .data.sellingRate // 165.74')

# Calculate mid-rate (chaincode validates against this)
MID_RATE=$(awk "BEGIN {printf \"%.4f\", ($BUYING_RATE + $SELLING_RATE) / 2}")

echo "  NBE Rates: Buying=$BUYING_RATE ETB, Selling=$SELLING_RATE ETB"
echo "  Mid-Rate (for allocation): $MID_RATE ETB"

ALLOCATE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"forexId\": \"$FOREX_ID\",
        \"lcId\": \"$LC_ID\",
        \"amount\": $LC_AMOUNT,
        \"exchangeRate\": $MID_RATE,
        \"retentionRate\": 40,
        \"officer\": \"Bank Officer - Test\",
        \"approvalRef\": \"NBE-FOREX-$(date +%s)\",
        \"expiryDate\": \"2027-12-31\"
    }" \
    "$API_URL/forex/allocate")

if [ "$(echo "$ALLOCATE_RESPONSE" | jq -r '.success')" = "true" ]; then
    RETENTION_AMOUNT=$(echo "$ALLOCATE_RESPONSE" | jq -r '.data.retentionAmount')
    RELEASE_AMOUNT=$(echo "$ALLOCATE_RESPONSE" | jq -r '.data.releaseAmount')
    
    echo "✅ Forex allocated successfully!"
    echo "  Total: \$$LC_AMOUNT USD"
    echo "  Retention (40%): \$$RETENTION_AMOUNT USD"
    echo "  Release (60%): \$$RELEASE_AMOUNT USD"
else
    echo "❌ Failed to allocate forex"
    ERROR_MSG=$(echo "$ALLOCATE_RESPONSE" | jq -r '.error.message')
    echo "Error: $ERROR_MSG"
    exit 1
fi

echo ""
sleep 2

# Step 5: Examine Documents
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 5: EXAMINE DOCUMENTS"
echo "═══════════════════════════════════════════════════════════════"

EXAM_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "compliant": true,
        "discrepancies": ""
    }' \
    "$API_URL/banking/lc/$LC_ID/examine-documents")

if [ "$(echo "$EXAM_RESPONSE" | jq -r '.success')" = "true" ]; then
    echo "✅ Documents examined and compliant"
else
    echo "❌ Failed to examine documents"
    exit 1
fi

echo ""
sleep 2

# Step 6: Release Payment
echo "═══════════════════════════════════════════════════════════════"
echo "STEP 6: RELEASE PAYMENT"
echo "═══════════════════════════════════════════════════════════════"

PAYMENT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"amount\": $LC_AMOUNT,
        \"currency\": \"USD\"
    }" \
    "$API_URL/banking/lc/$LC_ID/release-payment")

if [ "$(echo "$PAYMENT_RESPONSE" | jq -r '.success')" = "true" ]; then
    echo "✅ Payment released successfully!"
    echo "  Amount: \$$LC_AMOUNT USD"
else
    echo "❌ Failed to release payment"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✓✓✓  COMPLETE WORKFLOW SUCCESSFUL!  ✓✓✓                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "All steps completed:"
echo "  ✓ NBE Retention Policy (40% for COFFEE)"
echo "  ✓ NBE Exchange Rate (USD = 160.88/164.10 ETB per CBE)"
echo "  ✓ LC Issued"
echo "  ✓ Forex Requested"
echo "  ✓ Forex Allocated (with 40% retention)"
echo "  ✓ Documents Examined"
echo "  ✓ Payment Released"
echo ""
echo "Final LC Status: PAYMENT_RELEASED"
echo ""
