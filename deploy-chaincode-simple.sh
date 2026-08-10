#!/usr/bin/env bash
# Simplified chaincode deployment - direct approach
# No fancy loops, just straightforward commands

export MSYS_NO_PATHCONV=1

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CC_LABEL="${CC_NAME}_${CC_VERSION}"

echo "=========================================="
echo "Deploying Coffee Chaincode"
echo "=========================================="
echo ""

# Step 1: Build and copy package
echo "[1/4] Building chaincode package..."
TMP_DIR=$(mktemp -d)
cat > "$TMP_DIR/metadata.json" <<EOF
{"type":"ccaas","label":"${CC_LABEL}"}
EOF

cat > "$TMP_DIR/connection.json" <<EOF
{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}
EOF

cd "$TMP_DIR"
tar czf code.tar.gz connection.json
tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz
PKG_FILE="${TMP_DIR}/${CC_LABEL}.tar.gz"
cd - > /dev/null

echo "✓ Package built: $PKG_FILE"
echo ""

# Step 2: Install on all peers
echo "[2/4] Installing on all peers..."

docker cp "$PKG_FILE" peer0.ecta.cecbs.et:/tmp/
docker cp "$PKG_FILE" peer0.ecx.cecbs.et:/tmp/
docker cp "$PKG_FILE" peer0.banks.cecbs.et:/tmp/
docker cp "$PKG_FILE" peer0.nbe.cecbs.et:/tmp/
docker cp "$PKG_FILE" peer0.customs.cecbs.et:/tmp/
docker cp "$PKG_FILE" peer0.shipping.cecbs.et:/tmp/

docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" peer0.ecta.cecbs.et peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz"

docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp" peer0.ecx.cecbs.et peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz"

docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp" peer0.banks.cecbs.et peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz"

docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp" peer0.nbe.cecbs.et peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz"

docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp" peer0.customs.cecbs.et peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz"

docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp" peer0.shipping.cecbs.et peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz"

echo "✓ Installed on all peers"
echo ""

# Get package ID
echo "Getting package ID..."
PACKAGE_ID=$(docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled --output json 2>&1 | grep -o '"package_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get package ID"
    exit 1
fi

echo "✓ Package ID: $PACKAGE_ID"
echo ""

# Step 3: Approve for all orgs
echo "[3/4] Approving for all organizations..."

# Copy orderer TLS cert to all peers first
ORDERER_TLS="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

docker exec peer0.ecta.cecbs.et mkdir -p /var/hyperledger/orderer-tls
docker cp "$ORDERER_TLS" peer0.ecta.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

docker exec peer0.ecx.cecbs.et mkdir -p /var/hyperledger/orderer-tls
docker cp "$ORDERER_TLS" peer0.ecx.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

docker exec peer0.banks.cecbs.et mkdir -p /var/hyperledger/orderer-tls
docker cp "$ORDERER_TLS" peer0.banks.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

docker exec peer0.nbe.cecbs.et mkdir -p /var/hyperledger/orderer-tls
docker cp "$ORDERER_TLS" peer0.nbe.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

docker exec peer0.customs.cecbs.et mkdir -p /var/hyperledger/orderer-tls
docker cp "$ORDERER_TLS" peer0.customs.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

docker exec peer0.shipping.cecbs.et mkdir -p /var/hyperledger/orderer-tls
docker cp "$ORDERER_TLS" peer0.shipping.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

echo "  Approving ECTAMSP..."
docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$CC_SEQUENCE"

echo "  Approving ECXMSP..."
docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="ECXMSP" \
    -e CORE_PEER_ADDRESS="peer0.ecx.cecbs.et:8051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.ecx.cecbs.et \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$CC_SEQUENCE"

echo "  Approving BanksMSP..."
docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="BanksMSP" \
    -e CORE_PEER_ADDRESS="peer0.banks.cecbs.et:9051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.banks.cecbs.et \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$CC_SEQUENCE"

echo "  Approving NBEMSP..."
docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="NBEMSP" \
    -e CORE_PEER_ADDRESS="peer0.nbe.cecbs.et:10051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.nbe.cecbs.et \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$CC_SEQUENCE"

echo "✓ Approved by 4 organizations"
echo ""

# Step 4: Commit
echo "[4/4] Committing chaincode..."

# Copy peer TLS certs for commit
for org in ecta ecx banks nbe customs shipping; do
    PEER_TLS="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
    docker exec peer0.ecta.cecbs.et mkdir -p /var/hyperledger/peer-tls
    docker cp "$PEER_TLS" peer0.ecta.cecbs.et:/var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem
done

docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --sequence "$CC_SEQUENCE" \
        --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.ecta.cecbs.et-cert.pem \
        --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.ecx.cecbs.et-cert.pem \
        --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.banks.cecbs.et-cert.pem \
        --peerAddresses peer0.nbe.cecbs.et:10051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.nbe.cecbs.et-cert.pem \
        --peerAddresses peer0.customs.cecbs.et:11051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.customs.cecbs.et-cert.pem \
        --peerAddresses peer0.shipping.cecbs.et:12051 --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.shipping.cecbs.et-cert.pem

echo "✓ Committed successfully!"
echo ""

# Verify
echo "Verifying deployment..."
sleep 2
docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME"

echo ""
echo "=========================================="
echo "✅ Chaincode Deployed Successfully!"
echo "=========================================="
echo ""
echo "Test with:"
echo "  docker exec peer0.ecta.cecbs.et peer chaincode query -C $CHANNEL -n $CC_NAME -c '{\"Args\":[\"QueryAllExporters\"]}'"
echo ""

# Cleanup
rm -rf "$TMP_DIR"
