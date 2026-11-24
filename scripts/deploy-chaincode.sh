#!/usr/bin/env bash
# Deploy the coffee chaincode (External/CaaS) to all channel peers.
#
# Prerequisites:
#   - Fabric network running (docker-compose-fabric.yml up)
#   - Channel created and all peers joined (create-channel-docker.sh done)
#   - coffee-chaincode container running
#
# Usage: bash scripts/deploy-chaincode.sh [CHAINCODE_VERSION]

set -euo pipefail

CHANNEL_NAME="coffeechannel"
CC_NAME="coffee"
CC_VERSION="${1:-1.11}"
CC_SEQUENCE="1"
CC_LABEL="${CC_NAME}_${CC_VERSION}"
WORK_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACTS_DIR="${WORK_DIR}/blockchain/channel-artifacts"
CHAINCODE_PKG="${ARTIFACTS_DIR}/${CC_LABEL}.tar.gz"

export MSYS_NO_PATHCONV=1

ORDERER_CA="${WORK_DIR}/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

info()    { echo -e "\033[0;36m[INFO]\033[0m  $*"; }
success() { echo -e "\033[0;32m[OK]\033[0m    $*"; }
error()   { echo -e "\033[0;31m[ERROR]\033[0m $*"; exit 1; }

# ── Helpers ───────────────────────────────────────────────────────────────────
peer_exec() {
  local ORG="$1"; local PORT="$2"; local MSPID="$3"
  shift 3
  docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -v "${WORK_DIR}/builders:/builders" \
    -v "${WORK_DIR}/config/core.yaml:/etc/hyperledger/fabric/core.yaml" \
    -w /work \
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="${MSPID}" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/work/blockchain/organizations/peerOrganizations/${ORG}.cecbs.et/peers/peer0.${ORG}.cecbs.et/tls/ca.crt" \
    -e CORE_PEER_MSPCONFIGPATH="/work/blockchain/organizations/peerOrganizations/${ORG}.cecbs.et/users/Admin@${ORG}.cecbs.et/msp" \
    -e CORE_PEER_ADDRESS="peer0.${ORG}.cecbs.et:${PORT}" \
    hyperledger/fabric-tools:2.5 \
    "$@"
}

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
