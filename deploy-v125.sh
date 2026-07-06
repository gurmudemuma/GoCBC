#!/bin/bash

# Simple deployment script for chaincode v1.25
# Run this from Git Bash

set -e

VERSION="1.25"
SEQUENCE="4"
PACKAGE_ID="coffee_1.25:72b7a11c500b91bc686f86338fab13f74091afd87d162614ac5a45033242ecb6"

echo "=========================================="
echo "Approving Chaincode v${VERSION} for All Orgs"
echo "=========================================="

# Approve for ECTA
echo "→ Approving for ECTA..."
MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    --channelID coffeechannel \
    --name coffee \
    --version ${VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050

echo "✓ ECTA approved"

# Approve for Banks
echo "→ Approving for Banks..."
MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    --channelID coffeechannel \
    --name coffee \
    --version ${VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050

echo "✓ Banks approved"

# Approve for NBE
echo "→ Approving for NBE..."
MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    --channelID coffeechannel \
    --name coffee \
    --version ${VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050

echo "✓ NBE approved"

# Approve for Customs
echo "→ Approving for Customs..."
MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  peer0.customs.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    --channelID coffeechannel \
    --name coffee \
    --version ${VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050

echo "✓ Customs approved"

# Approve for Shipping  
echo "→ Approving for Shipping..."
MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  peer0.shipping.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    --channelID coffeechannel \
    --name coffee \
    --version ${VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050

echo "✓ Shipping approved"

echo ""
echo "=========================================="
echo "Committing Chaincode to Channel"
echo "=========================================="

# Copy peer TLS certs
echo "→ Preparing peer TLS certificates..."
for org in ecta banks nbe customs ecx shipping; do
  TLS_CERT="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
  docker cp "$TLS_CERT" peer0.banks.cecbs.et:/tmp/${org}-tls.crt 2>/dev/null
done
echo "✓ Certificates ready"

# Commit
MSYS_NO_PATHCONV=1 docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et \
  peer lifecycle chaincode commit \
    --channelID coffeechannel \
    --name coffee \
    --version ${VERSION} \
    --sequence ${SEQUENCE} \
    --tls \
    --cafile /tmp/orderer-ca.crt \
    --orderer orderer.cecbs.et:7050 \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /tmp/ecta-tls.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /tmp/banks-tls.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /tmp/nbe-tls.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /tmp/customs-tls.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /tmp/ecx-tls.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /tmp/shipping-tls.crt

echo "✓ Chaincode committed"

echo ""
echo "=========================================="
echo "Verifying Deployment"
echo "=========================================="

MSYS_NO_PATHCONV=1 docker exec peer0.banks.cecbs.et \
  peer lifecycle chaincode querycommitted -C coffeechannel -n coffee

echo ""
echo "✅ Deployment Complete!"
echo "Chaincode v${VERSION} is now active with all validation improvements"
