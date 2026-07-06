#!/usr/bin/env bash
# Approve + commit coffee chaincode for all orgs
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

# The package ID obtained from queryinstalled
PKG_ID="coffee_1.11:5b88e02ae2c89bb4dd97cbd582c6a75b4364467667550fb172edede01b35e40d"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

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
echo "Package ID: $PKG_ID"
echo ""

# ── Approve for each org ──────────────────────────────────────────────────────
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
  if echo "$out" | grep -qi "already been approved\|status:200"; then
    echo -e "${YELLOW}(already approved)${NC}"
  elif echo "$out" | grep -qi "^Error"; then
    echo -e "${YELLOW}WARN: ${out}${NC}"
  else
    echo -e "${GREEN}done${NC}"
    echo "    $out"
  fi
done

# ── Check readiness ───────────────────────────────────────────────────────────
info "[5/6] Checking commit readiness..."
peer_exec ecta peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence $CC_SEQUENCE --output json 2>&1

# ── Commit ────────────────────────────────────────────────────────────────────
info "[6/6] Committing chaincode..."
PEER_ARGS=()
for org in "${ORGS[@]}"; do
  PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
  PEER_ARGS+=(--tlsRootCertFiles "//etc/hyperledger/fabric/tls/ca.crt")
done

out=$(peer_exec ecta peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile "$ORDERER_CA" \
  --channelID "$CHANNEL" \
  --name "$CC_NAME" \
  --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE \
  "${PEER_ARGS[@]}" 2>&1 || true)

if echo "$out" | grep -qi "already been committed\|committed successfully\|status:200"; then
  ok "Chaincode committed (or already committed)"
elif echo "$out" | grep -qi "^Error"; then
  echo -e "${RED}Commit error: $out${NC}"
  exit 1
else
  ok "Committed!"
  echo "$out"
fi

# Verify
info "Verifying commit..."
peer_exec ecta peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  coffee v1.11 fully deployed on coffeechannel!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next: set FABRIC_ENABLED=true in api/.env and restart the API."
