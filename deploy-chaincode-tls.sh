#!/bin/bash
# Deploy TLS-Enabled Chaincode v1.9

set -e

echo "=========================================="
echo "🔐 Deploying TLS-Enabled Chaincode v1.9"
echo "=========================================="

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.9"
PACKAGE_NAME="coffee_1.9_tls.tgz"

# Get current sequence and increment
echo "Detecting current sequence..."
CURRENT_INFO=$(docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME 2>/dev/null
" || echo "")

if [ -z "$CURRENT_INFO" ]; then
    CC_SEQUENCE=1
else
    CURRENT_SEQUENCE=$(echo "$CURRENT_INFO" | grep -oP 'Sequence: \K[0-9]+')
    CC_SEQUENCE=$((CURRENT_SEQUENCE + 1))
fi

echo "New Sequence: $CC_SEQUENCE"

# Calculate package ID
PACKAGE_ID="${CC_NAME}_${CC_VERSION}_tls:$(tar -xzOf $PACKAGE_NAME code.tar.gz | sha256sum | awk '{print $1}')"
echo "Package ID: $PACKAGE_ID"

# Install on all peers
echo ""
echo "Installing on all peers..."

PEERS=(
    "peer0.ecx.cecbs.et:ECX"
    "peer0.ecta.cecbs.et:ECTA"
    "peer0.banks.cecbs.et:Banks"
    "peer0.nbe.cecbs.et:NBE"
    "peer0.customs.cecbs.et:Customs"
    "peer0.shipping.cecbs.et:Shipping"
)

for peer_info in "${PEERS[@]}"; do
    PEER=$(echo $peer_info | cut -d: -f1)
    ORG=$(echo $peer_info | cut -d: -f2)
    
    echo "Installing on $PEER ($ORG)..."
    
    # Copy package to peer
    docker cp $PACKAGE_NAME $PEER:/tmp/
    
    # Install
    docker exec $PEER bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${PEER#peer0.}/msp
        peer lifecycle chaincode install /tmp/$PACKAGE_NAME
    " 2>&1 | tail -3
done

echo ""
echo "✅ Installed on all peers"

# Approve for each organization
echo ""
echo "Approving chaincode definition for all orgs..."

ORDERER_TLS="/etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem"

for peer_info in "${PEERS[@]}"; do
    PEER=$(echo $peer_info | cut -d: -f1)
    ORG=$(echo $peer_info | cut -d: -f2)
    MSP="${ORG}MSP"
    
    echo "Approving for $ORG..."
    
    docker exec $PEER bash -c "
        export FABRIC_CFG_PATH=/etc/hyperledger/fabric
        export CORE_PEER_LOCALMSPID=$MSP
        export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${PEER#peer0.}/msp
        
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile $ORDERER_TLS \
            --channelID $CHANNEL \
            --name $CC_NAME \
            --version $CC_VERSION \
            --package-id '$PACKAGE_ID' \
            --sequence $CC_SEQUENCE \
            --init-required
    " 2>&1 | tail -3
    
    echo "✓ $ORG approved"
done

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
        --init-required
"

# Commit
echo ""
echo "Committing chaincode definition..."
docker exec peer0.ecx.cecbs.et bash -c "
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
    
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile $ORDERER_TLS \
        --channelID $CHANNEL \
        --name $CC_NAME \
        --version $CC_VERSION \
        --sequence $CC_SEQUENCE \
        --init-required \
        --peerAddresses peer0.ecx.cecbs.et:7051 \
        --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/peer0.ecta.cecbs.et-cert.pem \
        --peerAddresses peer0.banks.cecbs.et:7051 \
        --tlsRootCertFiles /etc/hyperledger/fabric/peer-tls/peer0.banks.cecbs.et-cert.pem
"

echo ""
echo "Querying committed chaincode..."
docker exec peer0.ecx.cecbs.et bash -c "
    export FABRIC_CFG_PATH=/etc/hyperledger/fabric
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
    peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME
"

echo ""
echo "=========================================="
echo "✅ TLS-Enabled Chaincode Deployed!"
echo "=========================================="
echo "Version: $CC_VERSION"
echo "Sequence: $CC_SEQUENCE"
echo "Package ID: $PACKAGE_ID"
echo "TLS: Enabled"
echo ""
echo "Next: Initialize chaincode with InitLedger"
