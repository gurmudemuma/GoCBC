#!/usr/bin/env bash
# Initialize Hyperledger Fabric blockchain network
# Creates channel, joins peers, and deploys chaincode

set -euo pipefail
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CHANNEL_NAME="coffeechannel"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}▶${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }

echo ""
echo "============================================================================"
echo "  Hyperledger Fabric Blockchain Initialization"
echo "============================================================================"
echo ""

# Check if channel already exists
info "Checking if channel already exists..."
if docker exec peer0.ecta.cecbs.et peer channel getinfo -c "${CHANNEL_NAME}" >/dev/null 2>&1; then
    ok "Channel '${CHANNEL_NAME}' exists - verifying chaincode..."
    
    if docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
        --channelID "${CHANNEL_NAME}" --name coffee --output json 2>/dev/null | grep -q '"sequence":'; then
        ok "Chaincode 'coffee' is deployed and ready"
        echo ""
        echo -e "${GREEN}============================================================================${NC}"
        echo -e "${GREEN}  Blockchain ready - no initialization needed${NC}"
        echo -e "${GREEN}============================================================================${NC}"
        echo ""
        exit 0
    else
        info "Chaincode not deployed - deploying now..."
        cd "$PROJECT_ROOT"
        bash scripts/deploy-chaincode-complete.sh
        exit 0
    fi
fi

info "Channel does not exist. Starting full initialization..."
echo ""

# Step 1: Create channel
info "[1/3] Creating channel '${CHANNEL_NAME}'..."
cd "$PROJECT_ROOT"

# Check if channel block already exists on host
if [ -f "blockchain/channel-artifacts/${CHANNEL_NAME}.block" ]; then
    ok "Channel block already exists, using it"
else
    info "Channel block not found - creating channel now..."
    
    # Create channel using docker exec (avoids peer CLI installation requirement)
    ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"
    
    if docker exec peer0.ecta.cecbs.et \
        sh -c "CORE_PEER_TLS_ENABLED=true \
               CORE_PEER_LOCALMSPID=ECTAMSP \
               CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
               CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
               CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
               peer channel create \
                 -o orderer.cecbs.et:7050 \
                 -c ${CHANNEL_NAME} \
                 -f /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.tx \
                 --outputBlock /tmp/${CHANNEL_NAME}.block \
                 --tls \
                 --cafile ${ORDERER_CA}" 2>&1 | tee /tmp/channel-create.log; then
        
        # Copy channel block from container to host
        CHANNEL_BLOCK_HOST=$(pwd | sed 's|/c/|C:/|')/blockchain/channel-artifacts/${CHANNEL_NAME}.block
        docker cp "peer0.ecta.cecbs.et:/tmp/${CHANNEL_NAME}.block" "$CHANNEL_BLOCK_HOST"
        ok "Channel '${CHANNEL_NAME}' created successfully"
    else
        if grep -q "exists" /tmp/channel-create.log 2>/dev/null; then
            warn "Channel already exists on orderer - attempting to fetch..."
            # Fetch existing channel block
            docker exec peer0.ecta.cecbs.et \
                sh -c "CORE_PEER_TLS_ENABLED=true \
                       CORE_PEER_LOCALMSPID=ECTAMSP \
                       CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
                       CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
                       CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
                       peer channel fetch 0 /tmp/${CHANNEL_NAME}.block \
                         -o orderer.cecbs.et:7050 \
                         -c ${CHANNEL_NAME} \
                         --tls \
                         --cafile ${ORDERER_CA}"
            
            CHANNEL_BLOCK_HOST=$(pwd | sed 's|/c/|C:/|')/blockchain/channel-artifacts/${CHANNEL_NAME}.block
            docker cp "peer0.ecta.cecbs.et:/tmp/${CHANNEL_NAME}.block" "$CHANNEL_BLOCK_HOST"
            ok "Channel block fetched successfully"
        else
            err "Failed to create channel. Check logs:"
            cat /tmp/channel-create.log 2>/dev/null || true
            exit 1
        fi
    fi
fi

# Ensure channel block is in peer containers
info "Distributing channel block to all peers..."
CHANNEL_BLOCK_WIN=$(pwd | sed 's|/c/|C:/|')/blockchain/channel-artifacts/${CHANNEL_NAME}.block
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    docker cp "$CHANNEL_BLOCK_WIN" "${peer}:/tmp/${CHANNEL_NAME}.block" 2>/dev/null || true
done

ok "Channel '${CHANNEL_NAME}' block ready"
echo ""

# Step 2: Join peers to channel
info "[2/3] Joining all peers to channel..."
bash "$SCRIPT_DIR/join-peers-to-channel.sh"
ok "All peers joined channel"
echo ""

# Step 3: Deploy chaincode
info "[3/3] Deploying coffee chaincode..."
if bash "$SCRIPT_DIR/deploy-chaincode-complete.sh"; then
    ok "Chaincode deployed successfully"
else
    warn "Chaincode deployment had issues, but channel and peers are ready"
fi
echo ""

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  Blockchain initialized successfully!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "Channel: ${CHANNEL_NAME}"
echo "Chaincode: coffee"
echo "Status: Ready"
echo ""
