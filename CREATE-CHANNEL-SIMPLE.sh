#!/bin/bash
# Simplified channel creation that actually works

set -e

CHANNEL_NAME="coffeechannel"
WORK_DIR="$(pwd)"

echo "=========================================="
echo "Creating Channel: ${CHANNEL_NAME}"
echo "=========================================="

# 1. Generate channel block
echo "1. Generating channel block..."
docker run --rm -v "${WORK_DIR}:/work" -w /work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock /work/blockchain/channel-artifacts/${CHANNEL_NAME}.block \
        -channelID ${CHANNEL_NAME} \
        -configPath /work/blockchain

echo "✅ Block generated"
sleep 5

# 2. Join orderer via osnadmin
echo ""
echo "2. Joining orderer to channel..."
docker run --rm --network cecbs-network \
    -v "${WORK_DIR}/blockchain:/work" \
    hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
        --channelID ${CHANNEL_NAME} \
        --config-block /work/channel-artifacts/${CHANNEL_NAME}.block \
        -o orderer.cecbs.et:7053 \
        --ca-file /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --client-cert /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
        --client-key /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key

echo "✅ Orderer joined"
sleep 10

# 3. Join ECTA peer first (anchor peer)
echo ""
echo "3. Joining ECTA peer..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.ecta.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "✅ ECTA joined"

# 4. Join remaining peers
echo ""
echo "4. Joining other peers..."

# Copy block to all peers
for org in ecx banks nbe customs shipping; do
    docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.${org}.cecbs.et:/tmp/
done

# Join each peer
for org in ecx banks nbe customs shipping; do
    case $org in
        ecx) MSP=ECXMSP ;;
        banks) MSP=BanksMSP ;;
        nbe) MSP=NBEMSP ;;
        customs) MSP=CustomsMSP ;;
        shipping) MSP=ShippingMSP ;;
    esac
    
    echo "  Joining $org..."
    docker exec -e CORE_PEER_LOCALMSPID=$MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer channel join -b /tmp/${CHANNEL_NAME}.block
done

echo ""
echo "=========================================="
echo "✅ Channel Created Successfully!"
echo "=========================================="
echo ""
echo "Verification:"
docker exec peer0.ecta.cecbs.et peer channel list
echo ""
