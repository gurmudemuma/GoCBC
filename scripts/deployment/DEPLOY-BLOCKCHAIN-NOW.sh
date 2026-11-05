#!/bin/bash
# Complete Blockchain Deployment - Expert Fix
set -e

cd /home/guda/GoCBC

echo "================================================================"
echo "EXPERT BLOCKCHAIN DEPLOYMENT - COMPLETE"
echo "================================================================"
echo ""

# STEP 1: Create Channel
echo "STEP 1: Creating Channel"
echo "------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer channel create \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    -f /etc/hyperledger/fabric/channel-artifacts/coffeechannel.tx \
    --outputBlock /tmp/coffeechannel.block \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem

echo "✓ Channel created"
sleep 2

# STEP 2: Join ALL Peers
echo ""
echo "STEP 2: Joining ALL 6 Peers to Channel"
echo "---------------------------------------"
# Copy block to host
docker cp peer0.ecta.cecbs.et:/tmp/coffeechannel.block /tmp/coffeechannel.block

for peer_info in "peer0.ecta.cecbs.et:ECTAMSP:ecta" "peer0.nbe.cecbs.et:NBEMSP:nbe" "peer0.banks.cecbs.et:BanksMSP:banks" "peer0.ecx.cecbs.et:ECXMSP:ecx" "peer0.customs.cecbs.et:CustomsMSP:customs" "peer0.shipping.cecbs.et:ShippingMSP:shipping"; do
    IFS=':' read -r peer msp org <<< "$peer_info"
    echo "  Joining $peer..."
    docker cp /tmp/coffeechannel.block $peer:/tmp/coffeechannel.block
    docker exec -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        $peer \
        peer channel join -b /tmp/coffeechannel.block
    echo "  ✓ $peer joined"
done

echo ""
echo "Verifying joins..."
for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et; do
    docker exec $peer peer channel list
done

# STEP 3: Install Chaincode on ALL Peers
echo ""
echo "STEP 3: Installing Chaincode on ALL 6 Peers"
echo "--------------------------------------------"
for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et peer0.ecx.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    echo "  Installing on $peer..."
    docker cp blockchain/channel-artifacts/coffee_1.73.tgz $peer:/tmp/coffee.tgz
    docker exec $peer peer lifecycle chaincode install /tmp/coffee.tgz
done
echo "✓ Chaincode installed on all peers"

# STEP 4: Get Package ID
echo ""
echo "STEP 4: Getting Package ID"
echo "--------------------------"
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | grep coffee_1.73 | awk '{print $3}' | sed 's/,//')
echo "Package ID: $PACKAGE_ID"

# STEP 5: Approve for ALL 6 Organizations
echo ""
echo "STEP 5: Approving for ALL 6 Organizations"
echo "------------------------------------------"
for peer_info in "peer0.ecta.cecbs.et:7051:ECTAMSP:ecta" "peer0.nbe.cecbs.et:10051:NBEMSP:nbe" "peer0.banks.cecbs.et:9051:BanksMSP:banks" "peer0.ecx.cecbs.et:8051:ECXMSP:ecx" "peer0.customs.cecbs.et:11051:CustomsMSP:customs" "peer0.shipping.cecbs.et:12051:ShippingMSP:shipping"; do
    IFS=':' read -r peer port msp org <<< "$peer_info"
    echo "  Approving for $msp..."
    docker exec -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$peer:$port \
        $peer \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem
    echo "  ✓ $msp approved"
done

# STEP 6: Check Commit Readiness
echo ""
echo "STEP 6: Checking Commit Readiness"
echo "----------------------------------"
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1

# STEP 7: Commit Chaincode
echo ""
echo "STEP 7: Committing Chaincode"
echo "-----------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt
echo "✓ Chaincode committed"

# STEP 8: Query Committed
echo ""
echo "STEP 8: Verifying Committed Chaincode"
echo "--------------------------------------"
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode querycommitted \
    --channelID coffeechannel

# STEP 9: Test Query
echo ""
echo "STEP 9: Testing Chaincode Query"
echo "--------------------------------"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}'

# STEP 10: Initialize Ledger
echo ""
echo "STEP 10: Initializing Ledger"
echo "-----------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

sleep 3

# Final Query
echo ""
echo "Final Query (with data):"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}'

echo ""
echo "================================================================"
echo "✓✓✓ BLOCKCHAIN DEPLOYMENT COMPLETE! ✓✓✓"
echo "================================================================"
echo ""
echo "Summary:"
echo "  • Channel 'coffeechannel' created"
echo "  • All 6 peers joined: ECTA, NBE, Banks, ECX, Customs, Shipping"
echo "  • Chaincode 'coffee v1.73' installed on all 6 peers"
echo "  • Chaincode approved by all 6 organizations"
echo "  • Chaincode committed to channel"
echo "  • Ledger initialized and ready"
echo ""
echo "Test command:"
echo "  docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{\"function\":\"queryAllCoffee\",\"Args\":[]}'"
echo ""
