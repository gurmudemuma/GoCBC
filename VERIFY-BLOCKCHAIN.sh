#!/bin/bash

# Comprehensive Blockchain Verification Script

echo "================================================================"
echo "BLOCKCHAIN VERIFICATION"
echo "================================================================"
echo ""

# Test 1: Containers Running
echo "1. Container Status"
echo "-------------------"
docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "peer0|orderer" | head -10
echo ""

# Test 2: Peers in Channel
echo "2. Peers Joined to Channel"
echo "--------------------------"
for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et; do
    if docker exec $peer peer channel list 2>&1 | grep -q coffeechannel; then
        echo "✓ $peer in channel"
    else
        echo "✗ $peer NOT in channel"
    fi
done
echo ""

# Test 3: Chaincode Installed
echo "3. Chaincode Installed"
echo "----------------------"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep -E "coffee_1.73|Label"
echo ""

# Test 4: Chaincode Committed
echo "4. Chaincode Committed"
echo "----------------------"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>&1 | head -15
echo ""

# Test 5: Query Chaincode
echo "5. Chaincode Query Test"
echo "-----------------------"
RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"queryAllCoffee","Args":[]}' 2>&1)
echo "$RESULT" | head -20
echo ""

if echo "$RESULT" | grep -qE '^\[\]$|^\[.*\]$'; then
    echo "✓ Chaincode query successful!"
else
    echo "⚠ Chaincode query returned error (may need initialization)"
fi
echo ""

echo "================================================================"
echo "SUMMARY"
echo "================================================================"
echo ""
echo "To initialize ledger (if needed):"
echo "  docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \\"
echo "    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \\"
echo "    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \\"
echo "    peer0.ecta.cecbs.et peer chaincode invoke \\"
echo "    -o orderer.cecbs.et:7050 -C coffeechannel -n coffee \\"
echo "    -c '{\"function\":\"initLedger\",\"Args\":[]}' --tls \\"
echo "    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \\"
echo "    --peerAddresses peer0.ecta.cecbs.et:7051 \\"
echo "    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt"
echo ""
