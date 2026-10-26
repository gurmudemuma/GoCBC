#!/usr/bin/env bash
# Approve and commit already-installed chaincode
set -euo pipefail
export MSYS_NO_PATHCONV=1

CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CHANNEL="coffeechannel"

# Get the most recent package ID from peer logs
echo "Getting package ID from peer logs..."
PKG_ID=$(docker logs peer0.ecta.cecbs.et 2>&1 | grep "Successfully installed chaincode with package ID 'coffee_1.11:" | tail -1 | grep -o "coffee_1.11:[a-f0-9]*" || echo "")

if [ -z "$PKG_ID" ]; then
    echo "ERROR: Could not find package ID in logs"
    exit 1
fi

echo "Package ID: $PKG_ID"

# Approve for all orgs
ORGS=(ecta ecx banks nbe customs shipping)
declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )

ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

echo ""
echo "Approving chaincode for all organizations..."
for org in "${ORGS[@]}"; do
    msp=${ORG_MSP[$org]}
    port=${ORG_PORT[$org]}
    container="peer0.${org}.cecbs.et"
    
    echo -n "  Approving ${msp}... "
    
    docker exec \
        -e "FABRIC_CFG_PATH=//etc/hyperledger/fabric" \
        -e "CORE_PEER_TLS_ENABLED=true" \
        -e "CORE_PEER_LOCALMSPID=${msp}" \
        -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port}" \
        -e "CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt" \
        -e "CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
        "$container" \
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile "$ORDERER_CA" \
            --channelID "$CHANNEL" \
            --name "$CC_NAME" \
            --version "$CC_VERSION" \
            --package-id "$PKG_ID" \
            --sequence $CC_SEQUENCE >/dev/null 2>&1 && echo "✓" || echo "⚠ (may already be approved)"
done

echo ""
echo "Committing chaincode..."

# Stage TLS certs for commit
PKG_STAGE="C:/goCBC/blockchain/channel-artifacts"
for org in "${ORGS[@]}"; do
    docker cp "peer0.${org}.cecbs.et://etc/hyperledger/fabric/tls/ca.crt" "${PKG_STAGE}/tls-${org}.crt" 2>/dev/null
    docker cp "${PKG_STAGE}/tls-${org}.crt" "peer0.ecta.cecbs.et://tmp/tls-${org}.crt" 2>/dev/null
done

# Build peer arguments
PEER_ARGS=()
for org in "${ORGS[@]}"; do
    PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
    PEER_ARGS+=(--tlsRootCertFiles "//tmp/tls-${org}.crt")
done

# Commit
docker exec \
    -e "FABRIC_CFG_PATH=//etc/hyperledger/fabric" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=ECTAMSP" \
    -e "CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
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
echo "✓ Chaincode approved and committed successfully!"
echo ""
