#!/bin/bash
set -e

# Install chaincode package with templated connection.json on all 6 peers

PACKAGE_FILE="/home/guda/GoCBC/chaincodes/coffee/coffee_2.18.tgz"

echo "=== Installing chaincode package on all peers ==="

# ECTA
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode install "$PACKAGE_FILE"

# ECX  
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051 \
  peer0.ecx.cecbs.et peer lifecycle chaincode install "$PACKAGE_FILE"

# Banks
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
  peer0.banks.cecbs.et peer lifecycle chaincode install "$PACKAGE_FILE"

# NBE
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
  peer0.nbe.cecbs.et peer lifecycle chaincode install "$PACKAGE_FILE"

# Customs
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.customs.cecbs.et:11051 \
  peer0.customs.cecbs.et peer lifecycle chaincode install "$PACKAGE_FILE"

# Shipping
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  -e CORE_PEER_ADDRESS=peer0.shipping.cecbs.et:12051 \
  peer0.shipping.cecbs.et peer lifecycle chaincode install "$PACKAGE_FILE"

echo "=== Installation complete ==="
echo "Now get the new package ID and approve/commit sequence 18"
