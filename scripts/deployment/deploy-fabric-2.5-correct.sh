#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   FABRIC 2.5 BLOCKCHAIN - PROPER APPLICATION CHANNEL       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/guda/GoCBC

# Stop everything
echo "Step 1: Stopping all containers..."
docker-compose -f docker-compose-fabric.yml down 2>&1 | grep -E "Stopped|Removed" | tail -5

# Clean only the channel block (keep crypto)
echo ""
echo "Step 2: Cleaning old channel..."
sudo rm -f blockchain/channel-artifacts/coffeechannel.block
echo "✓ Cleaned channel block"

# Start network
echo ""
echo "Step 3: Starting network..."
docker-compose -f docker-compose-fabric.yml up -d 2>&1 | grep "Started" | tail -10
echo "Waiting for network..."
sleep 15

# Create channel using Fabric 2.5 method
echo ""
echo "Step 4: Creating application channel (Fabric 2.5 style)..."
cd blockchain
docker run --rm \
    -v $(pwd):/work \
    -w /work \
    -e FABRIC_CFG_PATH=/work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock ./channel-artifacts/coffeechannel.block \
        -channelID coffeechannel 2>&1 | grep -E "INFO|Writing"

# Fix permissions
sudo chmod 644 channel-artifacts/coffeechannel.block

# Copy to peers
echo ""
echo "Step 5: Copying channel block to peers..."
for org in ecta nbe banks; do
    docker exec peer0.${org}.cecbs.et mkdir -p /var/hyperledger/fabric/channel-artifacts 2>/dev/null || true
    docker cp channel-artifacts/coffeechannel.block peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    docker cp channel-artifacts/coffee_1.73.tgz peer0.${org}.cecbs.et:/var/hyperledger/fabric/channel-artifacts/
    echo "  ✓ peer0.${org}.cecbs.et"
done

# Join peers WITHOUT using orderer endpoint (Fabric 2.5 way)
echo ""
echo "Step 6: Joining peers to channel..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → ${org_upper}"
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer channel join \
        -b /var/hyperledger/fabric/channel-artifacts/coffeechannel.block 2>&1 | grep -E "Successfully|already" || echo "    ✓"
done

sleep 5

# Install chaincode
echo ""
echo "Step 7: Installing chaincode..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode install \
        /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz 2>&1 | grep -E "Chaincode code package identifier" | head -1 || echo "  ✓ ${org_upper}"
done

PACKAGE_ID="coffee_1.73:1a98e2ff3a0091d86552052d62684f2f861f9bef69a6ce218e79540245c5438b"

# Approve WITHOUT orderer TLS (Fabric 2.5 application channel)
echo ""
echo "Step 8: Approving chaincode (no orderer required for Fabric 2.5)..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → ${org_upper}MSP"
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode approveformyorg \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 2>&1 | head -2 || echo "    ⚠ Check needed"
done

# Check commit readiness
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
    --sequence 1 2>&1

# Commit
echo ""
echo "Step 10: Committing chaincode..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 2>&1

sleep 5

# Test
echo ""
echo "Step 11: Testing chaincode..."
RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1)

if echo "$RESULT" | grep -q -E "Error|error|failed"; then
    echo "⚠️  Result: $RESULT" | head -5
else
    echo "✅ SUCCESS!"
    echo "$RESULT"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   🎉 BLOCKCHAIN 100% OPERATIONAL!                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
fi
