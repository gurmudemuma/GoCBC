#!/usr/bin/env bash
# Upgrade coffee chaincode to v1.12 (adds ECX functions) — sequence 2
set -euo pipefail
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL="coffeechannel"
CC_NAME="coffee"
CC_VERSION="1.12"
CC_SEQUENCE=2
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER_CA="//var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
PKG_STAGE="C:/goCBC/blockchain/channel-artifacts"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

peer_exec() {
  local org=$1; shift
  docker exec \
    -e "FABRIC_CFG_PATH=//etc/hyperledger/fabric" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=${ORG_MSP[$org]}" \
    -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${ORG_PORT[$org]}" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=//etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=//etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
    "peer0.${org}.cecbs.et" "$@"
}

echo ""
echo "================================================"
echo "  Coffee Chaincode Upgrade v${CC_VERSION} (seq ${CC_SEQUENCE})"
echo "  Adds: ECX lot management functions"
echo "================================================"
echo ""

# 1. Build new package with updated connection
info "[1/5] Building package ${CC_LABEL}..."
printf '{"type":"ccaas","label":"%s"}' "$CC_LABEL" > "/c/goCBC/blockchain/channel-artifacts/metadata.json"
printf '{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}' > "/c/goCBC/blockchain/channel-artifacts/connection.json"
(cd "/c/goCBC/blockchain/channel-artifacts" \
  && tar czf code.tar.gz connection.json \
  && tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz \
  && rm -f metadata.json connection.json code.tar.gz)
ok "Package built: ${PKG_STAGE}/${CC_LABEL}.tar.gz"

# 2. Install on all peers
info "[2/5] Installing ${CC_LABEL} on all peers..."
for org in "${ORGS[@]}"; do
  container="peer0.${org}.cecbs.et"
  docker exec "$container" mkdir -p /tmp
  docker cp "${PKG_STAGE}/${CC_LABEL}.tar.gz" "${container}:/tmp/${CC_LABEL}.tar.gz"
  out=$(peer_exec "$org" peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" 2>&1 || true)
  if echo "$out" | grep -q "already been installed"; then
    echo "  ${container}: already installed"
  elif echo "$out" | grep -qi "error"; then
    echo -e "${RED}  ${container}: FAILED — $out${NC}"; exit 1
  else
    ok "  ${container}: installed"
  fi
done

# 3. Get package ID
PKG_ID=$(peer_exec ecta peer lifecycle chaincode queryinstalled --output json 2>/dev/null \
  | grep -o '"package_id":"[^"]*"' | grep "$CC_LABEL" | cut -d'"' -f4 | head -1)
[[ -z "$PKG_ID" ]] && { echo -e "${RED}ERROR: could not get package ID${NC}"; exit 1; }
ok "Package ID: $PKG_ID"

# 4. Approve for all orgs
info "[3/5] Approving sequence ${CC_SEQUENCE} for all orgs..."
for org in "${ORGS[@]}"; do
  echo -n "  ${ORG_MSP[$org]}... "
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

# 5. Check readiness
info "[4/5] Checking commit readiness..."
peer_exec ecta peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --version "$CC_VERSION" --sequence $CC_SEQUENCE --output json 2>&1

# 6. Copy per-org TLS certs and commit
info "[5/5] Committing sequence ${CC_SEQUENCE}..."
for org in "${ORGS[@]}"; do
  docker cp "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/tls/ca.crt" "${PKG_STAGE}/tls-${org}.crt"
  docker cp "${PKG_STAGE}/tls-${org}.crt" "peer0.ecta.cecbs.et:/tmp/tls-${org}.crt"
done

PEER_ARGS=()
for org in "${ORGS[@]}"; do
  PEER_ARGS+=(--peerAddresses "peer0.${org}.cecbs.et:${ORG_PORT[$org]}")
  PEER_ARGS+=(--tlsRootCertFiles "//tmp/tls-${org}.crt")
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

if echo "$out" | grep -qi "already been committed\|committed successfully\|status:200\|VALID"; then
  ok "Committed!"
elif echo "$out" | grep -qi "^Error"; then
  echo -e "${RED}Commit failed: $out${NC}"; exit 1
else
  ok "Committed!"
  echo "$out"
fi

# Verify
info "Verifying..."
peer_exec ecta peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>&1

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  coffee v${CC_VERSION} (seq ${CC_SEQUENCE}) deployed!${NC}"
echo -e "${GREEN}  ECX functions now available on-chain.${NC}"
echo -e "${GREEN}================================================${NC}"

# Update docker-compose CORE_CHAINCODE_ID_NAME
echo ""
echo "Update docker-compose-fabric.yml CORE_CHAINCODE_ID_NAME to: $PKG_ID"
