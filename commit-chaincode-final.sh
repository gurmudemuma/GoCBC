#!/bin/bash

set -e

CHAINCODE_NAME="coffee"
CHAINCODE_VERSION="1.0"
CHANNEL_NAME="coffeechannel"
SEQUENCE=1

echo "=== Committing Chaincode with Admin Credentials ==="

# First, check if chaincode is installed
echo "Checking installed chaincodes..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled

# Get the package ID
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "$CHAINCODE_NAME" | awk -F'Package ID: |, Label:' '{print $2}' | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Chaincode not installed. Need to install first."
    exit 1
fi

echo "Found Package ID: $PACKAGE_ID"

# Check if already committed
echo "Checking if already committed..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CHAINCODE_NAME && {
    echo "Chaincode already committed!"
    exit 0
}

# Commit the chaincode with multiple endorsers (ECTA and ECX have joined channel)
echo "Committing chaincode on channel $CHANNEL_NAME..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls true \
    --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt

echo "Chaincode committed successfully!"

# Verify
echo "Verifying commitment..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CHAINCODE_NAME

echo "Done!"
