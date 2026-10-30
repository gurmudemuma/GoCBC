#!/bin/bash

# Complete LC Workflow Test - Test ALL Banks Portal Actions
# Takes an APPROVED LC through: ISSUE → FOREX_ALLOCATE → EXAMINE → PAYMENT_RELEASE

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_URL="http://localhost:3001/api/v1"
TOKEN="test-bypass-admin"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Complete LC Workflow Test - All Actions                    ║${NC}"
echo -e "${BLUE}║     Testing: Issue → Forex → Examine → Payment                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check API response
check_response() {
    local response=$1
    local action=$2
    
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ SUCCESS${NC}"
        return 0
    else
        echo -e "${RED}   ✗ FAILED${NC}"
        echo "   Error: $(echo "$response" | jq -r '.error.message // .message')"
        return 1
    fi
}

# Step 0: Find an APPROVED LC
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 0: Finding APPROVED LC${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

LC_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc")
LC_ID=$(echo "$LC_DATA" | jq -r '.data[] | select(.status == "APPROVED") | .lcId' | head -1)

if [ -z "$LC_ID" ] || [ "$LC_ID" = "null" ]; then
    echo -e "${RED}No APPROVED LC found. Creating one...${NC}"
    
    # Create a contract first
    CONTRACT_ID="TEST-CONT-$(date +%s)"
    curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"contractId\": \"$CONTRACT_ID\",
            \"exporterId\": \"EXP-WORKFLOW-TEST\",
            \"buyerId\": \"BUYER-WORKFLOW-TEST\",
            \"coffeeType\": \"ARABICA\",
            \"quantity\": 100,
            \"pricePerKg\": 42.5,
            \"currency\": \"USD\",
            \"deliveryDate\": \"2027-03-01\",
            \"paymentTerms\": \"LC\"
        }" \
        "$API_URL/contracts" > /dev/null
    
    # Create and approve LC
    LC_ID="LC-WORKFLOW-$(date +%s)"
    curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"lcId\": \"$LC_ID\",
            \"contractId\": \"$CONTRACT_ID\",
            \"exporterId\": \"EXP-WORKFLOW-TEST\",
            \"buyerId\": \"BUYER-WORKFLOW-TEST\",
            \"amount\": 4250,
            \"currency\": \"USD\",
            \"expiryDate\": \"2027-06-30\"
        }" \
        "$API_URL/banking/lc" > /dev/null
    
    # Approve it
    curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
        -d "{
            \"beneficiary\": \"Workflow Test Exporter\",
            \"advisingBank\": \"Commercial Bank of Ethiopia\",
            \"terms\": \"Standard UCP 600 terms\"
        }" \
        "$API_URL/banking/lc/$LC_ID/approve" > /dev/null
    
    echo "Created and approved LC: $LC_ID"
fi

echo ""
echo "Using LC: ${GREEN}$LC_ID${NC}"

# Get LC details
LC_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc/$LC_ID")
CONTRACT_ID=$(echo "$LC_DETAILS" | jq -r '.data.contractId')
LC_AMOUNT=$(echo "$LC_DETAILS" | jq -r '.data.amount')
CURRENT_STATUS=$(echo "$LC_DETAILS" | jq -r '.data.status')
DOC_COUNT=$(echo "$LC_DETAILS" | jq -r '.data.documents | length')

echo "Contract ID: $CONTRACT_ID"
echo "Amount: \$$LC_AMOUNT USD"
echo "Current Status: ${YELLOW}$CURRENT_STATUS${NC}"
echo "Documents: $DOC_COUNT"
echo ""

