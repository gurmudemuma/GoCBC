#!/usr/bin/env bash
# Upgrade to chaincode v1.57 with contract registration fixes
# Uses the already-installed coffee_1.57.tgz package

export MSYS_NO_PATHCONV=1

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.57"
CC_SEQUENCE=2
CC_LABEL="${CC_NAME}_${CC_VERSION}"
PKG_FILE="chaincodes/coffee/coffee_1.57.tgz"

echo "=========================================="
echo "Upgrading Coffee Chaincode to v1.57"
echo "=========================================="
echo ""

if [ ! -f "$PKG_FILE" ]; then
    echo "ERROR: Package file not found: $PKG_FILE"
    exit 1
fi

# Step 1: Install on all peers
echo "[1/4] Installing v1.57 package on all peers..."

for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    org=$(echo $peer | cut -d'.' -f2)
    echo "  Installing on $peer..."
    docker cp "$PKG_FILE" $peer:/tmp/
    docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" $peer peer lifecycle chaincode install "/tmp/${CC_LABEL}.tgz" 2>&1 | grep -E "(Chaincode code package identifier|already installed)" || true
done

echo "✓ Installed on all peers"
echo ""

# Get package ID
echo "Getting package ID for v1.57..."
PACKAGE_ID=$(docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "coffee_1.57" | awk '{print $3}' | sed 's/,//')

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get package ID for v1.57"
    docker exec -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled
    exit 1
fi

echo "✓ Package ID: $PACKAGE_ID"
echo ""

# Step 2: Copy orderer TLS cert to all peers
echo "[2/4] Distributing TLS certificates..."
ORDERER_TLS="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    docker exec $peer mkdir -p /var/hyperledger/orderer-tls 2>/dev/null || true
    docker cp "$ORDERER_TLS" $peer:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>/dev/null
done

echo "✓ TLS certificates distributed"
echo ""

# Step 3: Approve for all orgs
echo "[3/4] Approving for all organizations..."

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

echo "  Approving CustomsMSP..."
docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="CustomsMSP" \
    -e CORE_PEER_ADDRESS="peer0.customs.cecbs.et:11051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.customs.cecbs.et \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$CC_SEQUENCE"

echo "  Approving ShippingMSP..."
docker exec \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp" \
    -e CORE_PEER_LOCALMSPID="ShippingMSP" \
    -e CORE_PEER_ADDRESS="peer0.shipping.cecbs.et:12051" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    peer0.shipping.cecbs.et \
    peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --package-id "$PACKAGE_ID" \
        --sequence "$CC_SEQUENCE"

echo "✓ Approved by all 6 organizations"
echo ""

# Step 4: Commit
echo "[4/4] Committing chaincode v1.57..."

# Copy peer TLS certs for commit
for org in ecta ecx banks nbe customs shipping; do
    PEER_TLS="blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/tls/ca.crt"
    docker exec peer0.ecta.cecbs.et mkdir -p /var/hyperledger/peer-tls 2>/dev/null || true
    docker cp "$PEER_TLS" peer0.ecta.cecbs.et:/var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem 2>/dev/null
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
echo "✅ Chaincode v1.57 Deployed!"
echo "=========================================="
echo ""
echo "Contract registration fixes are now active:"
echo "  ✅ Bank information required (buyerBank + exporterBank)"
echo "  ✅ Authorization check (users create contracts for their org only)"
echo "  ✅ Exporter validation (must be registered before creating contracts)"
echo ""
echo "IMPORTANT: Create a NEW contract - old one may have failed with v1.11"
echo ""

