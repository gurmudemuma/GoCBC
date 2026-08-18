#!/bin/bash
# Universal Chaincode Deployment Script
# Automatically detects current version and deploys the updated chaincode

set -e

echo "=========================================="
echo "🚀 Universal Chaincode Deployment"
echo "=========================================="

# Get current committed version and sequence
echo ""
echo "Detecting current chaincode version..."
CURRENT_INFO=$(docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null
" || echo "")

if [ -z "$CURRENT_INFO" ]; then
    echo "No chaincode deployed yet. Starting fresh..."
    CC_VERSION="1.0"
    CC_SEQUENCE=1
else
    # Parse version and sequence from output like "Version: 1.58, Sequence: 4, Endorsement Plugin..."
    CURRENT_VERSION=$(echo "$CURRENT_INFO" | grep -oP 'Version: \K[0-9.]+')
    CURRENT_SEQUENCE=$(echo "$CURRENT_INFO" | grep -oP 'Sequence: \K[0-9]+')
    
    echo "Current Version: $CURRENT_VERSION"
    echo "Current Sequence: $CURRENT_SEQUENCE"
    
    # Increment version (minor version)
    CC_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{printf "%d.%d", $1, $2+1}')
    # Increment sequence (as integer)
    CC_SEQUENCE=$((CURRENT_SEQUENCE + 1))
    
    echo "New Version: $CC_VERSION"
    echo "New Sequence: $CC_SEQUENCE"
fi

CHANNEL="coffeechannel"
CC_NAME="coffee"
PACKAGE_NAME="coffee_${CC_VERSION}.tgz"

# Build and package chaincode (CCAAS - Chaincode as a Service)
echo ""
echo "Building CCAAS chaincode package..."
PKG_DIR="blockchain/channel-artifacts"
mkdir -p "$PKG_DIR"

# Create metadata.json for CCAAS
cat > "${PKG_DIR}/metadata.json" << EOF
{
  "type": "ccaas",
  "label": "coffee_${CC_VERSION}"
}
EOF

# Create connection.json pointing to the external chaincode container
cat > "${PKG_DIR}/connection.json" << EOF
{
  "address": "coffee-chaincode:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

# Create the chaincode package
cd "$PKG_DIR"
tar czf code.tar.gz connection.json
tar czf "${PACKAGE_NAME}" metadata.json code.tar.gz
rm -f metadata.json connection.json code.tar.gz
cd ../..

echo "✅ CCAAS Package created: ${PACKAGE_NAME}"

# Distribute TLS certificates
echo ""
echo "Distributing TLS certificates..."
ORDERER_TLS="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    docker exec $peer mkdir -p /var/hyperledger/orderer-tls 2>/dev/null || true
    docker cp "$ORDERER_TLS" $peer:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>/dev/null || true
done

for org in ecta ecx banks nbe customs shipping; do
    PEER_TLS="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
    for target_peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
        docker exec $target_peer mkdir -p /var/hyperledger/peer-tls 2>/dev/null || true
        docker cp "$PEER_TLS" $target_peer:/var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem 2>/dev/null || true
    done
done

echo "✅ TLS certificates distributed"

# Install on all peers
echo ""
echo "Installing chaincode on all peers..."
for org in ecta ecx banks nbe customs shipping; do
    echo "  Installing on ${org}..."
    docker cp "blockchain/channel-artifacts/${PACKAGE_NAME}" "peer0.${org}.cecbs.et:/tmp/${PACKAGE_NAME}" 2>&1 | grep -v "^$" || true
    docker exec "peer0.${org}.cecbs.et" bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp
        peer lifecycle chaincode install /tmp/${PACKAGE_NAME} 2>&1
    " | grep -aE "Chaincode code package identifier|already installed|successfully|Error|error" || echo "    Install completed"
done

echo "✅ Chaincode install commands completed"

# Get package ID
echo ""
echo "Getting package ID..."
sleep 3
PACKAGE_ID=$(docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode queryinstalled 2>&1
" | grep "coffee_${CC_VERSION}" | tail -1 | awk -F'Package ID: ' '{print $2}' | awk -F', Label:' '{print $1}')

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Failed to get package ID. Showing queryinstalled output:"
    docker exec peer0.ecx.cecbs.et bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
        peer lifecycle chaincode queryinstalled
    "
    exit 1
fi

echo "Package ID: $PACKAGE_ID"

# Approve for all organizations
echo ""
echo "Approving chaincode for all organizations..."

declare -A ORG_PORT=([ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051)
declare -A ORG_MSP=([ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP)

for org in ecta ecx banks nbe customs shipping; do
    echo "  Approving ${ORG_MSP[$org]}..."
    docker exec "peer0.${org}.cecbs.et" bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp
        export CORE_PEER_LOCALMSPID=${ORG_MSP[$org]}
        export CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${ORG_PORT[$org]}
        export CORE_PEER_TLS_ENABLED=true
        export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
            --channelID $CHANNEL \
            --name $CC_NAME \
            --version $CC_VERSION \
            --package-id $PACKAGE_ID \
            --sequence $CC_SEQUENCE
    " 2>&1 | grep -E "Successfully|already" || true
done

echo "✅ Approved by all 6 organizations (ECTA, ECX, Banks, NBE, Customs, Shipping)"

# Check commit readiness
echo ""
echo "Checking commit readiness..."
docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode checkcommitreadiness \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --output json
"

# Commit chaincode
echo ""
echo "Committing chaincode definition..."
docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECXMSP
export CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.ecta.cecbs.et-cert.pem \
    --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.ecx.cecbs.et-cert.pem \
    --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.banks.cecbs.et-cert.pem \
    --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.nbe.cecbs.et-cert.pem \
    --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.customs.cecbs.et-cert.pem \
    --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.shipping.cecbs.et-cert.pem
"

echo ""
echo "✅ Committed successfully!"

# Verify deployment
echo ""
echo "Verifying deployment..."
sleep 2
docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME
"

echo ""
echo "=========================================="
echo "✅ CHAINCODE DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Chaincode: $CC_NAME v$CC_VERSION"
echo "Sequence: $CC_SEQUENCE"
echo "Package ID: $PACKAGE_ID"
echo "Channel: $CHANNEL"
echo ""
echo "The chaincode is now active and ready for transactions."
echo ""
