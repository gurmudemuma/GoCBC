#!/bin/bash

set -e

export MSYS_NO_PATHCONV=1

CHANNEL_NAME="coffeechannel"
ORDERER_CA="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"
ORDERER_ADMIN_TLS_SIGN_CERT="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt"
ORDERER_ADMIN_TLS_PRIVATE_KEY="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key"

echo "Creating channel: ${CHANNEL_NAME}"

# Wait for orderer to be ready
echo "Waiting for orderer to be ready..."
sleep 20  # Increased wait time

# Additional check: verify orderer is actually responding
for i in {1..10}; do
  if docker exec orderer.cecbs.et ls /var/hyperledger/production/orderer/chains/coffeechannel 2>/dev/null; then
    echo "Orderer directory exists, ready to proceed"
    break
  fi
  echo "Waiting for orderer... attempt $i/10"
  sleep 3
done

# Get absolute path
WORK_DIR="$(pwd)"

# Generate channel genesis block
echo "Generating channel genesis block..."
docker run --rm \
    -v "${WORK_DIR}:/work" \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock /work/blockchain/channel-artifacts/${CHANNEL_NAME}.block \
        -channelID ${CHANNEL_NAME} \
        -configPath /work/blockchain

echo "Channel genesis block created!"

# Join orderer to channel using osnadmin
echo "Joining orderer to channel..."
docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
        --channelID ${CHANNEL_NAME} \
        --config-block /work/blockchain/channel-artifacts/${CHANNEL_NAME}.block \
        -o orderer.cecbs.et:7053 \
        --ca-file /work/${ORDERER_CA} \
        --client-cert /work/${ORDERER_ADMIN_TLS_SIGN_CERT} \
        --client-key /work/${ORDERER_ADMIN_TLS_PRIVATE_KEY}

echo "Orderer joined channel successfully!"

# Wait for channel to be active
echo "Waiting for channel to be active on orderer..."
sleep 15

# Fix permissions on the block file so docker cp can read it
echo "Fixing block file permissions..."
sudo chmod 644 blockchain/channel-artifacts/${CHANNEL_NAME}.block 2>/dev/null || chmod 644 blockchain/channel-artifacts/${CHANNEL_NAME}.block

# Join peers directly using the genesis block (skip fetch step)
echo "Joining ECTA peer to channel..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.ecta.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "Joining ECX peer to channel..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.ecx.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID="ECXMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
    peer0.ecx.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "Joining Banks peer to channel..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.banks.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID="BanksMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "Joining NBE peer to channel..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.nbe.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID="NBEMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
    peer0.nbe.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "Joining Customs peer to channel..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.customs.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID="CustomsMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
    peer0.customs.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "Joining Shipping peer to channel..."
docker cp blockchain/channel-artifacts/${CHANNEL_NAME}.block peer0.shipping.cecbs.et:/tmp/
docker exec -e CORE_PEER_LOCALMSPID="ShippingMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
    peer0.shipping.cecbs.et \
    peer channel join -b /tmp/${CHANNEL_NAME}.block

echo "All 6 peers joined channel successfully!"

