#!/bin/bash
set -e

CHANNEL_NAME="coffeechannel"
CHANNEL_BLOCK="blockchain/channel-artifacts/${CHANNEL_NAME}.block"

echo "Rejoining all peers to ${CHANNEL_NAME}..."

# ECTA
echo "Joining ECTA peer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.ecta.cecbs.et \
  peer channel join -b /var/hyperledger/channel-artifacts/${CHANNEL_NAME}.block || echo "ECTA already joined or failed"

# ECX
echo "Joining ECX peer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.ecx.cecbs.et \
  peer channel join -b /var/hyperledger/channel-artifacts/${CHANNEL_NAME}.block || echo "ECX already joined or failed"

# Banks
echo "Joining Banks peer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.banks.cecbs.et \
  peer channel join -b /var/hyperledger/channel-artifacts/${CHANNEL_NAME}.block || echo "Banks already joined or failed"

# NBE
echo "Joining NBE peer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.nbe.cecbs.et \
  peer channel join -b /var/hyperledger/channel-artifacts/${CHANNEL_NAME}.block || echo "NBE already joined or failed"

# Customs
echo "Joining Customs peer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=CustomsMSP \
  -e CORE_PEER_ADDRESS=peer0.customs.cecbs.et:11051 \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.customs.cecbs.et \
  peer channel join -b /var/hyperledger/channel-artifacts/${CHANNEL_NAME}.block || echo "Customs already joined or failed"

# Shipping
echo "Joining Shipping peer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ShippingMSP \
  -e CORE_PEER_ADDRESS=peer0.shipping.cecbs.et:12051 \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer0.shipping.cecbs.et \
  peer channel join -b /var/hyperledger/channel-artifacts/${CHANNEL_NAME}.block || echo "Shipping already joined or failed"

echo "Done! All peers should be joined to ${CHANNEL_NAME}"
