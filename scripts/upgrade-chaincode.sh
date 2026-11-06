#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "  Upgrading Chaincode to v1.1 (with new border functions)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Get package ID
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | grep "coffee_1.1" | awk '{print $3}' | sed 's/,//' | head -1)

if [ -z "$PACKAGE_ID" ]; then
  echo "✗ Package ID not found. Installing first..."
  
  # Package inside container
  docker exec peer0.ecta.cecbs.et peer lifecycle chaincode package \
    /tmp/coffee_1.1.tar.gz \
    --path /chaincodes/coffee \
    --lang golang \
    --label coffee_1.1
  
  # Install on ECTA
  docker exec peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz
  
  # Copy and install on other peers
  for peer in peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    docker exec peer0.ecta.cecbs.et cat /tmp/coffee_1.1.tar.gz | docker exec -i $peer sh -c 'cat > /tmp/coffee_1.1.tar.gz'
    docker exec $peer peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz
  done
  
  # Get package ID again
  PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | grep "coffee_1.1" | awk '{print $3}' | sed 's/,//' | head -1)
fi

echo "✓ Package ID: $PACKAGE_ID"
echo ""

# Approve for all orgs
echo "Approving for all organizations..."
echo ""

# ECTA
echo "  ECTA..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --package-id "$PACKAGE_ID" --sequence 2

# ECX  
echo "  ECX..."
docker exec peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --package-id "$PACKAGE_ID" --sequence 2

# Banks
echo "  Banks..."
docker exec peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --package-id "$PACKAGE_ID" --sequence 2

# NBE
echo "  NBE..."
docker exec peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --package-id "$PACKAGE_ID" --sequence 2

# Customs
echo "  Customs..."
docker exec peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --package-id "$PACKAGE_ID" --sequence 2

# Shipping
echo "  Shipping..."
docker exec peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --package-id "$PACKAGE_ID" --sequence 2

echo ""
echo "✓ All organizations approved"
echo ""

# Check commit readiness
echo "Checking commit readiness..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
  --channelID coffeechannel --name coffee --version 1.1 --sequence 2

echo ""

# Commit
echo "Committing chaincode v1.1..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --sequence 2 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt

echo ""
echo "✓ Chaincode v1.1 committed!"
echo ""

# Verify
echo "Verifying deployment..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Chaincode Upgrade Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "New functions available:"
echo "  • ClearBorderCrossing"
echo "  • DetainBorderCrossing"
echo "  • RecordBorderInspection"
echo ""
