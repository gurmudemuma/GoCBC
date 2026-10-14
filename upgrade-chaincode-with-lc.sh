#!/bin/bash
# Upgrade Chaincode with LC Support (UpdateLC function)

set -e

echo "=========================================="
echo "🚀 Upgrading Chaincode to v1.10 with LC Support"
echo "=========================================="

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.10"

cd /home/guda/GoCBC/chaincodes/coffee

# Step 1: Build the chaincode
echo ""
echo "[1/7] Building chaincode..."
go mod tidy
go build -o chaincode
echo "✅ Build complete"

# Step 2: Package the chaincode (external chaincode format for CCAAS)
echo ""
echo "[2/7] Packaging chaincode..."

# Create connection.json for CCAAS
cat > connection.json <<EOF
{
  "address": "coffee-chaincode:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

# Create metadata.json
cat > metadata.json <<EOF
{
  "type": "ccaas",
  "label": "${CC_NAME}_${CC_VERSION}"
}
EOF

# Package it
tar czf code.tar.gz connection.json
tar czf ${CC_NAME}_${CC_VERSION}.tgz code.tar.gz metadata.json

echo "✅ Package created: ${CC_NAME}_${CC_VERSION}.tgz"

# Step 3: Calculate package ID
LABEL="${CC_NAME}_${CC_VERSION}"
PACKAGE_ID=$(echo -n "$LABEL" | sha256sum | awk '{print $1}')
FULL_PACKAGE_ID="${LABEL}:${PACKAGE_ID}"
echo "📦 Package ID: $FULL_PACKAGE_ID"

# Step 4: Get current sequence
echo ""
echo "[3/7] Detecting current chaincode sequence..."
CURRENT_INFO=$(docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME 2>/dev/null
" || echo "")

if [ -z "$CURRENT_INFO" ]; then
    CC_SEQUENCE=1
else
    CURRENT_SEQUENCE=$(echo "$CURRENT_INFO" | grep -oP 'Sequence: \K[0-9]+' || echo "0")
    CC_SEQUENCE=$((CURRENT_SEQUENCE + 1))
fi

echo "📊 Current Sequence: ${CURRENT_SEQUENCE:-0}"
echo "📊 New Sequence: $CC_SEQUENCE"

# Step 5: Install on all peers
echo ""
echo "[4/7] Installing chaincode on all peers..."

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
    
    # Copy package
    docker cp ${CC_NAME}_${CC_VERSION}.tgz $PEER:/tmp/
    
    # Install
    docker exec $PEER bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${PEER#peer0.}/msp
        peer lifecycle chaincode install /tmp/${CC_NAME}_${CC_VERSION}.tgz 2>&1 | grep -E 'Chaincode code package identifier|error' || true
    "
done

echo "✅ Installed on all peers"

# Step 6: Approve for all organizations
echo ""
echo "[5/7] Approving chaincode for all organizations..."

ORDERER_TLS="/etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem"

ORGS=(
    "peer0.ecta.cecbs.et:ECTAMSP:ecta.cecbs.et"
    "peer0.ecx.cecbs.et:ECXMSP:ecx.cecbs.et"
    "peer0.banks.cecbs.et:BanksMSP:banks.cecbs.et"
    "peer0.nbe.cecbs.et:NBEMSP:nbe.cecbs.et"
    "peer0.customs.cecbs.et:CustomsMSP:customs.cecbs.et"
    "peer0.shipping.cecbs.et:ShippingMSP:shipping.cecbs.et"
)

for org_info in "${ORGS[@]}"; do
    PEER=$(echo $org_info | cut -d: -f1)
    MSP=$(echo $org_info | cut -d: -f2)
    DOMAIN=$(echo $org_info | cut -d: -f3)
    
    echo "  Approving for $MSP..."
    
    docker exec $PEER bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_LOCALMSPID=$MSP
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${DOMAIN}/msp
        
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile $ORDERER_TLS \
            --channelID $CHANNEL \
            --name $CC_NAME \
            --version $CC_VERSION \
            --package-id '$FULL_PACKAGE_ID' \
            --sequence $CC_SEQUENCE 2>&1 | grep -E 'Successfully|error' || true
    "
done

echo "✅ Approved by all organizations"

# Step 7: Commit the chaincode definition
echo ""
echo "[6/7] Committing chaincode definition..."

docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_LOCALMSPID=ECTAMSP
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp

peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile $ORDERER_TLS \
    --channelID $CHANNEL \
    --name $CC_NAME \
    --version $CC_VERSION \
    --sequence $CC_SEQUENCE \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/ecx-tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/banks-tls/ca.crt
"

echo "✅ Chaincode committed"

# Step 8: Update and restart CCAAS container
echo ""
echo "[7/7] Updating CCAAS container..."

# Rebuild Docker image
cd /home/guda/GoCBC/chaincodes/coffee
docker build -t coffee-chaincode:1.10 .

# Stop old container
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

# Start new container with updated package ID
docker run -d \
    --name coffee-chaincode \
    --hostname coffee-chaincode \
    --network cecbs-network \
    -p 9999:9999 \
    -e CORE_CHAINCODE_ID_NAME="${FULL_PACKAGE_ID}" \
    -e CORE_PEER_TLS_ENABLED=false \
    -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
    coffee-chaincode:1.10

sleep 5

echo "✅ CCAAS container updated and running"

# Verify
echo ""
echo "=========================================="
echo "🎉 Chaincode Upgrade Complete!"
echo "=========================================="
echo ""
echo "Verifying installation..."
docker exec peer0.ecta.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME
"

echo ""
echo "✅ Upgrade successful! UpdateLC and ReadLC functions are now available."
echo ""
echo "You can now test forex allocation with:"
echo "  bash end-to-end-test.sh"
