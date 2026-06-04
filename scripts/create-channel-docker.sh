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
sleep 10

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

# Fetch channel config block from orderer
echo "Fetching channel config from orderer..."
docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -w /work \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer channel fetch 0 /work/blockchain/channel-artifacts/${CHANNEL_NAME}_fetched.block \
        -o orderer.cecbs.et:7050 \
        -c ${CHANNEL_NAME} \
        --tls \
        --cafile /work/${ORDERER_CA}

# Join ECTA peer to channel
echo "Joining ECTA peer to channel..."
docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -w /work \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer channel join -b /work/blockchain/channel-artifacts/${CHANNEL_NAME}_fetched.block

# Join ECX peer to channel
echo "Joining ECX peer to channel..."
docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -w /work \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="ECXMSP" \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/users/Admin@ecx.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
    hyperledger/fabric-tools:2.5 \
    peer channel join -b /work/blockchain/channel-artifacts/${CHANNEL_NAME}_fetched.block

echo "All peers joined channel successfully!"