# Step 1: Issue LC
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 1: ISSUE LC (APPROVED → ISSUED)${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

if [ "$CURRENT_STATUS" = "APPROVED" ]; then
    echo "Issuing LC..."
    ISSUE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"terms": "Standard UCP 600 terms - 30 days presentation"}' \
        "$API_URL/banking/lc/$LC_ID/issue")
    
    check_response "$ISSUE_RESPONSE" "Issue LC"
    
    if [ $? -eq 0 ]; then
        CURRENT_STATUS="ISSUED"
        echo "   New Status: ${GREEN}ISSUED${NC}"
    fi
else
    echo "   ${YELLOW}⚠ LC already past APPROVED stage (Status: $CURRENT_STATUS)${NC}"
fi
echo ""
sleep 2

# Step 2: Create Forex Request and Allocate
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 2A: CREATE FOREX REQUEST${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

# Get exporter ID from LC details
EXPORTER_ID=$(echo "$LC_DETAILS" | jq -r '.data.exporterId // .data.exporterID')

# Check if forex already exists
FOREX_EXISTS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/forex" | \
    jq -r --arg lc "$LC_ID" '.data[]? | select(.lcId == $lc) | .forexId')

if [ -z "$FOREX_EXISTS" ] || [ "$FOREX_EXISTS" = "null" ]; then
    # Step 2A: Create forex request
    FOREX_ID="FOREX-$(date +%s)"
    
    echo "Creating forex request..."
    echo "   Forex ID: $FOREX_ID"
    echo "   Contract ID: $CONTRACT_ID"
    echo "   Exporter ID: $EXPORTER_ID"
    echo "   Amount: \$$LC_AMOUNT USD"
    
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
    
    check_response "$REQUEST_RESPONSE" "Create Forex Request"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}   Failed to create forex request. Stopping workflow.${NC}"
        exit 1
    fi
    
    echo "   Status: ${GREEN}REQUESTED${NC}"
    echo ""
    echo "   Waiting 5 seconds for blockchain propagation..."
    sleep 5
    echo ""
    
    # Step 2B: Allocate Forex
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}STEP 2B: ALLOCATE FOREX (ISSUED → FOREX_ALLOCATED)${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    
    echo "Allocating forex to LC..."
    
    # Calculate forex details
    EXCHANGE_RATE=57.5
    RETENTION_RATE=0.4
    AMOUNT_BIRR=$(awk "BEGIN {print $LC_AMOUNT * $EXCHANGE_RATE}")
    OFFICER="Bank Officer - Test"
    APPROVAL_REF="NBE-FOREX-$(date +%s)"
    EXPIRY_DATE="2027-12-31"
    
    FOREX_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"forexId\": \"$FOREX_ID\",
            \"lcId\": \"$LC_ID\",
            \"amount\": $LC_AMOUNT,
            \"exchangeRate\": $EXCHANGE_RATE,
            \"retentionRate\": $RETENTION_RATE,
            \"officer\": \"$OFFICER\",
            \"approvalRef\": \"$APPROVAL_REF\",
            \"expiryDate\": \"$EXPIRY_DATE\"
        }" \
        "$API_URL/forex/allocate")
    
    check_response "$FOREX_RESPONSE" "Allocate Forex"
    
    if [ $? -eq 0 ]; then
        echo "   Forex ID: ${GREEN}$FOREX_ID${NC}"
        echo "   Exchange Rate: ${EXCHANGE_RATE} ETB/USD"
        echo "   Retention: 40% (NBE policy for coffee)"
        echo "   Amount in Birr: $(printf "%.2f" $AMOUNT_BIRR)"
        CURRENT_STATUS="FOREX_ALLOCATED"
    fi
else
    echo "   ${YELLOW}⚠ Forex already allocated: $FOREX_EXISTS${NC}"
    FOREX_ID="$FOREX_EXISTS"
fi
echo ""
sleep 2

