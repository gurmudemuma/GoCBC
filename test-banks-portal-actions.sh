#!/bin/bash

# Test Banks Portal Document Examination Actions
# Tests all buttons and API endpoints

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3001/api/v1"
AUTH_TOKEN="test-bypass-admin"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Banks Portal - Document Examination Actions Test          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_api() {
    local endpoint=$1
    local method=${2:-GET}
    local description=$3
    local data=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}[TEST $TOTAL_TESTS]${NC} $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$data" "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC} HTTP $http_code"
        echo "$body" | jq '.' 2>/dev/null | head -5
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC} HTTP $http_code"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

echo -e "${BLUE}=== 1. Testing LC Data Fetch ===${NC}"
echo ""

# Get an APPROVED LC for testing
LC_ID=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/banking/lc" | jq -r '.data[] | select(.status == "APPROVED") | .lcId' | head -1)
CONTRACT_ID=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/banking/lc/$LC_ID" | jq -r '.data.contractId')

echo "Using LC: $LC_ID"
echo "Contract: $CONTRACT_ID"
echo ""

test_api "/banking/lc/$LC_ID" "GET" "Fetch LC Details"
test_api "/banking/lc" "GET" "Fetch All LCs"

echo -e "${BLUE}=== 2. Testing Document Endpoints ===${NC}"
echo ""

# Get document IDs from the LC
DOC_ID=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/banking/lc/$LC_ID" | jq -r '.data.documents[0].documentId')

if [ -n "$DOC_ID" ] && [ "$DOC_ID" != "null" ]; then
    echo "Using Document: $DOC_ID"
    echo ""
    
    test_api "/documents/$DOC_ID" "GET" "Get Document Metadata"
    test_api "/documents/$DOC_ID/signatures" "GET" "Get Document Signatures"
    test_api "/documents/$DOC_ID/signature-status" "GET" "Get Signature Status"
    
    # Test document view (returns PDF, just check if endpoint responds)
    echo -e "${YELLOW}[TEST $((TOTAL_TESTS + 1))]${NC} View Document Endpoint"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    view_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/documents/$DOC_ID/view?token=$AUTH_TOKEN")
    if [ "$view_response" = "200" ] || [ "$view_response" = "302" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC} HTTP $view_response"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC} HTTP $view_response"
    fi
    echo ""
    
    # Test download endpoint
    echo -e "${YELLOW}[TEST $((TOTAL_TESTS + 1))]${NC} Download Document Endpoint"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    download_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/documents/$DOC_ID/download?token=$AUTH_TOKEN")
    if [ "$download_response" = "200" ] || [ "$download_response" = "302" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC} HTTP $download_response"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC} HTTP $download_response"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ No documents found for LC $LC_ID${NC}"
    echo ""
fi

echo -e "${BLUE}=== 3. Testing LC Actions ===${NC}"
echo ""

# Test LC Approval (if there's a REQUESTED LC)
REQUESTED_LC=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/banking/lc" | jq -r '.data[] | select(.status == "REQUESTED") | .lcId' | head -1)

if [ -n "$REQUESTED_LC" ] && [ "$REQUESTED_LC" != "null" ]; then
    test_api "/banking/lc/$REQUESTED_LC/approve" "POST" "Approve LC" '{
        "beneficiary": "Test Exporter",
        "advisingBank": "Commercial Bank of Ethiopia",
        "terms": "Standard UCP 600 terms"
    }'
fi

echo -e "${BLUE}=== 4. Testing Forex Endpoints ===${NC}"
echo ""

test_api "/forex" "GET" "Fetch Forex Allocations"
test_api "/forex/rates" "GET" "Get Exchange Rates"
test_api "/forex/exporter" "GET" "Get Exporter Forex"

# Test forex allocation (only if we have an approved LC without forex)
if [ -n "$LC_ID" ]; then
    # Check if forex already allocated
    FOREX_EXISTS=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/forex" | jq -r --arg lc "$LC_ID" '.data[]? | select(.lcId == $lc) | .forexId')
    
    if [ -z "$FOREX_EXISTS" ] || [ "$FOREX_EXISTS" = "null" ]; then
        test_api "/forex/allocate" "POST" "Allocate Forex to LC" "{
            \"lcId\": \"$LC_ID\",
            \"contractId\": \"$CONTRACT_ID\",
            \"exporterId\": \"EXP-TEST\",
            \"amount\": 4250,
            \"currency\": \"USD\",
            \"exchangeRate\": 57.5,
            \"retentionPercentage\": 70,
            \"amountInBirr\": 244375,
            \"retainedAmount\": 171062.5,
            \"forwardedAmount\": 73312.5
        }"
    else
        echo -e "${YELLOW}⚠ Forex already allocated for LC $LC_ID${NC}"
        echo ""
    fi
fi

echo -e "${BLUE}=== 5. Testing SWIFT Message Endpoints ===${NC}"
echo ""

test_api "/swift/messages" "GET" "Fetch SWIFT Messages"

echo -e "${BLUE}=== 6. Testing Payment Method Endpoints ===${NC}"
echo ""

test_api "/banking/documentary-collections" "GET" "Fetch Documentary Collections"
test_api "/banking/advance-payments" "GET" "Fetch Advance Payments"
test_api "/banking/consignment-payments" "GET" "Fetch Consignment Payments"

# Also test the stats endpoints
test_api "/stats/documentary-collections" "GET" "Documentary Collections Stats"
test_api "/stats/advance-payments" "GET" "Advance Payments Stats"
test_api "/stats/consignments" "GET" "Consignment Payments Stats"

echo -e "${BLUE}=== 7. Testing Contract Endpoints ===${NC}"
echo ""

test_api "/contracts" "GET" "Fetch Contracts"
if [ -n "$CONTRACT_ID" ]; then
    test_api "/contracts/$CONTRACT_ID" "GET" "Fetch Contract Details"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:    $TOTAL_TESTS"
echo -e "${GREEN}Passed:         $PASSED_TESTS${NC}"
echo -e "${RED}Failed:         $FAILED_TESTS${NC}"
echo -e "Success Rate:   $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
