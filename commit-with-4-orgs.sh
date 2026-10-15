#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"
CHAINCODE_NAME="coffee"
CHAINCODE_VERSION="1.0"
SEQUENCE=1

echo "=== Committing Chaincode with 4 Organizations ==="

# Commit with ECTA, ECX, Customs, and Shipping
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $SEQUENCE \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/customs-ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/shipping-ca.crt

echo "Verifying..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CHAINCODE_NAME

echo "SUCCESS!"
