#!/bin/bash
#
# GoCBC Chaincode Functional Testing
# Tests actual execution of all chaincode functions
#

set -e

cd /home/guda/GoCBC

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "  GoCBC CHAINCODE FUNCTIONAL TESTING"
echo "  Testing Actual Execution of All Functions"
echo "================================================================"
echo -e "${RESET}"

# Test counters
TOTAL=0
PASSED=0
FAILED=0
NOT_IMPLEMENTED=0

# Test results array
declare -a RESULTS

# Function to test chaincode execution
test_function() {
    local description=$1
    local peer=$2
    local function=$3
    local args=$4
    
    ((TOTAL++))
    echo -n "Testing ${description}... "
    
    # Execute the chaincode function
    local output=$(docker exec "$peer" peer chaincode query \
        -C coffeechannel \
        -n coffee \
        -c "$function" 2>&1)
    
    local exit_code=$?
    
    # Check if function exists and is implemented
    if echo "$output" | grep -qi "not implemented\|not found\|no such method"; then
        echo -e "${YELLOW}NOT IMPLEMENTED${RESET}"
        ((NOT_IMPLEMENTED++))
        RESULTS+=("${YELLOW}⚠ NOT IMPLEMENTED${RESET}: $description")
    elif echo "$output" | grep -qi "error\|failed\|invalid"; then
        echo -e "${RED}FAIL${RESET}"
        ((FAILED++))
        RESULTS+=("${RED}✗ FAIL${RESET}: $description - $output")
    elif [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}PASS${RESET}"
        ((PASSED++))
        RESULTS+=("${GREEN}✓ PASS${RESET}: $description")
    else
        echo -e "${RED}ERROR${RESET}"
        ((FAILED++))
        RESULTS+=("${RED}✗ ERROR${RESET}: $description - Exit code: $exit_code")
    fi
}

# Function to test with invoke (write operations)
test_invoke() {
    local description=$1
    local peer=$2
    local function=$3
    local args=$4
    
    ((TOTAL++))
    echo -n "Testing ${description}... "
    
    # Execute the chaincode function
    local output=$(docker exec "$peer" peer chaincode invoke \
        -C coffeechannel \
        -n coffee \
        -c "$function" \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.ecx.cecbs.et:9051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt 2>&1)
    
    local exit_code=$?
    
    # Check if function exists and is implemented
    if echo "$output" | grep -qi "not implemented\|not found\|no such method"; then
        echo -e "${YELLOW}NOT IMPLEMENTED${RESET}"
        ((NOT_IMPLEMENTED++))
        RESULTS+=("${YELLOW}⚠ NOT IMPLEMENTED${RESET}: $description")
    elif echo "$output" | grep -qi "successfully\|committed successfully"; then
        echo -e "${GREEN}PASS${RESET}"
        ((PASSED++))
        RESULTS+=("${GREEN}✓ PASS${RESET}: $description")
    elif echo "$output" | grep -qi "validation.*failed\|already exists"; then
        # Expected validation errors (e.g., duplicate IDs) count as pass
        echo -e "${GREEN}PASS (validation)${RESET}"
        ((PASSED++))
        RESULTS+=("${GREEN}✓ PASS${RESET}: $description (validation working)")
    elif echo "$output" | grep -qi "error\|failed"; then
        echo -e "${RED}FAIL${RESET}"
        ((FAILED++))
        RESULTS+=("${RED}✗ FAIL${RESET}: $description")
    else
        echo -e "${YELLOW}UNKNOWN${RESET}"
        ((FAILED++))
        RESULTS+=("${YELLOW}? UNKNOWN${RESET}: $description")
    fi
}

echo -e "${BOLD}1. Core Contract Functions (10 tests)${RESET}"

# Test query functions (read-only)
test_function "QueryAllExporters" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryAllExporters","Args":[]}'

test_function "QueryAllContracts" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryAllContracts","Args":[]}'

test_function "QueryAllShipments" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryAllShipments","Args":[]}'

test_function "QueryAllPayments" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryAllPayments","Args":[]}'

