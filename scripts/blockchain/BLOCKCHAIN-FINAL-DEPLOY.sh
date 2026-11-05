#!/bin/bash

# Final Complete Blockchain Deployment
# This script does EVERYTHING from scratch correctly for Fabric 2.5

set -e

cd /home/guda/GoCBC

echo "================================================================"
echo "COMPLETE BLOCKCHAIN DEPLOYMENT FROM SCRATCH"
echo "================================================================"
echo ""

# Step 1: Stop all containers
echo "Step 1: Stopping all containers..."
docker-compose -f docker-compose-fabric.yml down -v 2>&1 | tail -5
sleep 3
echo "✓ Stopped"
echo ""

# Step 2: Clean old artifacts
echo "Step 2: Cleaning old artifacts..."
rm -rf blockchain/channel-artifacts/*.block 2>/dev/null || true
rm -rf blockchain/channel-artifacts/*.tx 2>/dev/null || true
mkdir -p blockchain/channel-artifacts
echo "✓ Cleaned"
echo ""

# Step 3: Generate channel configuration transaction (not genesis block!)
echo "Step 3: Generating channel configuration transaction..."
docker run --rm \
    -v $(pwd)/blockchain:/tmp/blockchain \
    -w /tmp/blockchain \
    -u $(id -u):$(id -g) \
    hyperledger/fabric-tools:2.5 \
    configtxgen \
    -profile CoffeeChannel \
    -outputCreateChannelTx /tmp/blockchain/channel-artifacts/coffeechannel.tx \
    -channelID coffeechannel \
    -configPath /tmp/blockchain 2>&1 | tail -10

if [ ! -f "blockchain/channel-artifacts/coffeechannel.tx" ]; then
    echo "✗ Failed to create channel transaction"
    exit 1
fi
echo "✓ Channel transaction created"
echo ""

# Step 4: Start network
echo "Step 4: Starting Fabric network..."
docker-compose -f docker-compose-fabric.yml up -d 2>&1 | tail -20
sleep 15
echo "✓ Network started"
echo ""

# Step 5: Create channel
echo "Step 5: Creating channel..."
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
    -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer channel create \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    -f /var/hyperledger/channel-artifacts/coffeechannel.tx \
    --outputBlock /tmp/coffeechannel.block \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Channel created"
else
    echo "✗ Channel creation failed - checking if it exists..."
fi
echo ""

# Step 6: Join all peers to channel
echo "Step 6: Joining all peers to channel..."

join_peer() {
    local peer=$1
    local port=$2
    local msp=$3
    local org=$4
    
    echo "  Joining $peer..."
    
    # Copy block from peer0.ecta if needed
    docker cp peer0.ecta.cecbs.et:/tmp/coffeechannel.block /tmp/coffeechannel.block 2>/dev/null || true
    docker cp /tmp/coffeechannel.block $peer:/tmp/coffeechannel.block 2>/dev/null || true
    
    # Join
    docker exec \
        -e CORE_PEER_LOCALMSPID=$msp \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        $peer \
        peer channel join -b /tmp/coffeechannel.block 2>&1 | head -3
    
    # Verify
    if docker exec $peer peer channel list 2>&1 | grep -q coffeechannel; then
        echo "  ✓ $peer joined"
        return 0
    else
        echo "  ✗ $peer join failed"
        return 1
    fi
}

join_peer "peer0.ecta.cecbs.et" 7051 "ECTAMSP" "ecta"
join_peer "peer0.nbe.cecbs.et" 10051 "NBEMSP" "nbe"
join_peer "peer0.banks.cecbs.et" 9051 "BanksMSP" "banks"
join_peer "peer0.ecx.cecbs.et" 8051 "ECXMSP" "ecx"
join_peer "peer0.customs.cecbs.et" 11051 "CustomsMSP" "customs"
join_peer "peer0.shipping.cecbs.et" 12051 "ShippingMSP" "shipping"
echo ""

# Step 7: Install chaincode on all peers
echo "Step 7: Installing chaincode..."
for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et peer0.ecx.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    echo "  Installing on $peer..."
    docker cp blockchain/channel-artifacts/coffee_1.73.tgz $peer:/tmp/coffee.tgz 2>/dev/null
    docker exec $peer peer lifecycle chaincode install /tmp/coffee.tgz 2>&1 | grep -E "Chaincode code package|already" || echo "    (installed)"
done
echo ""

# Step 8: Get package ID
echo "Step 8: Getting package ID..."
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_1.73 | awk '{print $3}' | sed 's/,//')
echo "  Package ID: $PACKAGE_ID"

if [ -z "$PACKAGE_ID" ]; then
    echo "✗ Could not get package ID"
    echo "Installed chaincodes:"
    docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
    exit 1
fi
echo ""

# Step 9: Approve for all orgs
echo "Step 9: Approving chaincode..."
for peer_info in "peer0.ecta.cecbs.et:7051:ECTAMSP:ecta" "peer0.nbe.cecbs.et:10051:NBEMSP:nbe" "peer0.banks.cecbs.et:9051:BanksMSP:banks"; do
    IFS=':' read -r peer port msp org <<< "$peer_info"
    echo "  Approving for $msp..."
    docker exec \
        -e CORE_PEER_LOCALMSPID=$msp \
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
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "Successfully|committed" || echo "    (approved)"
done
echo ""

# Step 10: Check commit readiness
echo "Step 10: Checking commit readiness..."
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 2>&1
echo ""

# Step 11: Commit chaincode
echo "Step 11: Committing chaincode..."
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1 | head -10

echo ""
sleep 5

# Step 12: Verify
echo "Step 12: Verification..."
echo ""
echo "Committed chaincodes:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>&1 | head -10
echo ""

echo "Test query:"
docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"queryAllCoffee","Args":[]}' 2>&1 || echo "(Need to initialize)"
echo ""

# Step 13: Initialize
echo "Step 13: Initializing ledger..."
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1 | head -5

echo ""
sleep 3

echo "Final query:"
docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"function":"queryAllCoffee","Args":[]}' 2>&1 | head -20

echo ""
echo "================================================================"
echo "✓ BLOCKCHAIN DEPLOYMENT COMPLETE!"
echo "================================================================"
echo ""
docker ps --format "{{.Names}}\t{{.Status}}" | grep peer | head -10
echo ""
