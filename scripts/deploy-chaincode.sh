#!/usr/bin/env bash
# Deploy coffee chaincode (External CaaS) to coffeechannel
# Runs lifecycle commands INSIDE peer containers (so externalBuilders config is active)
#
# Prerequisites:
#   - Fabric network running (docker-compose-fabric.yml up)
#   - Channel created and peers joined
#   - coffee-chaincode container running
#
# Usage: ./scripts/deploy-chaincode.sh

set -e

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
echo "  Deploying Coffee Chaincode (CaaS)"
echo "  Label: $CC_LABEL   Channel: $CHANNEL"
echo "================================================"

# Step 1: Distribute TLS certs to peers
info "[1/5] Distributing TLS certs to peers..."
ORDERER_CA_CRT="$PROJECT_ROOT/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

[ ! -f "$ORDERER_CA_CRT" ] && error "Orderer TLS cert not found at: $ORDERER_CA_CRT"

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
success "Done"

# Step 2: Build chaincode package
info "[2/5] Building chaincode package..."
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
success "Done"

# Step 3: Copy package to peers
info "[3/5] Copying package to all peers..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    docker cp "$TMP_DIR/${CC_LABEL}.tar.gz" "$peer:/tmp/${CC_LABEL}.tar.gz" 2>/dev/null
done
rm -rf "$TMP_DIR"
success "Done"

# Step 4: Install on peers
info "[4/5] Installing chaincode on all peers..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  Installing on $peer... "
    
    MSP_PATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp"
    MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        "$peer" \
        peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" 2>&1 | \
        grep -q "installed" && echo "installed" || echo "done"
done

# Get package ID
echo -n "  Getting package ID... "
QUERY_RESULT=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled --output json 2>&1)

PACKAGE_ID=$(echo "$QUERY_RESULT" | grep -o '"package_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"/\1/')

[ -z "$PACKAGE_ID" ] && {
    echo ""
    error "Could not find package ID. Query output: $QUERY_RESULT"
}
echo "$PACKAGE_ID"
success "Done"

# Step 5: Approve for each org
info "[5/5] Approving and committing..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  Approving $msp... "
    
    MSP_PATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp"
    TLS="/etc/hyperledger/fabric/tls/ca.crt"
    
    MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="$MSP_PATH" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        -e CORE_PEER_TLS_ENABLED=true \
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
            --sequence "$CC_SEQUENCE" 2>&1 | \
            grep -q "Error" && echo "error" || echo "approved"
done

# Commit
echo -n "  Committing... "
PEER_ARGS=""
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    PEER_ARGS="$PEER_ARGS --peerAddresses peer0.${org}.cecbs.et:${port} --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem"
done

MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
        -o orderer.cecbs.et:7050 \
        --ordererTLSHostnameOverride orderer.cecbs.et \
        --tls --cafile "$ORDERER_CA" \
        --channelID "$CHANNEL" \
        --name "$CC_NAME" \
        --version "$CC_VERSION" \
        --sequence "$CC_SEQUENCE" \
        $PEER_ARGS 2>&1 | grep -q "Error" && error "Failed" || echo "committed"

# Verify
sleep 3
VERIFY=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1)

echo "$VERIFY" | grep -q "\"version\":\"${CC_VERSION}\"" && \
    success "Chaincode deployed: $CC_NAME v$CC_VERSION on $CHANNEL" || \
    error "Verification failed"

echo ""
echo "================================================"
echo "  Deployment Complete!"
echo "================================================"
echo ""
echo "════════════════════════════════════════════"
echo "  Deploying Coffee Chaincode (CaaS)"
echo "  Label: ${CC_LABEL}  Channel: ${CHANNEL_NAME}"
echo "════════════════════════════════════════════"
echo ""

# ── Step 1: Package ───────────────────────────────────────────────────────────
info "[1/6] Packaging chaincode..."
mkdir -p "${ARTIFACTS_DIR}"

# Build the connection + metadata package
TMP_PKG_DIR=$(mktemp -d)
mkdir -p "${TMP_PKG_DIR}/META-INF/statedb/couchdb/indexes"

# metadata.json — use the CaaS builder type expected by this Fabric setup
cat > "${TMP_PKG_DIR}/metadata.json" <<EOF
{"type":"ccaas","label":"${CC_LABEL}"}
EOF

# connection.json — uses the Docker service hostname
cat > "${TMP_PKG_DIR}/connection.json" <<EOF
{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}
EOF

cd "${TMP_PKG_DIR}"
tar czf code.tar.gz connection.json
tar czf "${CHAINCODE_PKG}" metadata.json code.tar.gz
cd "${WORK_DIR}"
rm -rf "${TMP_PKG_DIR}"
success "Package created: ${CHAINCODE_PKG}"

