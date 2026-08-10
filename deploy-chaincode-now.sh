#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

print_step() { echo -e "${BLUE}▶ $1${RESET}"; }
print_success() { echo -e "${GREEN}✓ $1${RESET}"; }
print_error() { echo -e "${RED}✗ $1${RESET}"; }

echo "=========================================="
echo "  CECBS Chaincode Deployment"
echo "=========================================="

CC_NAME="coffee"
CC_VERSION="1.11"
CC_SEQUENCE=1
CC_LABEL="${CC_NAME}_${CC_VERSION}"
CHANNEL="coffeechannel"
ORDERER_CA="/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem"

declare -A orgs=(
    ["ecta"]="peer0.ecta.cecbs.et:7051:ECTAMSP"
    ["ecx"]="peer0.ecx.cecbs.et:8051:ECXMSP"
    ["banks"]="peer0.banks.cecbs.et:9051:BanksMSP"
    ["nbe"]="peer0.nbe.cecbs.et:10051:NBEMSP"
    ["customs"]="peer0.customs.cecbs.et:11051:CustomsMSP"
    ["shipping"]="peer0.shipping.cecbs.et:12051:ShippingMSP"
)

# Step 1: Distribute TLS certs
print_step "[1/6] Distributing TLS certificates..."
orderer_ca_crt="blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    docker exec "$peer" sh -c "mkdir -p /var/hyperledger/orderer-tls" 2>/dev/null || true
    docker cp "$orderer_ca_crt" "$peer:/var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem" 2>/dev/null
done

for source_org in "${!orgs[@]}"; do
    peer_tls_cert="blockchain/organizations/peerOrganizations/${source_org}.cecbs.et/peers/peer0.${source_org}.cecbs.et/tls/ca.crt"
    if [ -f "$peer_tls_cert" ]; then
        for target_org in "${!orgs[@]}"; do
            IFS=':' read -r target_peer port msp <<< "${orgs[$target_org]}"
            docker exec "$target_peer" sh -c "mkdir -p /var/hyperledger/peer-tls" 2>/dev/null || true
            docker cp "$peer_tls_cert" "$target_peer:/var/hyperledger/peer-tls/tlsca.${source_org}.cecbs.et-cert.pem" 2>/dev/null
        done
    fi
done
print_success "TLS certificates distributed"

# Step 2: Build package
print_step "[2/6] Building chaincode package..."
tmp_dir=$(mktemp -d)

cat > "$tmp_dir/metadata.json" << 'EOF'
{"type":"ccaas","label":"coffee_1.11"}
EOF

cat > "$tmp_dir/connection.json" << 'EOF'
{"address":"coffee-chaincode:9999","dial_timeout":"10s","tls_required":false}
EOF

cd "$tmp_dir"
tar czf code.tar.gz connection.json
tar czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz
cd - >/dev/null
print_success "Package built"

# Step 3: Copy to peers
print_step "[3/6] Copying package to peers..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    docker cp "$tmp_dir/${CC_LABEL}.tar.gz" "$peer:/tmp/${CC_LABEL}.tar.gz" 2>/dev/null
done
rm -rf "$tmp_dir"
print_success "Package copied"

# Step 4: Install
print_step "[4/6] Installing chaincode..."
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  $peer... "
    
    MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        "$peer" \
        peer lifecycle chaincode install "/tmp/${CC_LABEL}.tar.gz" 2>&1 | grep -q "installed" && \
        echo -e "${GREEN}installed${RESET}" || echo -e "${YELLOW}done${RESET}"
done

# Get package ID
echo -n "  Getting package ID... "
package_id=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled --output json 2>&1 | \
    grep -o '"package_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"/\1/')

if [ -z "$package_id" ]; then
    print_error "Could not get package ID"
    exit 1
fi
echo -e "${GREEN}$package_id${RESET}"
print_success "Chaincode installed"

# Step 5: Approve
print_step "[5/6] Approving for organizations..."
success_count=0
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    echo -n "  $msp... "
    
    approve_result=$(MSYS_NO_PATHCONV=1 docker exec \
        -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp" \
        -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE="/etc/hyperledger/fabric/tls/ca.crt" \
        -e CORE_PEER_LOCALMSPID="$msp" \
        -e CORE_PEER_ADDRESS="${peer}:${port}" \
        "$peer" \
        peer lifecycle chaincode approveformyorg \
            -o orderer.cecbs.et:7050 \
            --ordererTLSHostnameOverride orderer.cecbs.et \
            --tls --cafile "$ORDERER_CA" \
            --channelID "$CHANNEL" \
            --name "$CC_NAME" \
            --version "$CC_VERSION" \
            --package-id "$package_id" \
            --sequence "$CC_SEQUENCE" 2>&1)
    
    if echo "$approve_result" | grep -qi "error"; then
        echo -e "${RED}error${RESET}"
        echo "    Error: $approve_result"
    else
        echo -e "${GREEN}approved${RESET}"
        success_count=$((success_count + 1))
    fi
done

if [ $success_count -lt 4 ]; then
    print_error "Only $success_count approved (need 4+)"
    exit 1
fi
print_success "$success_count organizations approved"

# Step 6: Commit
print_step "[6/6] Committing chaincode..."
peer_args=""
for org in "${!orgs[@]}"; do
    IFS=':' read -r peer port msp <<< "${orgs[$org]}"
    peer_args="$peer_args --peerAddresses peer0.${org}.cecbs.et:${port} --tlsRootCertFiles /var/hyperledger/peer-tls/tlsca.${org}.cecbs.et-cert.pem"
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
        $peer_args

print_success "Chaincode committed!"

# Verify
print_step "Verifying deployment..."
sleep 3
verify_result=$(MSYS_NO_PATHCONV=1 docker exec \
    -e CORE_PEER_MSPCONFIGPATH="/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp" \
    -e FABRIC_CFG_PATH=/etc/hyperledger/fabric \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" 2>&1)

if echo "$verify_result" | grep -q "Version: ${CC_VERSION}"; then
    print_success "✅ Chaincode $CC_NAME v$CC_VERSION deployed successfully!"
else
    echo "$verify_result"
fi
