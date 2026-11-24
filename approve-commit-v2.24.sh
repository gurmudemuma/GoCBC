#!/bin/bash

VERSION="2.24"
SEQUENCE=7
PACKAGE_ID="coffee_2.24:e4e996ac4c7f0f6a57af8647795ae0b066c4a47fec377b625221a2b5796804b4"

echo "Approving coffee v${VERSION} (sequence ${SEQUENCE}) on all organizations..."

# Approve on ECTA
echo "Approving on ECTA..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Approve on ECX
echo "Approving on ECX..."
docker exec peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Approve on Banks
echo "Approving on Banks..."
docker exec peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Approve on NBE
echo "Approving on NBE..."
docker exec peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Approve on Customs
echo "Approving on Customs..."
docker exec peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Approve on Shipping
echo "Approving on Shipping..."
docker exec peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Check commit readiness
echo ""
echo "Checking commit readiness..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# Commit
echo ""
echo "Committing coffee v${VERSION} to the channel..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --channelID coffeechannel \
  --name coffee \
  --version ${VERSION} \
  --sequence ${SEQUENCE} \
  --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
  --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tls/ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tls/ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tls/ca.crt \
  --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tls/ca.crt \
  --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tls/ca.crt \
  --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tls/ca.crt

echo ""
echo "Verifying committed chaincode..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel -n coffee

echo ""
echo "✓ Chaincode v${VERSION} sequence ${SEQUENCE} deployment complete!"
