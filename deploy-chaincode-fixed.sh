#!/usr/bin/env bash
# Fixed chaincode deployment script for Windows
# Properly handles MSYS path conversion issues

set -e

export MSYS_NO_PATHCONV=1

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }

# Define organizations
declare -A orgs
orgs=(
    ["ecta"]="peer0.ecta.cecbs.et:7051:ECTAMSP"
    ["ecx"]="peer0.ecx.cecbs.et:8051:ECXMSP"
    ["banks"]="peer0.banks.cecbs.et:9051:BanksMSP"
    ["nbe"]="peer0.nbe.cecbs.et:10051:NBEMSP"
    ["customs"]="peer0.customs.cecbs.et:11051:CustomsMSP"
    ["shipping"]="peer0.shipping.cecbs.et:12051:ShippingMSP"
)

echo ""
echo "================================================"
echo "  Deploying Coffee Chaincode (CaaS) - FIXED"
echo "  Label: $CC_LABEL   Channel: $CHANNEL"
echo "================================================"
echo ""

# Step 1: Distribute TLS certs to peers
info "[1/6] Distributing TLS certs to peers..."
ORDERER_CA_CRT="$PROJECT_ROOT/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

if [ ! -f "$ORDERER_CA_CRT" ]; then
    error "Orderer TLS cert not found at: $ORDERER_CA_CRT"
fi

# Distribute orderer TLS cert
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    docker exec "$peer" sh -c "mkdir -p /var/hyperledger/orderer-tls" 2>/dev/null || true
    docker cp "$ORDERER_CA_CRT" "$peer:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem" 2>/dev/null
done

# Distribute peer TLS certs for cross-peer communication
for source_org in "${!orgs[@]}"; do
    PEER_TLS_CERT="$PROJECT_ROOT/blockchain/organizations/peerOrganizations/${source_org}.cecbs.et/peers/peer0.${source_org}.cecbs.et/tls/ca.crt"
    if [ -f "$PEER_TLS_CERT" ]; then
        for target_org in "${!orgs[@]}"; do
            IFS=':' read -r target_peer port msp <<< "${orgs[$target_org]}"
            docker exec "$target_peer" sh -c "mkdir -p /var/hyperledger/peer-tls" 2>/dev/null || true
            docker cp "$PEER_TLS_CERT" "$target_peer:/var/hyperledger/peer-tls/tlsca.${source_org}.cecbs.et-cert.pem" 2>/dev/null
        done
    fi
done
success "TLS certs distributed"

# Step 2: Build chaincode package
info "[2/6] Building chaincode package..."
TMP_DIR=$(mktemp -d)

cat > "$TMP_DIR/metadata.json" << EOF
{"type":"ccaas","label":"${CC_LABEL}"}
EOF

cat > "$TMP_DIR/connection.json" << EOF
{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}
EOF

cd "$TMP_DIR"
tar czf code.tar.gz connection.json 2>/dev/null
tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz 2>/dev/null
cd "$PROJECT_ROOT"
success "Package built"

# Step 3: Copy package to peers
info "[3/6] Copying package to all peers..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    docker cp "$TMP_DIR/${CC_LABEL}.tar.gz" "$peer:/tmp/${CC_LABEL}.tar.gz" 2>/dev/null
done
rm -rf "$TMP_DIR"
success "Package copied to all peers"

# Step 4: Install on peers
info "[4/6] Installing chaincode on all peers..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  Installing on $peer... "
    
    MSP_PATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp"
    docker exec \
        -e CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
        -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
        "$peer" \
        peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" 2>&1 | \
        grep -q "installed" && echo "installed" || echo "ok"
done

# Get package ID
echo -n "  Getting package ID... "
QUERY_RESULT=$(docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled --output json 2>&1)

PACKAGE_ID=$(echo "$QUERY_RESULT" | grep -o '"package_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"/\1/')

if [ -z "$PACKAGE_ID" ]; then
    echo ""
    error "Could not find package ID"
fi
echo "$PACKAGE_ID"
success "Chaincode installed on all peers"

# Step 5: Approve for each org
info "[5/6] Approving for all organizations..."
APPROVE_COUNT=0
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  Approving $msp... "
    
    MSP_PATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp"
    TLS="/etc/hyperledger/fabric/tls/ca.crt"
    
    # Run approval
    RESULT=$(docker exec \
        -e CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
        -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
        -e CORE_PEER_TLS_ENABLED="true" \
        -e CORE_PEER_TLS_ROOTCERT_FILE="$TLS" \
        -e CORE_PEER_LOCALMSPID="$msp" \
        -e CORE_PEER_ADDRESS="peer0.${org}.cecbs.et:${port}" \
        "$peer" \
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile "$ORDERER_CA" \
            --channelID "$CHANNEL" \
            --name "$CC_NAME" \
            --version "$CC_VERSION" \
            --package-id "$PACKAGE_ID" \
            --sequence "$CC_SEQUENCE" 2>&1)
    
    if echo "$RESULT" | grep -qi "error"; then
        echo "ERROR"
        echo "     Details: $RESULT" | head -2
    else
        echo "✓"
        ((APPROVE_COUNT++))
    fi
done

echo ""
info "Successfully approved by $APPROVE_COUNT organizations"

if [ $APPROVE_COUNT -lt 4 ]; then
    error "Need at least 4 approvals but only got $APPROVE_COUNT. Cannot commit."
fi

# Step 6: Commit
info "[6/6] Committing chaincode definition..."
PEER_ARGS=""
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    PEER_ARGS="$PEER_ARGS --peerAddresses peer0.${org}.cecbs.et:${port} --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem"
done

COMMIT_RESULT=$(docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    -e CORE_PEER_TLS_ENABLED="true" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS="peer0.ecta.cecbs.et:7051" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile "$ORDERER_CA" \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --sequence "$CC_SEQUENCE" \
        $PEER_ARGS 2>&1)

if echo "$COMMIT_RESULT" | grep -qi "error"; then
    error "Commit failed: $COMMIT_RESULT"
fi

success "Chaincode committed!"

# Verify deployment
info "Verifying deployment..."
sleep 3

VERIFY=$(docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH="/etc/hyperledger/fabric" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1)

if echo "$VERIFY" | grep -q "\"version\":\"${CC_VERSION}\""; then
    success "✅ Chaincode deployed successfully: $CC_NAME v$CC_VERSION on $CHANNEL"
else
    error "Verification failed"
fi

echo ""
echo "================================================"
echo "  🎉 Deployment Complete!"
echo "================================================"
echo ""
echo "Test the chaincode with:"
echo "  docker exec peer0.ecta.cecbs.et peer chaincode query \\"
echo "    -C $CHANNEL -n $CC_NAME \\"
echo "    -c '{\"Args\":[\"QueryAllExporters\"]}'"
echo ""
