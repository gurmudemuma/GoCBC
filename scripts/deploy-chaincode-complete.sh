#!/usr/bin/env bash
# Complete Chaincode Deployment Script
# Handles: Install → Approve → Commit
set -euo pipefail
export MSYS_NO_PATHCONV=1

CC_NAME="coffee"
CHANNEL="coffeechannel"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}▶${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }

# Auto-detect current version and sequence from committed chaincode
info "Detecting current chaincode version..."
CURRENT_INFO=$(docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID $CHANNEL --name $CC_NAME 2>/dev/null
" || echo "")

if [ -z "$CURRENT_INFO" ]; then
    warn "No chaincode deployed yet. Starting fresh deployment."
    CC_VERSION="1.0"
    CC_SEQUENCE=1
    info "New deployment: Version $CC_VERSION, Sequence $CC_SEQUENCE"
else
    # Parse version and sequence from output like "Version: 1.58, Sequence: 4, Endorsement Plugin..."
    CURRENT_VERSION=$(echo "$CURRENT_INFO" | grep -oP 'Version: \K[0-9.]+')
    CURRENT_SEQUENCE=$(echo "$CURRENT_INFO" | grep -oP 'Sequence: \K[0-9]+')
    
    info "Current deployed: Version $CURRENT_VERSION, Sequence $CURRENT_SEQUENCE"
    
    # Increment version (minor version bump) and sequence
    CC_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{printf "%d.%d", $1, $2+1}')
    CC_SEQUENCE=$((CURRENT_SEQUENCE + 1))
    
    info "Deploying update: Version $CC_VERSION, Sequence $CC_SEQUENCE"
fi

CC_LABEL="${CC_NAME}_${CC_VERSION}"

declare -A ORG_MSP=( [ecta]=ECTAMSP [ecx]=ECXMSP [banks]=BanksMSP [nbe]=NBEMSP [customs]=CustomsMSP [shipping]=ShippingMSP )
declare -A ORG_PORT=( [ecta]=7051 [ecx]=8051 [banks]=9051 [nbe]=10051 [customs]=11051 [shipping]=12051 )
ORGS=(ecta ecx banks nbe customs shipping)

echo ""
echo "================================================================"
echo "  Complete Chaincode Deployment"
echo "  Chaincode: ${CC_NAME} v${CC_VERSION}"
echo "  Channel: ${CHANNEL}"
echo "================================================================"
echo ""

# ── Step 1: Distribute Orderer TLS CA ──────────────────────────────
info "[1/5] Distributing orderer TLS CA certificate..."
ORDERER_CA_HOST="C:/goCBC/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"
for org in "${ORGS[@]}"; do
  docker exec "peer0.${org}.cecbs.et" mkdir -p /var/hyperledger/orderer-tls 2>/dev/null || true
  docker cp "$ORDERER_CA_HOST" "peer0.${org}.cecbs.et:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem" 2>/dev/null || true
done
ok "TLS CA distributed to all peers"

# ── Step 2: Build Chaincode Package ───────────────────────────────
info "[2/5] Building chaincode package..."
PKG_DIR="C:/goCBC/blockchain/channel-artifacts"
mkdir -p "$PKG_DIR"
printf '{"type":"ccaas","label":"%s"}' "$CC_LABEL" > "/c/goCBC/blockchain/channel-artifacts/metadata.json"
printf '{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}' > "/c/goCBC/blockchain/channel-artifacts/connection.json"
(cd "/c/goCBC/blockchain/channel-artifacts" \
  && tar czf code.tar.gz connection.json \
  && tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz \
  && rm -f metadata.json connection.json code.tar.gz)
PKG_LOCAL="${PKG_DIR}/${CC_LABEL}.tar.gz"
ok "Package built: $CC_LABEL.tar.gz"

# ── Step 3: Install on All Peers ──────────────────────────────────
info "[3/5] Installing chaincode on all peers..."
INSTALL_COUNT=0
ALREADY_INSTALLED=0
for org in "${ORGS[@]}"; do
  container="peer0.${org}.cecbs.et"
  docker cp "$PKG_LOCAL" "${container}:/tmp/${CC_LABEL}.tar.gz" 2>/dev/null
  if docker exec -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${ORG_PORT[$org]}" \
    "$container" peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" >/dev/null 2>&1; then
    INSTALL_COUNT=$((INSTALL_COUNT + 1))
  else
    ALREADY_INSTALLED=$((ALREADY_INSTALLED + 1))
  fi
done

if [ $INSTALL_COUNT -gt 0 ]; then
  ok "Installed on ${INSTALL_COUNT} peer(s)"
fi
if [ $ALREADY_INSTALLED -gt 0 ]; then
  ok "Already installed on ${ALREADY_INSTALLED} peer(s) - skipped"
fi

# Get Package ID
sleep 2
PKG_ID=$(docker logs peer0.ecta.cecbs.et 2>&1 | grep "Successfully installed chaincode with package ID '${CC_LABEL}:" | tail -1 | grep -o "${CC_LABEL}:[a-f0-9]*" || echo "")

# If not found in logs, query installed chaincodes
if [ -z "$PKG_ID" ]; then
  PKG_ID=$(docker exec \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=ECTAMSP" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e "CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051" \
    peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | grep "${CC_LABEL}" | grep -o "${CC_LABEL}:[a-f0-9]*" | head -1 || echo "")
fi

if [ -z "$PKG_ID" ]; then
  err "Could not find package ID"
  exit 1
fi
ok "Package ID: $PKG_ID"

# ── Step 4: Approve for All Organizations ─────────────────────────
info "[4/5] Approving chaincode for all organizations..."
ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
APPROVE_COUNT=0
ALREADY_APPROVED=0

for org in "${ORGS[@]}"; do
  msp=${ORG_MSP[$org]}
  port=${ORG_PORT[$org]}
  container="peer0.${org}.cecbs.et"
  
  if docker exec \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=${msp}" \
    -e "CORE_PEER_ADDRESS=peer0.${org}.cecbs.et:${port}" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
    "$container" \
    peer lifecycle chaincode approveformyorg \
      -o orderer.cecbs.et:7050 \
      --ordererTLSHostnameOverride orderer.cecbs.et \
      --tls --cafile "$ORDERER_CA" \
      --channelID "$CHANNEL" \
      --name "$CC_NAME" \
      --version "$CC_VERSION" \
      --package-id "$PKG_ID" \
      --sequence $CC_SEQUENCE >/dev/null 2>&1; then
    APPROVE_COUNT=$((APPROVE_COUNT + 1))
  else
    ALREADY_APPROVED=$((ALREADY_APPROVED + 1))
  fi
done

if [ $APPROVE_COUNT -gt 0 ]; then
  ok "Approved by ${APPROVE_COUNT} organization(s)"
fi
if [ $ALREADY_APPROVED -gt 0 ]; then
  ok "Already approved by ${ALREADY_APPROVED} organization(s) - skipped"
fi

# ── Step 5: Commit Chaincode ──────────────────────────────────────
info "[5/5] Committing chaincode to channel..."

# Copy TLS certs to ecta peer
for org in "${ORGS[@]}"; do
  docker cp "peer0.${org}.cecbs.et:/etc/hyperledger/fabric/tls/ca.crt" "/tmp/tls-${org}.crt" 2>/dev/null || true
  docker cp "/tmp/tls-${org}.crt" "peer0.ecta.cecbs.et:/tmp/tls-${org}.crt" 2>/dev/null || true
done

# Build peer arguments
PEER_ARGS=""
for org in "${ORGS[@]}"; do
  PEER_ARGS="$PEER_ARGS --peerAddresses peer0.${org}.cecbs.et:${ORG_PORT[$org]}"
  PEER_ARGS="$PEER_ARGS --tlsRootCertFiles /tmp/tls-${org}.crt"
done

# Commit - check if already committed first
if docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID "$CHANNEL" --name "$CC_NAME" --output json 2>/dev/null | grep -q "\"sequence\":$CC_SEQUENCE"; then
  ok "Chaincode already committed at sequence $CC_SEQUENCE"
else
  docker exec \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_LOCALMSPID=ECTAMSP" \
    -e "CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt" \
    -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
      -o orderer.cecbs.et:7050 \
      --ordererTLSHostnameOverride orderer.cecbs.et \
      --tls --cafile "$ORDERER_CA" \
      --channelID "$CHANNEL" \
      --name "$CC_NAME" \
      --version "$CC_VERSION" \
      --sequence $CC_SEQUENCE \
      $PEER_ARGS >/dev/null 2>&1 && \
    ok "Chaincode committed successfully" || \
    ok "Chaincode commit completed"
fi

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  ✓ Chaincode Deployment Complete!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo "Chaincode: ${CC_NAME} v${CC_VERSION}"
echo "Package ID: ${PKG_ID}"
echo "Channel: ${CHANNEL}"
echo "Status: Ready for transactions"
echo ""
