#!/bin/bash

# Simplest possible deployment - copy blocks to peers and join directly

set -e

cd /home/guda/GoCBC

echo "================================================================"
echo "SIMPLE BLOCKCHAIN DEPLOYMENT"
echo "================================================================"
echo ""

GENESIS_BLOCK="blockchain/channel-artifacts/coffeechannel.block"

# Step 1: Copy genesis block to all peers and join
echo "Step 1: Joining all peers to channel"
echo "------------------------------------"

for peer_info in "peer0.ecta.cecbs.et:ECTAMSP:ecta" "peer0.nbe.cecbs.et:NBEMSP:nbe" "peer0.banks.cecbs.et:BanksMSP:banks" "peer0.ecx.cecbs.et:ECXMSP:ecx" "peer0.customs.cecbs.et:CustomsMSP:customs" "peer0.shipping.cecbs.et:ShippingMSP:shipping"; do
    IFS=':' read -r peer msp org <<< "$peer_info"
    
    echo "Joining $peer..."
    
    # Copy block to peer
    docker cp "$GENESIS_BLOCK" "$peer:/tmp/coffeechannel.block"
    
    # Join channel
    docker exec \
        -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        "$peer" \
        peer channel join -b /tmp/coffeechannel.block 2>&1 | grep -E "Successfully|already" || echo "  (may already be joined)"
    
    # Verify
    if docker exec "$peer" peer channel list 2>&1 | grep -q coffeechannel; then
        echo "✓ $peer joined"
    else
        echo "✗ $peer failed"
    fi
    echo ""
done

echo ""
echo "Step 2: Installing chaincode"
echo "-----------------------------"

for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et peer0.ecx.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    echo "Installing on $peer..."
    docker cp blockchain/channel-artifacts/coffee_1.73.tgz "$peer:/tmp/"
    docker exec "$peer" peer lifecycle chaincode install /tmp/coffee_1.73.tgz 2>&1 | grep -E "Chaincode|already" | head -2 || echo "  (may already be installed)"
done

echo ""
echo "Step 3: Getting package ID"
echo "--------------------------"
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_1.73 | awk '{print $3}' | sed 's/,//')
echo "Package ID: $PACKAGE_ID"
echo ""

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get package ID"
    exit 1
fi

echo "Step 4: Approving chaincode"
echo "----------------------------"

for peer_info in "peer0.ecta.cecbs.et:7051:ECTAMSP:ecta" "peer0.nbe.cecbs.et:10051:NBEMSP:nbe" "peer0.banks.cecbs.et:9051:BanksMSP:banks" "peer0.ecx.cecbs.et:8051:ECXMSP:ecx" "peer0.customs.cecbs.et:11051:CustomsMSP:customs" "peer0.shipping.cecbs.et:12051:ShippingMSP:shipping"; do
    IFS=':' read -r peer port msp org <<< "$peer_info"
    
    echo "Approving for $msp..."
    docker exec \
        -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$peer:$port \
        "$peer" \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "Successfully|committed" | head -1 || echo "  (check status)"
done

echo ""
echo "Step 5: Checking commit readiness"
echo "----------------------------------"
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 2>&1

echo ""
echo "Step 6: Committing chaincode"
echo "-----------------------------"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1

echo ""
echo "Step 7: Verification"
echo "--------------------"
echo ""
echo "Query installed:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | head -5
echo ""
echo "Query committed:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>&1 | head -10
echo ""
echo "Test query:"
docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"queryAllCoffee","Args":[]}' 2>&1 || echo "(Chaincode may need initialization)"
echo ""

echo "================================================================"
echo "DEPLOYMENT COMPLETE!"
echo "================================================================"
echo ""
echo "Next: Initialize the ledger if needed"
echo "  docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 peer0.ecta.cecbs.et peer chaincode invoke -o orderer.cecbs.et:7050 -C coffeechannel -n coffee -c '{\"function\":\"initLedger\",\"Args\":[]}' --tls --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt"
echo ""
