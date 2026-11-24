#!/usr/bin/env bash
# Full coffee chaincode lifecycle deployment (CaaS) for coffeechannel
# Run via: scripts\run-bash.bat  (from repo root)
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CC_LABEL="${CC_NAME}_${CC_VERSION}"
# Use // prefix on absolute paths to prevent Git Bash MSYS path conversion
ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

# Run a command inside a peer container, blocking MSYS path conversion via // prefix
peer_exec() {
  local org=$1; shift
  local port=${ORG_PORT[$org]}
  local msp=${ORG_MSP[$org]}
  local container="peer0.${org}.cecbs.et"
  docker exec \
    -e "FABRIC_CFG_PATH=//etc/hyperledger/fabric" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=${msp}" \
    -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port}" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
    "$container" "$@"
}

echo ""
echo "================================================"
echo "  Coffee Chaincode Deployment (CaaS)"
echo "  Label: ${CC_LABEL}   Channel: ${CHANNEL}"
echo "================================================"
echo ""

# ── 1. Distribute orderer TLS CA ──────────────────────────────────────────────
info "[1/6] Distributing orderer TLS CA cert..."
# Use windows-style path for docker cp (avoids MSYS conversion issues)
ORDERER_CA_HOST="C:/goCBC/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"
for org in "${ORGS[@]}"; do
  docker exec "peer0.${org}.cecbs.et" mkdir -p /var/hyperledger/orderer-tls 2>/dev/null || true
  docker cp "$ORDERER_CA_HOST" "peer0.${org}.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
done
ok "TLS cert distributed"

# ── 2. Build chaincode package ────────────────────────────────────────────────
info "[2/6] Building chaincode package..."
# Build in the blockchain/channel-artifacts dir so docker cp can find it via Windows path
PKG_DIR="C:/goCBC/blockchain/channel-artifacts"
mkdir -p "$PKG_DIR"
printf '{"type":"ccaas","label":"%s"}' "$CC_LABEL" > "/c/goCBC/blockchain/channel-artifacts/metadata.json"
printf '{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}' > "/c/goCBC/blockchain/channel-artifacts/connection.json"
(cd "/c/goCBC/blockchain/channel-artifacts" \
  && tar czf code.tar.gz connection.json \
  && tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz \
  && rm -f metadata.json connection.json code.tar.gz)
PKG_LOCAL="${PKG_DIR}/${CC_LABEL}.tar.gz"
ok "Package: $PKG_LOCAL"

# ── 3. Install on each peer ───────────────────────────────────────────────────
info "[3/6] Installing chaincode on all peers..."
for org in "${ORGS[@]}"; do
  container="peer0.${org}.cecbs.et"
  docker cp "$PKG_LOCAL" "${container}:/tmp/${CC_LABEL}.tar.gz"
  out=$(peer_exec "$org" peer lifecycle chaincode install "//tmp/${CC_LABEL}.tar.gz" 2>&1 || true)
  if echo "$out" | grep -q "already been installed"; then
    warn "  ${container}: already installed"
  elif echo "$out" | grep -qi "error"; then
    echo -e "${RED}  ${container}: FAILED — $out${NC}"; exit 1
  else
    ok "  ${container}: installed"
  fi
done

# Get package ID
PKG_ID=$(peer_exec ecta peer lifecycle chaincode queryinstalled --output json 2>/dev/null \
  | grep -o '"package_id":"[^"]*"' | grep "$CC_LABEL" | cut -d'"' -f4 | head -1)
[[ -z "$PKG_ID" ]] && { echo -e "${RED}ERROR: could not get package ID${NC}"; exit 1; }
ok "Package ID: $PKG_ID"

# ── 4. Approve for each org ───────────────────────────────────────────────────
info "[4/6] Approving for all organizations..."
for org in "${ORGS[@]}"; do
  msp=${ORG_MSP[$org]}
  echo -n "  Approving ${msp}... "
  out=$(peer_exec "$org" peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL" \
    --name "$CC_NAME" \
    --version "$CC_VERSION" \
    --package-id "$PKG_ID" \
    --sequence $CC_SEQUENCE 2>&1 || true)
  if echo "$out" | grep -qi "^Error"; then
    echo -e "${YELLOW}WARN: ${out}${NC}"
  else
    echo -e "${GREEN}done${NC}"
  fi
done

# ── 5. Check readiness ────────────────────────────────────────────────────────
info "[5/6] Checking commit readiness..."
peer_exec ecta peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence $CC_SEQUENCE --output json 2>&1 | \
  grep -E '"[A-Z]+MSP"' | head -12 || true

# ── 6. Commit ─────────────────────────────────────────────────────────────────
info "[6/6] Committing chaincode..."
# Copy each org's TLS CA into the ecta container so the commit can verify all peer TLS certs
info "  Staging per-org TLS certs..."
PKG_STAGE="C:/goCBC/blockchain/channel-artifacts"
for org in "${ORGS[@]}"; do
  docker cp "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/tls/ca.crt" "${PKG_STAGE}/tls-${org}.crt"
  docker cp "${PKG_STAGE}/tls-${org}.crt" "peer0.ecta.cecbs.et:/tmp/tls-${org}.crt"
done
ok "TLS certs staged"

PEER_ARGS=()
for org in "${ORGS[@]}"; do
  PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
  PEER_ARGS+=(--tlsRootCertFiles "//tmp/tls-${org}.crt")
done

peer_exec ecta peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile "$ORDERER_CA" \
  --channelID "$CHANNEL" \
  --name "$CC_NAME" \
  --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE \
  "${PEER_ARGS[@]}"

ok "Committed!"

# Verify
peer_exec ecta peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ${CC_NAME} v${CC_VERSION} deployed on ${CHANNEL}!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Enable blockchain in api/.env:"
echo "  Change: FABRIC_ENABLED=false"
echo "  To:     FABRIC_ENABLED=true"
echo ""
echo "NOTE: docker-compose-fabric.yml coffee-chaincode service must have:"
echo "  CORE_CHAINCODE_ID_NAME=\${PKG_ID}"
echo "  (run: scripts/restart-chaincode.bat after deploying a new version)"
