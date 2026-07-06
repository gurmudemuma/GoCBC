#!/usr/bin/env bash
# Approve and commit coffee chaincode on coffeechannel
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.12"
CC_SEQUENCE=2
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

# Use docker exec with env vars passed as KEY=VALUE strings using //path to block MSYS conversion
peer_exec() {
  local org=$1; shift
  local port=${ORG_PORT[$org]}
  local msp=${ORG_MSP[$org]}
  local container="peer0.${org}.cecbs.et"
  # Use //etc/... to prevent Git Bash path conversion; Docker sees /etc/...
  docker exec \
    -e "FABRIC_CFG_PATH=//etc/hyperledger/fabric" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=${msp}" \
    -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port}" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
    "$container" "$@"
}

# ── 1. Get package ID ──────────────────────────────────────────────────────────
info "[1/3] Getting installed package ID..."
PKG_JSON=$(peer_exec ecta peer lifecycle chaincode queryinstalled --output json 2>&1)
PKG_ID=$(printf '%s
' "$PKG_JSON" | awk '
  /"label": "coffee_1.12"/ { in_target=1; next }
  in_target && /"package_id"/ {
    gsub(/.*"package_id": "/, "")
    gsub(/".*/, "")
    print
    exit
  }
')
[[ -z "$PKG_ID" ]] && { echo -e "${RED}ERROR: no package ID found. Output: ${PKG_JSON}${NC}"; exit 1; }
ok "Package ID: $PKG_ID"

# ── 2. Approve for each org ────────────────────────────────────────────────────
info "[2/3] Approving for all organizations..."
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
    echo -e "${GREEN}approved${NC}"
  fi
done

# ── Check readiness ────────────────────────────────────────────────────────────
info "Checking commit readiness..."
peer_exec ecta peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence $CC_SEQUENCE --output json 2>&1 | \
  grep -E 'MSP|true|false' || true

# ── 3. Commit ──────────────────────────────────────────────────────────────────
info "[3/3] Committing chaincode definition..."
PEER_ARGS=()
for org in "${ORGS[@]}"; do
  PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
  PEER_ARGS+=(--tlsRootCertFiles "//etc/hyperledger/fabric/tls/ca.crt")
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

# ── Verify ─────────────────────────────────────────────────────────────────────
info "Verifying..."
peer_exec ecta peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ${CC_NAME} v${CC_VERSION} deployed on ${CHANNEL}!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next: set FABRIC_ENABLED=true in api/.env then restart the API."