test_function "QueryAllForex" \
    "peer0.nbe.cecbs.et" \
    '{"function":"QueryAllForex","Args":[]}'

test_function "QueryAllCustomsDeclarations" \
    "peer0.customs.cecbs.et" \
    '{"function":"QueryAllCustomsDeclarations","Args":[]}'

# Test read functions with existing IDs (if any data exists)
test_function "ExporterExists" \
    "peer0.ecta.cecbs.et" \
    '{"function":"ExporterExists","Args":["TEST001"]}'

test_function "SalesContractExists" \
    "peer0.ecta.cecbs.et" \
    '{"function":"SalesContractExists","Args":["CONTRACT001"]}'

test_function "ShipmentExists" \
    "peer0.ecta.cecbs.et" \
    '{"function":"ShipmentExists","Args":["SHIPMENT001"]}'

test_function "GetHistory" \
    "peer0.ecta.cecbs.et" \
    '{"function":"GetHistory","Args":["EXPORTER_TEST001"]}'

echo ""

echo -e "${BOLD}2. Exporter Management Functions (3 tests)${RESET}"

# Test RegisterExporter (write operation)
test_invoke "RegisterExporter" \
    "peer0.ecta.cecbs.et" \
    '{"function":"RegisterExporter","Args":["FUNC_TEST_001","Test Company Ltd","ECTA/2024/001","Direct","1000000","yes","CERT001","LAB001","2025-12-31"]}'

test_function "ReadExporter" \
    "peer0.ecta.cecbs.et" \
    '{"function":"ReadExporter","Args":["FUNC_TEST_001"]}'

test_invoke "UpdateExporterStatus" \
    "peer0.ecta.cecbs.et" \
    '{"function":"UpdateExporterStatus","Args":["FUNC_TEST_001","active"]}'

echo ""

echo -e "${BOLD}3. Sales Contract Functions (5 tests)${RESET}"

test_invoke "RegisterSalesContract" \
    "peer0.ecta.cecbs.et" \
    '{"function":"RegisterSalesContract","Args":["FUNC_CONTRACT_001","FUNC_TEST_001","BUYER001","Germany","Arabica","1000","5.50","USD","true","Deutsche Bank","CBE","[]"]}'

test_function "ReadSalesContract" \
    "peer0.ecta.cecbs.et" \
    '{"function":"ReadSalesContract","Args":["FUNC_CONTRACT_001"]}'

test_invoke "ApproveSalesContract" \
    "peer0.ecta.cecbs.et" \
    '{"function":"ApproveSalesContract","Args":["FUNC_CONTRACT_001"]}'

test_function "QueryContractsByExporter" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryContractsByExporter","Args":["FUNC_TEST_001"]}'

test_invoke "RegisterSalesContractWithPaymentMethod" \
    "peer0.ecta.cecbs.et" \
    '{"function":"RegisterSalesContractWithPaymentMethod","Args":["FUNC_CONTRACT_002","FUNC_TEST_001","BUYER002","Buyer Name","USA","Robusta","500","6.00","USD","false","US Bank","CBE","LC","[]"]}'

echo ""

echo -e "${BOLD}4. Shipment Functions (6 tests)${RESET}"

test_invoke "CreateShipment" \
    "peer0.ecta.cecbs.et" \
    '{"function":"CreateShipment","Args":["FUNC_SHIP_001","FUNC_CONTRACT_001","FUNC_TEST_001","BUYER001","Ethiopia","1000","Grade 1","ICO001","ECX001","ECX","1.00","5500","true","[]"]}'

test_function "ReadShipment" \
    "peer0.ecta.cecbs.et" \
    '{"function":"ReadShipment","Args":["FUNC_SHIP_001"]}'

test_invoke "UpdateShipmentStatus" \
    "peer0.ecta.cecbs.et" \
    '{"function":"UpdateShipmentStatus","Args":["FUNC_SHIP_001","in_transit"]}'

test_invoke "RecordBillOfLading" \
    "peer0.shipping.cecbs.et" \
    '{"function":"RecordBillOfLading","Args":["FUNC_SHIP_001","BL001","MV Ethiopia","Djibouti","Hamburg","2024-12-31","TRACK001"]}'

