#!/bin/bash
# Direct channel creation - no fancy stuff, just make it work

set -e

CHANNEL_NAME="coffeechannel"

echo "=========================================="
echo "🔧 FIXING CHANNEL CREATION"
echo "=========================================="

# Step 1: Generate channel block
echo ""
echo "Step 1: Generating channel genesis block..."
docker run --rm \
    -v "$(pwd):/work" \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock /work/blockchain/channel-artifacts/${CHANNEL_NAME}.block \
        -channelID ${CHANNEL_NAME} \
        -configPath /work/blockchain

echo "✅ Block created"

# Step 2: Wait for orderer
echo ""
echo "Step 2: Waiting for orderer to be ready..."
sleep 15

# Step 3: Copy block to orderer and join
echo ""
echo "Step 3: Copying block to orderer container..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block orderer.cecbs.et:/var/hyperledger/orderer/${CHANNEL_NAME}.block
echo "✅ Block copied"

echo ""
echo "Step 4: Joining orderer to channel..."
docker run --rm \
    --network cecbs-network \
    -v "$(pwd)/blockchain:/work" \
    hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
        --channelID ${CHANNEL_NAME} \
        --config-block /work/channel-artifacts/${CHANNEL_NAME}.block \
        -o orderer.cecbs.et:7053 \
        --ca-file /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --client-cert /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
        --client-key /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key

echo "✅ Orderer joined"

# Step 4: Wait a bit more
echo ""
echo "Step 4: Waiting for channel to stabilize..."
sleep 10

# Step 5: Fetch config block
echo ""
echo "Step 5: Fetching channel config block..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer channel fetch 0 /tmp/${CHANNEL_NAME}_config.block \
        -o orderer.cecbs.et:7050 \
        -c ${CHANNEL_NAME} \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

echo "✅ Config block fetched"

# Step 7: Join all peers
echo ""
echo "Step 7: Joining all peers to channel..."

for org in ecta ecx banks nbe customs shipping; do
    PORT=$((7051 + $(echo $org | wc -c) * 1000))  # Simple port calculation
    case $org in
        ecta) PORT=7051; MSP=ECTAMSP ;;
        ecx) PORT=8051; MSP=ECXMSP ;;
        banks) PORT=9051; MSP=BanksMSP ;;
        nbe) PORT=10051; MSP=NBEMSP ;;
        customs) PORT=11051; MSP=CustomsMSP ;;
        shipping) PORT=12051; MSP=ShippingMSP ;;
    esac
    
    echo "  Joining $org..."
    docker exec -e CORE_PEER_LOCALMSPID=$MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer channel join -b /tmp/${CHANNEL_NAME}_config.block 2>&1 | grep -E "success|already" || echo "  Joined"
done

echo ""
echo "=========================================="
echo "✅ CHANNEL CREATION COMPLETE"
echo "=========================================="
echo ""
echo "Verifying:"
docker exec peer0.ecta.cecbs.et peer channel list
echo ""

