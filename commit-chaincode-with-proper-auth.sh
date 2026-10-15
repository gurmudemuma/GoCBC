#!/bin/bash

set -e

# This script commits the chaincode with proper MSP environment variables

CHAINCODE_NAME="coffee"
CHAINCODE_VERSION="1.0"
CHANNEL_NAME="coffeechannel"
SEQUENCE=1

# Get the package ID from peer0.ecx (which has it installed)
echo "Getting package ID..."
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "$CHAINCODE_NAME" | awk '{print $3}' | sed 's/,$//')

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not find installed chaincode"
    exit 1
fi

echo "Found package ID: $PACKAGE_ID"

# Commit the chaincode using ECX peer with proper env
echo "Committing chaincode..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
  -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:7051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls \
    --cafile /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric-ecta/tls/ca.crt

echo "Chaincode committed!"

# Verify
echo "Verifying commitment..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CHAINCODE_NAME

echo "Done!"