# ── Step 2: Install on all peers ──────────────────────────────────────────────
info "[2/6] Installing chaincode on all peers..."

declare -A ORGS=(
  [ecta]="7051:ECTAMSP"
  [ecx]="8051:ECXMSP"
  [banks]="9051:BanksMSP"
  [nbe]="10051:NBEMSP"
  [customs]="11051:CustomsMSP"
  [shipping]="12051:ShippingMSP"
)

declare -A PACKAGE_IDS

for ORG in "${!ORGS[@]}"; do
  IFS=':' read -r PORT MSPID <<< "${ORGS[$ORG]}"
  info "  Installing on peer0.${ORG}.cecbs.et ..."
  peer_exec "${ORG}" "${PORT}" "${MSPID}" \
    peer lifecycle chaincode install "/work/blockchain/channel-artifacts/${CC_LABEL}.tar.gz"
  
  # Get package ID
  RESULT=$(peer_exec "${ORG}" "${PORT}" "${MSPID}" \
    peer lifecycle chaincode queryinstalled --output json 2>/dev/null)
  PKG_ID=$(echo "${RESULT}" | grep -o "\"package_id\":\"[^\"]*\"" | grep "${CC_LABEL}" | cut -d'"' -f4 | head -1)
  PACKAGE_IDS[$ORG]="${PKG_ID}"
  success "  Installed on ${ORG}: ${PKG_ID}"
done

# Use the first package ID (they're all the same hash)
PACKAGE_ID="${PACKAGE_IDS[ecta]}"
info "Package ID: ${PACKAGE_ID}"

# ── Step 3: Approve for each org ──────────────────────────────────────────────
info "[3/6] Approving chaincode for each organization..."

for ORG in "${!ORGS[@]}"; do
  IFS=':' read -r PORT MSPID <<< "${ORGS[$ORG]}"
  info "  Approving for ${MSPID}..."
  peer_exec "${ORG}" "${PORT}" "${MSPID}" \
    peer lifecycle chaincode approveformyorg \
      -o orderer.cecbs.et:7050 \
      --ordererTLSHostnameOverride orderer.cecbs.et \
      --tls \
      --cafile "/work/${ORDERER_CA}" \
      --channelID "${CHANNEL_NAME}" \
      --name "${CC_NAME}" \
      --version "${CC_VERSION}" \
      --package-id "${PACKAGE_ID}" \
      --sequence "${CC_SEQUENCE}"
  success "  Approved: ${MSPID}"
done

# ── Step 4: Check commit readiness ────────────────────────────────────────────
info "[4/6] Checking commit readiness..."
peer_exec "ecta" "7051" "ECTAMSP" \
  peer lifecycle chaincode checkcommitreadiness \
    --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" \
    --version "${CC_VERSION}" \
    --sequence "${CC_SEQUENCE}" \
    --output json

# ── Step 5: Commit ────────────────────────────────────────────────────────────
info "[5/6] Committing chaincode definition..."

PEER_ARGS=""
for ORG in "${!ORGS[@]}"; do
  IFS=':' read -r PORT MSPID <<< "${ORGS[$ORG]}"
  PEER_ARGS="${PEER_ARGS} --peerAddresses peer0.${ORG}.cecbs.et:${PORT}"
  PEER_ARGS="${PEER_ARGS} --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/${ORG}.cecbs.et/peers/peer0.${ORG}.cecbs.et/tls/ca.crt"
done

# Run commit from ECTA admin context
peer_exec "ecta" "7051" "ECTAMSP" \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls \
    --cafile "/work/${ORDERER_CA}" \
    --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" \
    --version "${CC_VERSION}" \
    --sequence "${CC_SEQUENCE}" \
    ${PEER_ARGS}

success "Chaincode committed!"

# ── Step 6: Verify ────────────────────────────────────────────────────────────
info "[6/6] Verifying deployment..."
peer_exec "ecta" "7051" "ECTAMSP" \
  peer lifecycle chaincode querycommitted \
    --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" \
    --output json

echo ""
echo "════════════════════════════════════════════"
echo "  Chaincode deployed successfully!"
echo "  Name: ${CC_NAME}  Version: ${CC_VERSION}"
echo "════════════════════════════════════════════"
echo ""
echo "Initialize the ledger:"
echo "  docker exec peer0.ecta.cecbs.et peer chaincode invoke \\"
echo "    -o orderer.cecbs.et:7050 --tls --cafile /path/to/orderer-ca.crt \\"
echo "    -C ${CHANNEL_NAME} -n ${CC_NAME} -c '{\"function\":\"InitLedger\",\"Args\":[]}'"
echo ""