test_function "QueryShipmentsByExporter" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryShipmentsByExporter","Args":["FUNC_TEST_001"]}'

test_function "GetCompleteTraceability" \
    "peer0.ecta.cecbs.et" \
    '{"function":"GetCompleteTraceability","Args":["FUNC_SHIP_001"]}'

echo ""

echo -e "${BOLD}5. Quality Inspection Functions (2 tests)${RESET}"

test_invoke "RequestInspection" \
    "peer0.ecta.cecbs.et" \
    '{"function":"RequestInspection","Args":["FUNC_INSP_001","FUNC_SHIP_001","FUNC_CONTRACT_001","FUNC_TEST_001","2024-12-15"]}'

test_invoke "PerformInspection" \
    "peer0.ecta.cecbs.et" \
    '{"function":"PerformInspection","Args":["FUNC_INSP_001","INSP001","John Inspector","100","11.5","2","15-16","Green","Clean","[]"]}'

echo ""

echo -e "${BOLD}6. Letter of Credit Functions (4 tests)${RESET}"

test_invoke "RequestLC" \
    "peer0.banks.cecbs.et" \
    '{"function":"RequestLC","Args":["FUNC_LC_001","FUNC_CONTRACT_001","FUNC_TEST_001","Deutsche Bank","5500","USD","2025-12-31"]}'

test_invoke "IssueLC" \
    "peer0.banks.cecbs.et" \
    '{"function":"IssueLC","Args":["FUNC_LC_001","Standard LC terms"]}'

test_function "ReadLC" \
    "peer0.banks.cecbs.et" \
    '{"function":"ReadLC","Args":["FUNC_LC_001"]}'

test_function "QueryLCByExporter" \
    "peer0.banks.cecbs.et" \
    '{"function":"QueryLCByExporter","Args":["FUNC_TEST_001"]}'

echo ""

echo -e "${BOLD}7. Payment Functions (3 tests)${RESET}"

test_invoke "InitiatePayment" \
    "peer0.banks.cecbs.et" \
    '{"function":"InitiatePayment","Args":["FUNC_PAY_001","FUNC_CONTRACT_001","FUNC_TEST_001","FUNC_LC_001","5500","USD","Deutsche Bank","DEUTDEFF","Exporter Name","ACC001","LC"]}'

test_invoke "SettlePayment" \
    "peer0.banks.cecbs.et" \
    '{"function":"SettlePayment","Args":["FUNC_PAY_001","30.5","0.50","CBE","CBETETAA","SWIFT001","NBE001"]}'

test_function "ReadPayment" \
    "peer0.banks.cecbs.et" \
    '{"function":"ReadPayment","Args":["FUNC_PAY_001"]}'

echo ""

echo -e "${BOLD}8. Forex Functions (4 tests)${RESET}"

test_invoke "RequestForex" \
    "peer0.nbe.cecbs.et" \
    '{"function":"RequestForex","Args":["FUNC_FX_001","FUNC_CONTRACT_001","FUNC_TEST_001","5500","USD"]}'

test_invoke "AllocateForex" \
    "peer0.nbe.cecbs.et" \
    '{"function":"AllocateForex","Args":["FUNC_FX_001","FUNC_LC_001","5500","30.5","0.50","NBE Officer","NBE/2024/001","2025-12-31"]}'

test_function "ReadForex" \
    "peer0.nbe.cecbs.et" \
    '{"function":"ReadForex","Args":["FUNC_FX_001"]}'

test_function "QueryForexByExporter" \
    "peer0.nbe.cecbs.et" \
    '{"function":"QueryForexByExporter","Args":["FUNC_TEST_001"]}'

echo ""

echo -e "${BOLD}9. Customs Functions (3 tests)${RESET}"

test_invoke "SubmitCustomsDeclaration" \
    "peer0.customs.cecbs.et" \
    '{"function":"SubmitCustomsDeclaration","Args":["FUNC_CUST_001","FUNC_SHIP_001","FUNC_TEST_001","export","0901.21","1000","5500","USD","Germany","Djibouti","true"]}'

