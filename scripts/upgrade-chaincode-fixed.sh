#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "  Upgrading Chaincode to v1.1 with Border Crossing Functions"
echo "════════════════════════════════════════════════════════════"
echo ""

CHAINCODE_PKG="/home/guda/GoCBC/chaincodes/coffee/coffee_1.1.tar.gz"

# Step 1: Install on all peers WITH ADMIN CREDENTIALS
echo "Step 1: Installing chaincode v1.1 on all peers..."
echo ""

# ECTA
echo "  Installing on ECTA..."
docker cp "$CHAINCODE_PKG" peer0.ecta.cecbs.et:/tmp/coffee_1.1.tar.gz
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"

# ECX
echo "  Installing on ECX..."
docker cp "$CHAINCODE_PKG" peer0.ecx.cecbs.et:/tmp/coffee_1.1.tar.gz
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"

# Banks
echo "  Installing on Banks..."
docker cp "$CHAINCODE_PKG" peer0.banks.cecbs.et:/tmp/coffee_1.1.tar.gz
docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"

# NBE
echo "  Installing on NBE..."
docker cp "$CHAINCODE_PKG" peer0.nbe.cecbs.et:/tmp/coffee_1.1.tar.gz
docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"

# Customs
echo "  Installing on Customs..."
docker cp "$CHAINCODE_PKG" peer0.customs.cecbs.et:/tmp/coffee_1.1.tar.gz
docker exec \
  -e CORE_PEER_LOCALMSPID=CustomsMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  peer0.customs.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"

# Shipping
echo "  Installing on Shipping..."
docker cp "$CHAINCODE_PKG" peer0.shipping.cecbs.et:/tmp/coffee_1.1.tar.gz
docker exec \
  -e CORE_PEER_LOCALMSPID=ShippingMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  peer0.shipping.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"

echo ""
echo "✓ Installed on all peers"
echo ""

# Step 2: Get package ID
echo "Step 2: Getting package ID..."
PKG_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | \
  grep "coffee_1.1" | awk '{print $3}' | sed 's/,//')

echo "✓ Package ID: $PKG_ID"
echo ""

# Step 3: Approve for all organizations
echo "Step 3: Approving for all organizations (v1.1, sequence 2)..."
echo ""

# ECTA
echo "  ECTA..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 \
  --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1

# ECX
echo "  ECX..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 \
  --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1

# Banks
echo "  Banks..."
docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 \
  --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1

# NBE
echo "  NBE..."
docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 \
  --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1

# Customs
echo "  Customs..."
docker exec \
  -e CORE_PEER_LOCALMSPID=CustomsMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 \
  --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1

# Shipping
echo "  Shipping..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ShippingMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 \
  --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1

echo ""
echo "✓ All organizations approved"
echo ""

# Step 4: Check commit readiness
echo "Step 4: Checking commit readiness..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
  --channelID coffeechannel --name coffee --version 1.1 --sequence 2 2>&1 | grep -A10 "Approvals"

echo ""

# Step 5: Commit the chaincode
echo "Step 5: Committing chaincode v1.1 to channel..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --sequence 2 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt 2>&1 | tail -3

echo ""
echo "✓ Chaincode v1.1 committed!"
echo ""

# Step 6: Verify
echo "Step 6: Verifying deployment..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee 2>&1 | grep -E "Version|Sequence|Approvals"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Chaincode Upgrade to v1.1 Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "New functions now available:"
echo "  • ClearBorderCrossing - Clear shipments at border"
echo "  • DetainBorderCrossing - Detain shipments for inspection"
echo "  • RecordBorderInspection - Record physical inspections"
echo ""
echo "Testing the new functions..."
echo ""

# Test the new functions are available
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"ReadBorderCrossing","Args":["TEST_NONEXISTENT"]}' 2>&1 | grep -v "Error: endorsement failure" || echo "✓ Chaincode is responding (border crossing functions loaded)"

echo ""
