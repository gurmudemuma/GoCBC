#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"

echo "Joining peers to channel: ${CHANNEL_NAME}"

# Copy channel block to all peer containers
echo "Copying channel block to peer containers..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.ecta.cecbs.et:/tmp/
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.ecx.cecbs.et:/tmp/
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.banks.cecbs.et:/tmp/
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.nbe.cecbs.et:/tmp/
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.customs.cecbs.et:/tmp/
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.shipping.cecbs.et:/tmp/

# Join ECTA peer (use Admin MSP)
echo "Joining ECTA peer..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer channel join -b /tmp/${CHANNEL_NAME}.block
echo "ECTA peer joined successfully!"

# Join ECX peer (use Admin MSP)
echo "Joining ECX peer..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et peer channel join -b /tmp/${CHANNEL_NAME}.block
echo "ECX peer joined successfully!"

# Join Banks peer (use Admin MSP)
echo "Joining Banks peer..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et peer channel join -b /tmp/${CHANNEL_NAME}.block
echo "Banks peer joined successfully!"

# Join NBE peer (use Admin MSP)
echo "Joining NBE peer..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
    peer0.nbe.cecbs.et peer channel join -b /tmp/${CHANNEL_NAME}.block
echo "NBE peer joined successfully!"

# Join Customs peer (use Admin MSP)
echo "Joining Customs peer..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
    peer0.customs.cecbs.et peer channel join -b /tmp/${CHANNEL_NAME}.block
echo "Customs peer joined successfully!"

# Join Shipping peer (use Admin MSP)
echo "Joining Shipping peer..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
    peer0.shipping.cecbs.et peer channel join -b /tmp/${CHANNEL_NAME}.block
echo "Shipping peer joined successfully!"

echo "All peers joined channel: ${CHANNEL_NAME}"
