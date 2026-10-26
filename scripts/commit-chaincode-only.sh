#!/usr/bin/env bash
# Commit chaincode only (assumes already approved)
set -euo pipefail
export MSYS_NO_PATHCONV=1

CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CHANNEL="coffeechannel"

echo "Committing chaincode to channel..."

# Get package ID
PKG_ID=$(docker logs peer0.ecta.cecbs.et 2>&1 | grep "Successfully installed chaincode with package ID 'coffee_1.11:" | tail -1 | grep -o "coffee_1.11:[a-f0-9]*" || echo "")

if [ -z "$PKG_ID" ]; then
    echo "ERROR: Could not find package ID"
    exit 1
fi

echo "Using Package ID: $PKG_ID"

# Staging TLS certs
PKG_STAGE="C:/goCBC/blockchain/channel-artifacts"
ORGS=(ecta ecx banks nbe customs shipping)
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )

echo "Staging TLS certificates..."
for org in "${ORGS[@]}"; do
    docker cp "peer0.${org}.cecbs.et://etc/hyperledger/fabric/tls/ca.crt" "${PKG_STAGE}/tls-${org}.crt" 2>/dev/null || echo "Cert already exists"
    docker cp "${PKG_STAGE}/tls-${org}.crt" "peer0.ecta.cecbs.et://tmp/tls-${org}.crt" 2>/dev/null || echo "Cert already copied"
done

# Build peer arguments
PEER_ARGS=()
for org in "${ORGS[@]}"; do
    PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
    PEER_ARGS+=(--tlsRootCertFiles "/tmp/tls-${org}.crt")
done

ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

echo "Committing chaincode..."
docker exec \
    -e "FABRIC_CFG_PATH=/etc/hyperledger/fabric" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=ECTAMSP" \
    -e "CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile "$ORDERER_CA" \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --sequence $CC_SEQUENCE \
        "${PEER_ARGS[@]}"

echo ""
echo "✅ Chaincode committed successfully!"
echo ""
echo "Verifying commit..."
docker exec peer0.ecta.cecbs.et sh -c "peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1" | head -20 || echo "Verification needs proper MSP configuration"