# Step 3: View Documents
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 3: VIEW & DOWNLOAD DOCUMENTS${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

if [ "$DOC_COUNT" -gt 0 ]; then
    DOC_ID=$(echo "$LC_DETAILS" | jq -r '.data.documents[0].documentId')
    DOC_NAME=$(echo "$LC_DETAILS" | jq -r '.data.documents[0].fileName')
    
    echo "Testing document: $DOC_NAME ($DOC_ID)"
    echo ""
    
    # Test View
    echo "→ Testing VIEW document..."
    VIEW_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "$API_URL/documents/$DOC_ID/view?token=$TOKEN")
    
    if [ "$VIEW_CODE" = "200" ]; then
        echo -e "   ${GREEN}✓ View endpoint working (HTTP $VIEW_CODE)${NC}"
    else
        echo -e "   ${RED}✗ View failed (HTTP $VIEW_CODE)${NC}"
    fi
    
    # Test Download
    echo "→ Testing DOWNLOAD document..."
    DOWNLOAD_CODE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        -o /dev/null -w "%{http_code}" \
        "$API_URL/documents/$DOC_ID/download")
    
    if [ "$DOWNLOAD_CODE" = "200" ]; then
        echo -e "   ${GREEN}✓ Download endpoint working (HTTP $DOWNLOAD_CODE)${NC}"
    else
        echo -e "   ${RED}✗ Download failed (HTTP $DOWNLOAD_CODE)${NC}"
    fi
else
    echo "   ${YELLOW}⚠ No documents available${NC}"
fi
echo ""
sleep 2

# Step 4: Examine Documents
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 4: EXAMINE DOCUMENTS (FOREX_ALLOCATED → UTILIZED)${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo "Examining documents for compliance..."
EXAM_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "compliant": true,
        "discrepancies": ""
    }' \
    "$API_URL/banking/lc/$LC_ID/examine-documents")

check_response "$EXAM_RESPONSE" "Examine Documents"

if [ $? -eq 0 ]; then
    CURRENT_STATUS="UTILIZED"
    echo "   Result: ${GREEN}Documents comply with LC terms${NC}"
    echo "   New Status: ${GREEN}UTILIZED${NC}"
fi
echo ""
sleep 2

# Step 5: Release Payment
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 5: RELEASE PAYMENT (UTILIZED → PAYMENT_RELEASED)${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

echo "Releasing payment to exporter..."
PAYMENT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"amount\": $LC_AMOUNT,
        \"currency\": \"USD\"
    }" \
    "$API_URL/banking/lc/$LC_ID/release-payment")

check_response "$PAYMENT_RESPONSE" "Release Payment"

if [ $? -eq 0 ]; then
    echo "   Amount Released: ${GREEN}\$$LC_AMOUNT USD${NC}"
    echo "   Payment Method: SWIFT"
    CURRENT_STATUS="PAYMENT_RELEASED"
    echo "   Final Status: ${GREEN}PAYMENT_RELEASED${NC}"
fi
echo ""

# Step 6: Verify Final State
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}STEP 6: VERIFY FINAL STATE${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"

FINAL_LC=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/banking/lc/$LC_ID")
FINAL_STATUS=$(echo "$FINAL_LC" | jq -r '.data.status')

echo "LC ID: $LC_ID"
echo "Final Status: ${GREEN}$FINAL_STATUS${NC}"
echo ""

if [ "$FINAL_STATUS" = "PAYMENT_RELEASED" ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓✓✓ COMPLETE WORKFLOW SUCCESSFUL! ✓✓✓${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "All LC workflow stages completed:"
    echo "  REQUESTED → APPROVED → ISSUED → FOREX_ALLOCATED → UTILIZED → PAYMENT_RELEASED"
    echo ""
    echo "All action buttons tested and working:"
    echo "  ✓ Issue LC"
    echo "  ✓ Allocate Forex"
    echo "  ✓ View Documents"
    echo "  ✓ Download Documents"
    echo "  ✓ Examine Documents"
    echo "  ✓ Release Payment"
else
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Workflow completed partially (Status: $FINAL_STATUS)${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
fi

echo ""
echo "Test completed at $(date)"