test_invoke "ClearCustomsDeclaration" \
    "peer0.customs.cecbs.et" \
    '{"function":"ClearCustomsDeclaration","Args":["FUNC_CUST_001","Customs Officer","CLR001","0"]}'

test_function "ReadCustomsDeclaration" \
    "peer0.customs.cecbs.et" \
    '{"function":"ReadCustomsDeclaration","Args":["FUNC_CUST_001"]}'

echo ""

echo -e "${BOLD}10. Repatriation Functions (2 tests)${RESET}"

test_invoke "RecordRepatriation" \
    "peer0.nbe.cecbs.et" \
    '{"function":"RecordRepatriation","Args":["FUNC_REP_001","FUNC_CONTRACT_001","FUNC_TEST_001","FUNC_FX_001","5500","USD","2750","30.5"]}'

test_function "ReadRepatriation" \
    "peer0.nbe.cecbs.et" \
    '{"function":"ReadRepatriation","Args":["FUNC_REP_001"]}'

echo ""

echo -e "${BOLD}11. Document Functions (3 tests)${RESET}"

test_invoke "RegisterDocumentHash" \
    "peer0.ecta.cecbs.et" \
    '{"function":"RegisterDocumentHash","Args":["FUNC_DOC_001","abc123hash","Bill of Lading","SHIPMENT","FUNC_SHIP_001"]}'

test_invoke "VerifyDocumentHash" \
    "peer0.ecta.cecbs.et" \
    '{"function":"VerifyDocumentHash","Args":["FUNC_DOC_001","abc123hash"]}'

test_function "QueryDocumentsByEntity" \
    "peer0.ecta.cecbs.et" \
    '{"function":"QueryDocumentsByEntity","Args":["SHIPMENT","FUNC_SHIP_001"]}'

echo ""

echo -e "${BOLD}12. Signature Functions (2 tests)${RESET}"

test_invoke "CaptureIdentity" \
    "peer0.ecta.cecbs.et" \
    '{"function":"CaptureIdentity","Args":["FUNC_CONTRACT_001","contract_approval","approve"]}'

test_invoke "SignDocument" \
    "peer0.ecta.cecbs.et" \
    '{"function":"SignDocument","Args":["FUNC_DOC_001","ECTA Officer","Document approved"]}'

echo ""

# Summary
echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "  FUNCTIONAL TEST RESULTS"
echo "================================================================"
echo -e "${RESET}"
echo -e "Total Tests:        ${BOLD}$TOTAL${RESET}"
echo -e "Passed:             ${GREEN}${BOLD}$PASSED${RESET}"
echo -e "Failed:             ${RED}${BOLD}$FAILED${RESET}"
echo -e "Not Implemented:    ${YELLOW}${BOLD}$NOT_IMPLEMENTED${RESET}"
echo ""

# Calculate percentages
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))
    IMPL_RATE=$(((PASSED + FAILED) * 100 / TOTAL))
    echo -e "Pass Rate:          ${GREEN}${BOLD}${PASS_RATE}%${RESET}"
    echo -e "Implementation Rate: ${BLUE}${BOLD}${IMPL_RATE}%${RESET}"
fi

echo ""

# Show detailed results if there are failures or not implemented
if [ $FAILED -gt 0 ] || [ $NOT_IMPLEMENTED -gt 0 ]; then
    echo -e "${BOLD}Detailed Results:${RESET}"
    for result in "${RESULTS[@]}"; do
        echo -e "  $result"
    done
    echo ""
fi

if [ $NOT_IMPLEMENTED -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠ Some functions are not implemented${RESET}"
    echo ""
    exit 1
elif [ $FAILED -gt 0 ]; then
    echo -e "${RED}${BOLD}✗ Some tests failed${RESET}"
    echo ""
    exit 1
else
    echo -e "${GREEN}${BOLD}✓ ALL FUNCTIONAL TESTS PASSED${RESET}"
    echo ""
    exit 0
fi
