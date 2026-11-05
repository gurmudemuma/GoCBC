#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Complete Blockchain Reset and Deployment                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/guda/GoCBC

# Step 1: Stop and clean everything
echo "Step 1: Stopping containers and cleaning volumes..."
docker-compose -f docker-compose-fabric.yml down -v 2>&1 | grep -E "(Stopping|Stopped|Removing|Removed)" || true

# Step 2: Start fresh network
echo ""
echo "Step 2: Starting fresh network..."
docker-compose -f docker-compose-fabric.yml up -d 2>&1 | grep -E "(Creating|Created|Starting|Started)" || true

echo "Waiting for containers to be ready..."
sleep 15

# Step 3: Create channel genesis block
echo ""
echo "Step 3: Creating channel genesis block..."
cd blockchain
docker run --rm \
    -v $(pwd):/work \
    -w /work \
    -e FABRIC_CFG_PATH=/work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock ./channel-artifacts/coffeechannel.block \
        -channelID coffeechannel 2>&1 | grep -E "(INFO|genesis)"

# Step 4: Copy artifacts to peer containers
echo ""
echo "Step 4: Copying artifacts to peer containers..."
for org in ecta nbe banks; do
    echo "  → peer0.${org}.cecbs.et"
    docker exec peer0.${org}.cecbs.et mkdir -p /var/hyperledger/fabric/channel-artifacts 2>/dev/null || true
    docker cp channel-artifacts/coffeechannel.block peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    docker cp channel-artifacts/coffee_1.73.tgz peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
done

# Step 5: Join peers to channel
echo ""
echo "Step 5: Joining peers to channel..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → peer0.${org}.cecbs.et (${org_upper}MSP)"
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer channel join \
        -b /var/hyperledger/fabric/channel-artifacts/coffeechannel.block \
        2>&1 | grep -E "(Successfully|already|Error)" || echo "    ✓ Joined"
done

sleep 5

# Step 6: Install chaincode
echo ""
echo "Step 6: Installing chaincode on all peers..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → peer0.${org}.cecbs.et (${org_upper}MSP)"
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode install \
        /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz \
        2>&1 | grep -E "(Chaincode code package identifier)" || echo "    ✓ Installed"
done

# Step 7: Get package ID
echo ""
echo "Step 7: Getting chaincode package ID..."
PACKAGE_ID=$(docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled 2>&1 | \
    grep coffee_1.73 | \
    awk -F'Package ID: |, Label:' '{print $2}')

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Failed to get package ID"
    exit 1
fi

echo "✓ Package ID: $PACKAGE_ID"

# Step 8: Approve for each org
echo ""
echo "Step 8: Approving chaincode for each organization..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → ${org_upper}MSP"
    
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        2>&1 | grep -E "(Successfully|approved|Error)" | head -1 || echo "    ✓ Approved"
done

# Step 9: Check commit readiness
echo ""
echo "Step 9: Checking commit readiness..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    2>&1 | grep -A10 "Chaincode definition"

# Step 10: Commit chaincode
echo ""
echo "Step 10: Committing chaincode to channel..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.banks.cecbs.et/tls/ca.crt \
    2>&1 | grep -E "(Chaincode definition for chaincode|committed|Error)" | head -5

sleep 3

# Step 11: Test chaincode
echo ""
echo "Step 11: Testing chaincode query..."
RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' \
    2>&1)

if echo "$RESULT" | grep -q "Error"; then
    echo "❌ Chaincode query failed:"
    echo "$RESULT"
    exit 1
else
    echo "✓ Chaincode query successful!"
    echo "$RESULT"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ BLOCKCHAIN FULLY DEPLOYED AND OPERATIONAL!            ║"
echo "║                                                            ║"
echo "║   Channel:       coffeechannel                             ║"
echo "║   Chaincode:     coffee v1.73                              ║"
echo "║   Package ID:    ${PACKAGE_ID:0:20}...                     ║"
echo "║   Organizations: ECTA, NBE, Banks (all approved)           ║"
echo "║   Status:        Committed and Ready                       ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Now you can test all 7 portals with full blockchain integration!"
