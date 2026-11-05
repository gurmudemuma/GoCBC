#!/bin/bash
# Expert Fabric 2.5 Deployment - Application Channel Participation Method
set -e

cd /home/guda/GoCBC

echo "================================================================"
echo "FABRIC 2.5 EXPERT DEPLOYMENT"
echo "Using Channel Participation API (No System Channel)"
echo "================================================================"
echo ""

# STEP 1: Create genesis block for application channel (not transaction!)
echo "STEP 1: Creating Application Channel Genesis Block"
echo "---------------------------------------------------"
docker run --rm \
    -v $(pwd)/blockchain:/tmp/blockchain \
    -w /tmp/blockchain \
    -u $(id -u):$(id -g) \
    hyperledger/fabric-tools:2.5 \
    configtxgen \
    -profile CoffeeChannel \
    -outputBlock /tmp/blockchain/channel-artifacts/coffeechannel_genesis.block \
    -channelID coffeechannel \
    -configPath /tmp/blockchain

echo "✓ Genesis block created"
ls -lh blockchain/channel-artifacts/coffeechannel_genesis.block

# STEP 2: Join orderer to channel using channel participation (curl to Admin API)
echo ""
echo "STEP 2: Joining Orderer to Channel (Admin API)"
echo "-----------------------------------------------"
curl -k -X POST \
  --data-binary @blockchain/channel-artifacts/coffeechannel_genesis.block \
  https://localhost:7053/participation/v1/channels

echo ""
echo "Checking orderer channels:"
curl -k -X GET https://localhost:7053/participation/v1/channels
echo ""

# STEP 3: Join ALL Peers to Channel
echo ""
echo "STEP 3: Joining ALL 6 Peers to Channel"
echo "---------------------------------------"
for peer_info in "peer0.ecta.cecbs.et:ECTAMSP:ecta" "peer0.nbe.cecbs.et:NBEMSP:nbe" "peer0.banks.cecbs.et:BanksMSP:banks" "peer0.ecx.cecbs.et:ECXMSP:ecx" "peer0.customs.cecbs.et:CustomsMSP:customs" "peer0.shipping.cecbs.et:ShippingMSP:shipping"; do
    IFS=':' read -r peer msp org <<< "$peer_info"
    echo "  Joining $peer..."
    docker cp blockchain/channel-artifacts/coffeechannel_genesis.block $peer:/tmp/coffeechannel.block
    docker exec -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        $peer \
        peer channel join -b /tmp/coffeechannel.block
done
echo "✓ All peers joined"

# STEP 4: Install Chaincode on ALL Peers
echo ""
echo "STEP 4: Installing Chaincode on ALL 6 Peers"
echo "--------------------------------------------"
for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et peer0.ecx.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    docker cp blockchain/channel-artifacts/coffee_1.73.tgz $peer:/tmp/coffee.tgz
    docker exec $peer peer lifecycle chaincode install /tmp/coffee.tgz | head -2
done
echo "✓ Chaincode installed"

# STEP 5: Get Package ID
echo ""
echo "STEP 5: Getting Package ID"
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | grep coffee_1.73 | awk '{print $3}' | sed 's/,//')
echo "Package ID: $PACKAGE_ID"

# STEP 6: Approve for ALL 6 Organizations
echo ""
echo "STEP 6: Approving for ALL 6 Organizations"
for peer_info in "peer0.ecta.cecbs.et:7051:ECTAMSP:ecta" "peer0.nbe.cecbs.et:10051:NBEMSP:nbe" "peer0.banks.cecbs.et:9051:BanksMSP:banks" "peer0.ecx.cecbs.et:8051:ECXMSP:ecx" "peer0.customs.cecbs.et:11051:CustomsMSP:customs" "peer0.shipping.cecbs.et:12051:ShippingMSP:shipping"; do
    IFS=':' read -r peer port msp org <<< "$peer_info"
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
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem | head -2
done
echo "✓ All approved"

# STEP 7: Commit Chaincode
echo ""
echo "STEP 7: Committing Chaincode"
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt | head -5
echo "✓ Committed"

# STEP 8: Initialize and Query
echo ""
echo "STEP 8: Initialize Ledger"
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt | head -3

sleep 3

echo ""
echo "Final Query:"
docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"queryAllCoffee","Args":[]}'

echo ""
echo "================================================================"
echo "✓✓✓ FABRIC 2.5 BLOCKCHAIN DEPLOYED SUCCESSFULLY! ✓✓✓"
echo "================================================================"
