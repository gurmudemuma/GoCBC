#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"
ORDERER_CA="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

echo "Creating channel: ${CHANNEL_NAME}"

# Set environment for ECTA
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="ECTAMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp
export CORE_PEER_ADDRESS=localhost:7051

# Create channel
peer channel create \
    -o localhost:7050 \
    -c ${CHANNEL_NAME} \
    -f blockchain/channel-artifacts/${CHANNEL_NAME}.tx \
    --outputBlock blockchain/channel-artifacts/${CHANNEL_NAME}.block \
    --tls \
    --cafile ${ORDERER_CA}

echo "Channel created successfully!"

# Join ECTA peer to channel
echo "Joining ECTA peer to channel..."
peer channel join -b blockchain/channel-artifacts/${CHANNEL_NAME}.block

# Join ECX peer to channel
echo "Joining ECX peer to channel..."
export CORE_PEER_LOCALMSPID="ECXMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=blockchain/organizations/peerOrganizations/ecx.cecbs.et/users/Admin@ecx.cecbs.et/msp
export CORE_PEER_ADDRESS=localhost:8051

peer channel join -b blockchain/channel-artifacts/${CHANNEL_NAME}.block

echo "All peers joined channel successfully!"
