#!/bin/bash

################################################################################
# Redeploy Chaincode with New Functions
# Adds ClearBorderCrossing and DetainBorderCrossing functions
################################################################################

set -e

CHAINCODE_DIR="/home/guda/GoCBC/chaincodes/coffee"
CHAINCODE_NAME="coffee"
CURRENT_VERSION="1.0"
NEW_VERSION="1.1"
NEW_SEQUENCE="2"

echo "════════════════════════════════════════════════════════════"
echo "  Redeploying Chaincode with New Border Crossing Functions"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Package the chaincode
echo "▶ Step 1: Packaging chaincode v${NEW_VERSION}..."
cd "$CHAINCODE_DIR"

# Remove old package if exists
rm -f "coffee_${NEW_VERSION}.tar.gz"

# Package new version
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode package \
  "/tmp/coffee_${NEW_VERSION}.tar.gz" \
  --path /chaincodes/coffee \
  --lang golang \
  --label "coffee_${NEW_VERSION}"

# Copy package out of container
docker cp peer0.ecta.cecbs.et:"/tmp/coffee_${NEW_VERSION}.tar.gz" .

echo "✓ Chaincode packaged: coffee_${NEW_VERSION}.tar.gz"
echo ""

# Step 2: Install on all peers
echo "▶ Step 2: Installing on all peers..."

PEERS=(
  "peer0.ecta.cecbs.et"
  "peer0.ecx.cecbs.et"
  "peer0.banks.cecbs.et"
  "peer0.nbe.cecbs.et"
  "peer0.customs.cecbs.et"
  "peer0.shipping.cecbs.et"
)

for PEER in "${PEERS[@]}"; do
  echo "  Installing on $PEER..."
  docker cp "coffee_${NEW_VERSION}.tar.gz" "$PEER:/tmp/"
  
  docker exec "$PEER" peer lifecycle chaincode install \
    "/tmp/coffee_${NEW_VERSION}.tar.gz" 2>&1 | grep -E "Chaincode code package identifier|installed" || true
done

echo "✓ Installed on all peers"
echo ""

# Step 3: Get package ID
echo "▶ Step 3: Getting package ID..."
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled | \
  grep "coffee_${NEW_VERSION}" | \
  sed 's/Package ID: //' | sed 's/, Label:.*//' | tr -d '\r')

echo "✓ Package ID: $PACKAGE_ID"
echo ""

# Step 4: Approve for all organizations
echo "▶ Step 4: Approving for all organizations..."

# ECTA
echo "  Approving for ECTA..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --package-id "$PACKAGE_ID" \
  --sequence ${NEW_SEQUENCE}

# ECX
echo "  Approving for ECX..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --package-id "$PACKAGE_ID" \
  --sequence ${NEW_SEQUENCE}

# Banks
echo "  Approving for Banks..."
docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --package-id "$PACKAGE_ID" \
  --sequence ${NEW_SEQUENCE}

# NBE
echo "  Approving for NBE..."
docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --package-id "$PACKAGE_ID" \
  --sequence ${NEW_SEQUENCE}

# Customs
echo "  Approving for Customs..."
docker exec \
  -e CORE_PEER_LOCALMSPID=CustomsMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  peer0.customs.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --package-id "$PACKAGE_ID" \
  --sequence ${NEW_SEQUENCE}

# Shipping
echo "  Approving for Shipping..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ShippingMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  peer0.shipping.cecbs.et peer lifecycle chaincode approveformyorg \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --package-id "$PACKAGE_ID" \
  --sequence ${NEW_SEQUENCE}

echo "✓ Approved by all organizations"
echo ""

# Step 5: Check commit readiness
echo "▶ Step 5: Checking commit readiness..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --sequence ${NEW_SEQUENCE}

echo ""

# Step 6: Commit the chaincode
echo "▶ Step 6: Committing chaincode..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version ${NEW_VERSION} \
  --sequence ${NEW_SEQUENCE} \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:7053 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
  --peerAddresses peer0.banks.cecbs.et:7055 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt

echo "✓ Chaincode committed"
echo ""

# Step 7: Verify deployment
echo "▶ Step 7: Verifying deployment..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel \
  --name coffee

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Chaincode Redeployment Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "New Functions Available:"
echo "  • ClearBorderCrossing"
echo "  • DetainBorderCrossing"
echo "  • RecordBorderInspection"
echo ""
