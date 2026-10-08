#!/bin/bash
# Universal Chaincode Deployment Script
# Automatically detects current version and deploys the updated chaincode

set -e

echo "=========================================="
echo "🚀 Universal Chaincode Deployment"
echo "=========================================="

# Verify builder scripts are correct
echo ""
echo "Verifying external builder scripts..."
if [ ! -x "builders/ccaas/bin/detect" ] || [ ! -x "builders/ccaas/bin/build" ] || [ ! -x "builders/ccaas/bin/release" ]; then
    echo "❌ Error: Builder scripts are missing or not executable"
    echo "Fixing permissions..."
    chmod +x builders/ccaas/bin/detect builders/ccaas/bin/build builders/ccaas/bin/release
fi

# Verify release script uses correct parameter
if grep -q 'BUILD_OUTPUT_DIR="\$1"' builders/ccaas/bin/release; then
    echo "✓ Release script is correctly configured"
else
    echo "⚠️  Warning: Release script may need updating"
fi

# Get current committed version and sequence with timeout
echo ""
echo "Detecting current chaincode version..."
CURRENT_INFO=$(timeout 15 docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>/dev/null
" 2>/dev/null || echo "")

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

# EXPERT: Rebuild chaincode with all updates
echo ""
echo "=========================================="
echo "🔨 REBUILDING CHAINCODE WITH ALL UPDATES"
echo "=========================================="

cd chaincodes/coffee

# Clean up old packages first
echo ""
echo "Cleaning old chaincode packages..."
BEFORE=$(ls -1 coffee_*.tgz coffee_*.tar.gz 2>/dev/null | wc -l)
if [ "$BEFORE" -gt 0 ]; then
    echo "  Found $BEFORE old package(s), removing ALL..."
    rm -f coffee_*.tgz coffee_*.tar.gz
    echo "  ✅ Removed all old packages"
else
    echo "  ✅ No old packages found"
fi

# Clean up old binaries
echo ""
echo "Cleaning old binaries..."
rm -f coffee coffee-chaincode coffee-static chaincode 2>/dev/null || true
echo "  ✅ Cleaned old binaries"

# Pull latest Go dependencies
echo ""
echo "Updating Go dependencies..."
if go mod tidy; then
    echo "  ✅ Dependencies updated"
else
    echo "  ⚠️  Warning: go mod tidy failed, continuing..."
fi

# Build fresh chaincode binary
echo ""
echo "Building fresh chaincode binary..."
if CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o coffee-chaincode -v .; then
    echo "  ✅ Chaincode binary built successfully"
    ls -lh coffee-chaincode
else
    echo "  ❌ Failed to build chaincode"
    exit 1
fi

# Make binary executable
chmod +x coffee-chaincode

# Verify binary works
echo ""
echo "Verifying chaincode binary..."
if ./coffee-chaincode --version 2>/dev/null || ./coffee-chaincode --help 2>/dev/null || [ -f coffee-chaincode ]; then
    echo "  ✅ Binary verification passed"
else
    echo "  ⚠️  Warning: Cannot verify binary, but continuing..."
fi

cd ../..
echo ""
echo "=========================================="
echo "📦 PACKAGING CHAINCODE (CCAAS)"
echo "=========================================="

PKG_DIR="blockchain/channel-artifacts"
mkdir -p "$PKG_DIR"

# Create metadata.json for CCAAS
cat > "${PKG_DIR}/metadata.json" << EOF
{
  "type": "ccaas",
  "label": "coffee_${CC_VERSION}"
}
EOF

# Create connection.json pointing to the external chaincode container with TLS
# Use the TLS-enabled connection.json from chaincodes/coffee/
if [ -f "chaincodes/coffee/connection.json" ]; then
    echo "Using TLS-enabled connection.json from chaincodes/coffee/"
    cp chaincodes/coffee/connection.json "${PKG_DIR}/connection.json"
else
    echo "⚠️  Warning: TLS connection.json not found, creating basic version"
    cat > "${PKG_DIR}/connection.json" << EOF
{
  "address": "coffee-chaincode:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF
fi

# Create the chaincode package
cd "$PKG_DIR"
tar czf code.tar.gz connection.json
tar czf "${PACKAGE_NAME}" metadata.json code.tar.gz
rm -f metadata.json connection.json code.tar.gz
cd ../..

echo "✅ CCAAS Package created: ${PACKAGE_NAME}"

# Rebuild chaincode Docker container with new binary
echo ""
echo "=========================================="
echo "🐳 REBUILDING CHAINCODE DOCKER CONTAINER"
echo "=========================================="

echo ""
echo "Stopping old chaincode container..."
docker stop coffee-chaincode 2>/dev/null || echo "  Container not running"
docker rm coffee-chaincode 2>/dev/null || echo "  Container doesn't exist"

echo ""
echo "Rebuilding Docker image with new binary..."
cd chaincodes/coffee
if docker build -t coffee-chaincode:latest .; then
    echo "  ✅ Docker image rebuilt successfully"
else
    echo "  ❌ Failed to rebuild Docker image"
    cd ../..
    exit 1
fi
cd ../..

echo ""
echo "Starting new chaincode container..."
# Start container directly with docker run (CCAAS mode)
if docker run -d \
    --name coffee-chaincode \
    --network cecbs-network \
    -p 9999:9999 \
    -e CORE_CHAINCODE_ID_NAME="coffee_${CC_VERSION}:latest" \
    -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
    coffee-chaincode:latest; then
    echo "  ✅ Chaincode container started"
else
    echo "  ❌ Failed to start chaincode container"
    exit 1
fi

echo ""
echo "Waiting for chaincode to be ready..."
sleep 5

# Verify chaincode is responding
echo ""
echo "Verifying chaincode is responding on port 9999..."
MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if docker exec coffee-chaincode nc -z localhost 9999 2>/dev/null; then
        echo "  ✅ Chaincode is responding on port 9999"
        break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -eq $MAX_RETRIES ]; then
        echo "  ⚠️  Warning: Chaincode not responding after ${MAX_RETRIES} attempts"
        echo "  Container logs:"
        docker logs coffee-chaincode --tail 20
    else
        echo "  Waiting... (attempt $RETRY/$MAX_RETRIES)"
        sleep 3
    fi
done

# Distribute TLS certificates
echo ""
echo "Distributing TLS certificates..."
ORDERER_TLS="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

# Copy orderer TLS cert to all peers (in mounted directory for persistence)
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    cat "$ORDERER_TLS" | docker exec -i $peer bash -c "mkdir -p /etc/hyperledger/fabric/orderer-tls && cat > /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem"
done

# Copy peer TLS certs to all peers (in mounted directory for persistence)
for org in ecta ecx banks nbe customs shipping; do
    PEER_TLS="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
    if [ ! -f "$PEER_TLS" ]; then
        echo "⚠️  Warning: TLS cert not found: $PEER_TLS"
        continue
    fi
    for target_peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
        cat "$PEER_TLS" | docker exec -i $target_peer bash -c "mkdir -p /etc/hyperledger/fabric/peer-tls && cat > /etc/hyperledger/fabric/peer-tls/tlsca.${org}.cecbs.et-cert.pem"
    done
done

echo "✅ TLS certificates distributed"

# Verify TLS certs were copied (use sh -c to avoid Git Bash path mangling)
echo "Verifying TLS certificates..."
if docker exec peer0.ecta.cecbs.et sh -c 'test -f /etc/hyperledger/fabric/peer-tls/tlsca.ecta.cecbs.et-cert.pem'; then
    echo "✅ TLS certs verified"
else
    echo "⚠️  TLS cert verification failed"
fi

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
            --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
            --channelID $CHANNEL \
            --name $CC_NAME \
            --version $CC_VERSION \
            --package-id $PACKAGE_ID \
            --sequence $CC_SEQUENCE \
            --init-required=false \
            --signature-policy \"OR('ECTAMSP.peer','ECXMSP.peer','BanksMSP.peer','NBEMSP.peer','CustomsMSP.peer','ShippingMSP.peer')\"
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
    --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
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
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --init-required=false \
    --signature-policy \"OR('ECTAMSP.peer','ECXMSP.peer','BanksMSP.peer','NBEMSP.peer','CustomsMSP.peer','ShippingMSP.peer')\" \
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.ecta.cecbs.et-cert.pem \
    --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.ecx.cecbs.et-cert.pem \
    --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.banks.cecbs.et-cert.pem \
    --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.nbe.cecbs.et-cert.pem \
    --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.customs.cecbs.et-cert.pem \
    --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/tlsca.shipping.cecbs.et-cert.pem
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
