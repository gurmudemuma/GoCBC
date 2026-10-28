#!/bin/bash

# Blockchain Verification Test - Run after specialist completes fix
# This script verifies the blockchain is fully operational

set -e

echo "=========================================="
echo "BLOCKCHAIN VERIFICATION TEST"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
}

# Test 1: Container Status
echo "Test 1: All containers running"
echo "---------------------------------------"
RUNNING=$(docker ps --filter "name=peer0.ecta\|peer0.nbe\|peer0.banks\|orderer.cecbs.et" --format "{{.Names}}" | wc -l)
if [ "$RUNNING" -ge 4 ]; then
    echo "Found $RUNNING containers running"
    test_result
else
    echo "Only $RUNNING containers running (expected at least 4)"
    ((FAILED++))
    echo ""
fi

# Test 2: Peers in Channel
echo "Test 2: Peers joined to coffeechannel"
echo "---------------------------------------"
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | grep -q "coffeechannel"
test_result

# Test 3: Chaincode Installed
echo "Test 3: Chaincode installed on peers"
echo "---------------------------------------"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep -q "coffee_1.73"
test_result

# Test 4: MSP Admin Identity Recognized
echo "Test 4: MSP admin identity works"
echo "---------------------------------------"
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode queryinstalled > /dev/null 2>&1
test_result

# Test 5: Orderer Connection
echo "Test 5: Orderer accepting connections"
echo "---------------------------------------"
docker exec peer0.ecta.cecbs.et \
  peer channel fetch config /tmp/test.block \
  -o orderer.cecbs.et:7050 \
  -c coffeechannel \
  --tls \
  --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem > /dev/null 2>&1
test_result

# Test 6: Chaincode Approved
echo "Test 6: Chaincode approved by organizations"
echo "---------------------------------------"
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode queryapproved \
    -C coffeechannel \
    -n coffee \
    --sequence 1 2>&1 | grep -q "Version: 1.73"
test_result

# Test 7: Chaincode Committed
echo "Test 7: Chaincode committed to channel"
echo "---------------------------------------"
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode querycommitted \
    -C coffeechannel \
    -n coffee 2>&1 | grep -q "Version: 1.73"
test_result

# Test 8: Chaincode Query
echo "Test 8: Chaincode query works"
echo "---------------------------------------"
QUERY_RESULT=$(docker exec peer0.ecta.cecbs.et \
  peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1)

if echo "$QUERY_RESULT" | grep -q -E '^\[\]$|^\[.*\]$'; then
    echo "Query returned valid JSON: $QUERY_RESULT"
    test_result
else
    echo "Query failed or returned invalid result: $QUERY_RESULT"
    ((FAILED++))
    echo ""
fi

# Test 9: MSP Persistence After Restart
echo "Test 9: MSP config persists after restart"
echo "---------------------------------------"
echo "Restarting peer0.ecta.cecbs.et..."
docker restart peer0.ecta.cecbs.et > /dev/null 2>&1
sleep 5
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode queryinstalled > /dev/null 2>&1
test_result

# Test 10: Chaincode Invoke (if test data doesn't exist)
echo "Test 10: Chaincode invoke works"
echo "---------------------------------------"
INVOKE_RESULT=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
  -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
  peer0.ecta.cecbs.et \
  peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"initLedger","Args":[]}' \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1)

if echo "$INVOKE_RESULT" | grep -q "Chaincode invoke successful"; then
    echo "Invoke successful"
    test_result
else
    echo "Invoke result: $INVOKE_RESULT"
    # Check if it's just a "ledger already initialized" error
    if echo "$INVOKE_RESULT" | grep -q "already"; then
        echo "(Chaincode already initialized - this is OK)"
        ((PASSED++))
        echo ""
    else
        ((FAILED++))
        echo ""
    fi
fi

# Summary
echo "=========================================="
echo "VERIFICATION SUMMARY"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED - BLOCKCHAIN FULLY OPERATIONAL${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test blockchain integration with GoCBC portals"
    echo "2. Monitor blockchain performance"
    echo "3. Join remaining 3 peers (ECX, Customs, Shipping)"
    exit 0
else
    echo -e "${YELLOW}⚠ SOME TESTS FAILED - REVIEW ISSUES ABOVE${NC}"
    echo ""
    echo "Common issues:"
    echo "- Chaincode not approved: Run approval commands for all orgs"
    echo "- Chaincode not committed: Run commit command"
    echo "- MSP errors: Check config.yaml is mounted correctly"
    echo "- Orderer errors: Check orderer logs: docker logs orderer.cecbs.et"
    exit 1
fi
