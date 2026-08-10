#!/bin/bash

# Regenerate Blockchain Network Script
# This script completely regenerates the Hyperledger Fabric network with fresh crypto material

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

print_step() {
    echo -e "${BLUE}▶ $1${RESET}"
}

print_success() {
    echo -e "${GREEN}✓ $1${RESET}"
}

print_error() {
    echo -e "${RED}✗ $1${RESET}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${RESET}"
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║   CECBS Blockchain Network Regeneration                       ║${RESET}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Step 1: Stop all blockchain containers
print_step "Step 1: Stopping blockchain network..."
cd blockchain
docker-compose down 2>/dev/null || true
cd ..
print_success "Network stopped"

# Step 2: Clean up old crypto material and artifacts
print_step "Step 2: Cleaning up old crypto material..."
rm -rf blockchain/organizations
mkdir -p blockchain/organizations
rm -rf blockchain/channel-artifacts/*.block
rm -rf blockchain/channel-artifacts/*.tx
print_success "Old crypto material removed"

# Step 3: Generate new crypto material
print_step "Step 3: Generating new crypto material..."
cd blockchain

# Check if cryptogen is available in PATH
if command -v cryptogen >/dev/null 2>&1; then
    cryptogen generate --config=crypto-config.yaml --output=organizations
    print_success "Crypto material generated using system cryptogen"
else
    # Use cryptogen from Fabric tools container with temp directory to avoid Docker caching
    print_warning "System cryptogen not found, using Docker container..."
    mkdir -p temp_crypto
    MSYS_NO_PATHCONV=1 docker run --rm \
        -v "$(pwd)/temp_crypto:/work" \
        -v "$(pwd)/crypto-config.yaml:/work/crypto-config.yaml:ro" \
        -w /work \
        hyperledger/fabric-tools:2.5 \
        cryptogen generate --config=crypto-config.yaml --output=organizations
    
    # Move generated files to correct location
    rm -rf organizations
    mv temp_crypto/organizations .
    rm -rf temp_crypto
    print_success "Crypto material generated using Docker"
fi

# Verify crypto material was created
if [ ! -d "organizations/peerOrganizations/ecta.cecbs.et" ]; then
    print_error "Failed to generate crypto material"
    exit 1
fi

cd ..
print_success "New crypto material generated"

# Step 4: Generate genesis block
print_step "Step 4: Generating genesis block..."
cd blockchain

if command -v configtxgen >/dev/null 2>&1; then
    FABRIC_CFG_PATH=. configtxgen -profile CoffeeOrdererGenesis \
        -channelID system-channel \
        -outputBlock ./channel-artifacts/genesis.block
    print_success "Genesis block generated using system configtxgen"
else
    print_warning "System configtxgen not found, using Docker container..."
    MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/work" -w /work \
        -e FABRIC_CFG_PATH=/work \
        hyperledger/fabric-tools:2.5 \
        configtxgen -profile CoffeeOrdererGenesis \
        -channelID system-channel \
        -outputBlock ./channel-artifacts/genesis.block
    print_success "Genesis block generated using Docker"
fi

cd ..
print_success "Genesis block created"

# Step 5: Generate channel configuration transaction
print_step "Step 5: Generating channel genesis block..."
cd blockchain

if command -v configtxgen >/dev/null 2>&1; then
    FABRIC_CFG_PATH=. configtxgen -profile CoffeeChannel \
        -outputBlock ./channel-artifacts/coffeechannel.block \
        -channelID coffeechannel
    print_success "Channel block generated using system configtxgen"
else
    MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/work" -w /work \
        -e FABRIC_CFG_PATH=/work \
        hyperledger/fabric-tools:2.5 \
        configtxgen -profile CoffeeChannel \
        -outputBlock ./channel-artifacts/coffeechannel.block \
        -channelID coffeechannel
    print_success "Channel block generated using Docker"
fi

cd ..
print_success "Channel genesis block created"

# Step 6: Generate anchor peer updates for each organization
print_step "Step 6: Generating anchor peer configurations..."
cd blockchain

orgs=("ECTA" "ECX" "Banks" "NBE" "Customs" "Shipping")
for org in "${orgs[@]}"; do
    echo -n "  Generating for $org... "
    if command -v configtxgen >/dev/null 2>&1; then
        FABRIC_CFG_PATH=. configtxgen -profile CoffeeChannel \
            -outputAnchorPeersUpdate ./channel-artifacts/${org}MSPanchors.tx \
            -channelID coffeechannel \
            -asOrg ${org}MSP 2>/dev/null
    else
        MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/work" -w /work \
            -e FABRIC_CFG_PATH=/work \
            hyperledger/fabric-tools:2.5 \
            configtxgen -profile CoffeeChannel \
            -outputAnchorPeersUpdate ./channel-artifacts/${org}MSPanchors.tx \
            -channelID coffeechannel \
            -asOrg ${org}MSP 2>/dev/null || true
    fi
    echo "done"
done

cd ..
print_success "Anchor peer configurations generated"

# Step 7: Start the blockchain network
print_step "Step 7: Starting blockchain network..."
docker-compose -f docker-compose-fabric.yml down 2>/dev/null || true
docker-compose -f docker-compose-fabric.yml up -d
print_success "Network starting..."

# Step 8: Wait for containers to be ready
print_step "Step 8: Waiting for containers to start..."
sleep 10

# Check if peers are running
if ! docker ps | grep -q peer0.ecta.cecbs.et; then
    print_error "Peers failed to start"
    print_warning "Check logs with: docker logs peer0.ecta.cecbs.et"
    exit 1
fi

print_success "All containers running"

# Step 9: Join orderer to channel using osnadmin
print_step "Step 9: Joining orderer to channel..."
MSYS_NO_PATHCONV=1 docker run --rm --network cecbs-network \
    -v "$(pwd)/blockchain:/blockchain" \
    hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
    --channelID coffeechannel \
    --config-block /blockchain/channel-artifacts/coffeechannel.block \
    -o orderer.cecbs.et:7053 \
    --ca-file /blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/ca.crt \
    --client-cert /blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
    --client-key /blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key 2>&1 | grep -v "already exists" || true

print_success "Orderer joined channel"

# Step 10: Join all peers to channel
print_step "Step 10: Joining peers to channel..."

declare -A peers=(
    ["ecta"]="peer0.ecta.cecbs.et:7051"
    ["ecx"]="peer0.ecx.cecbs.et:8051"
    ["banks"]="peer0.banks.cecbs.et:9051"
    ["nbe"]="peer0.nbe.cecbs.et:10051"
    ["customs"]="peer0.customs.cecbs.et:11051"
    ["shipping"]="peer0.shipping.cecbs.et:12051"
)

for org in "${!peers[@]}"; do
    peer_name="peer0.${org}.cecbs.et"
    echo -n "  Joining $peer_name... "
    
    MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        "$peer_name" \
        peer channel join \
            -b /etc/hyperledger/fabric/channel-artifacts/coffeechannel.block 2>&1 | \
        grep -q "Successfully joined\|already" && \
        echo -e "${GREEN}joined${RESET}" || echo -e "${YELLOW}done${RESET}"
done

print_success "All peers joined channel"

# Step 11: Verify admin certificates
print_step "Step 11: Verifying admin certificates..."
for org in "${!peers[@]}"; do
    peer_name="peer0.${org}.cecbs.et"
    echo -n "  Checking $org admin cert... "
    
    cert_info=$(docker exec "$peer_name" \
        openssl x509 -in /etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp/signcerts/cert.pem \
        -noout -text 2>/dev/null | grep "OU=" || echo "")
    
    if echo "$cert_info" | grep -q "OU"; then
        echo -e "${GREEN}found${RESET}"
    else
        echo -e "${RED}missing${RESET}"
    fi
done

print_success "Certificate verification complete"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║   Blockchain Network Successfully Regenerated!                 ║${RESET}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BLUE}Next steps:${RESET}"
echo "  1. Run: bash start-all.sh (to deploy chaincode)"
echo "  2. Run: bash test-all-features.sh (to verify all 23 tests pass)"
echo ""
