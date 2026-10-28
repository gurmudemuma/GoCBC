#!/bin/bash

# EXPERT FIX - Hyperledger Fabric 2.5 Complete Deployment
# This script fixes all three blocking issues:
# 1. Orderer system channel error
# 2. MSP admin identity persistence
# 3. Chaincode approval and commit

set -e

echo "================================================================"
echo "HYPERLEDGER FABRIC 2.5 - EXPERT FIX"
echo "================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() {
    echo -e "${BLUE}==>${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

cd /home/guda/GoCBC

# Step 1: Stop and clean existing containers
log_step "Step 1: Cleaning existing blockchain setup..."
docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
sleep 3
log_success "Containers stopped and volumes removed"

# Step 2: Clean old channel artifacts but preserve crypto
log_step "Step 2: Cleaning old channel artifacts..."
rm -rf blockchain/channel-artifacts/*.block 2>/dev/null || true
rm -rf blockchain/channel-artifacts/*.tx 2>/dev/null || true
mkdir -p blockchain/channel-artifacts
log_success "Channel artifacts cleaned"

# Step 3: Verify crypto material has MSP config.yaml
log_step "Step 3: Verifying MSP configuration..."

ORGS="ecta ecx banks nbe customs shipping"
for org in $ORGS; do
    MSP_CONFIG="blockchain/organizations/peerOrganizations/${org}.cecbs.et/msp/config.yaml"
    ADMIN_MSP_CONFIG="blockchain/organizations/peerOrganizations/${org}.cecbs.et/users/Admin@${org}.cecbs.et/msp/config.yaml"
    
    if [ ! -f "$MSP_CONFIG" ]; then
        log_warning "Creating MSP config for $org..."
        cat > "$MSP_CONFIG" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.${org}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.${org}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.${org}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca.${org}.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: orderer
EOF
    fi
    
    if [ ! -f "$ADMIN_MSP_CONFIG" ]; then
        cp "$MSP_CONFIG" "$ADMIN_MSP_CONFIG"
    fi
done

# Orderer MSP config
ORDERER_MSP_CONFIG="blockchain/organizations/ordererOrganizations/cecbs.et/msp/config.yaml"
if [ ! -f "$ORDERER_MSP_CONFIG" ]; then
    cat > "$ORDERER_MSP_CONFIG" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca.cecbs.et-cert.pem
    OrganizationalUnitIdentifier: orderer
EOF
fi

log_success "MSP configurations verified"

# Step 4: Start the network
log_step "Step 4: Starting Hyperledger Fabric network..."
docker-compose -f docker-compose-fabric.yml up -d
sleep 10
log_success "Network started"

# Step 5: Create channel genesis block using Fabric 2.5 method
log_step "Step 5: Creating channel genesis block..."

# Use fabric-tools container to generate the genesis block
docker run --rm \
    -v $(pwd)/blockchain:/tmp/blockchain \
    -w /tmp/blockchain \
    -u $(id -u):$(id -g) \
    hyperledger/fabric-tools:2.5 \
    configtxgen \
    -profile CoffeeChannel \
    -outputBlock /tmp/blockchain/channel-artifacts/coffeechannel.block \
    -channelID coffeechannel \
    -configPath /tmp/blockchain

if [ $? -eq 0 ]; then
    log_success "Channel genesis block created"
else
    log_error "Failed to create channel genesis block"
    exit 1
fi

# Step 6: Join orderer to channel using osnadmin (Fabric 2.5 method)
log_step "Step 6: Joining orderer to channel (Fabric 2.5 method)..."

# Copy channel block to orderer's volume
docker cp blockchain/channel-artifacts/coffeechannel.block orderer.cecbs.et:/var/hyperledger/channel-artifacts/

# Join orderer using osnadmin channel join
docker exec orderer.cecbs.et \
    osnadmin channel join \
    --channelID coffeechannel \
    --config-block /var/hyperledger/channel-artifacts/coffeechannel.block \
    -o localhost:7053 \
    --ca-file /var/hyperledger/orderer/tls/ca.crt \
    --client-cert /var/hyperledger/orderer/tls/server.crt \
    --client-key /var/hyperledger/orderer/tls/server.key

if [ $? -eq 0 ]; then
    log_success "Orderer joined to channel"
else
    log_warning "Orderer may already be in channel (this is OK)"
fi

sleep 5

# Step 7: Join peers to channel
log_step "Step 7: Joining peers to channel..."

join_peer() {
    local PEER_NAME=$1
    local PEER_PORT=$2
    local ORG=$3
    local MSP_ID=$4
    
    log_step "Joining $PEER_NAME..."
    
    # Fetch channel genesis block
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP_ID \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
        -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$PEER_NAME:$PEER_PORT \
        $PEER_NAME \
        peer channel fetch 0 /tmp/coffeechannel.block \
        -c coffeechannel \
        -o orderer.cecbs.et:7050 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem
    
    # Join channel
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP_ID \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
        -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$PEER_NAME:$PEER_PORT \
        $PEER_NAME \
        peer channel join -b /tmp/coffeechannel.block
    
    if [ $? -eq 0 ]; then
        log_success "$PEER_NAME joined to channel"
    else
        log_warning "$PEER_NAME may already be in channel"
    fi
}

join_peer "peer0.ecta.cecbs.et" 7051 "ecta" "ECTAMSP"
join_peer "peer0.nbe.cecbs.et" 10051 "nbe" "NBEMSP"
join_peer "peer0.banks.cecbs.et" 9051 "banks" "BanksMSP"
join_peer "peer0.ecx.cecbs.et" 8051 "ecx" "ECXMSP"
join_peer "peer0.customs.cecbs.et" 11051 "customs" "CustomsMSP"
join_peer "peer0.shipping.cecbs.et" 12051 "shipping" "ShippingMSP"

sleep 5

# Step 8: Install chaincode on all peers
log_step "Step 8: Installing chaincode on all peers..."

CHAINCODE_PACKAGE="blockchain/channel-artifacts/coffee_1.73.tgz"

if [ ! -f "$CHAINCODE_PACKAGE" ]; then
    log_error "Chaincode package not found: $CHAINCODE_PACKAGE"
    exit 1
fi

install_chaincode() {
    local PEER_NAME=$1
    local MSP_ID=$2
    local ORG=$3
    
    log_step "Installing on $PEER_NAME..."
    
    docker cp $CHAINCODE_PACKAGE $PEER_NAME:/tmp/coffee_1.73.tgz
    
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP_ID \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        $PEER_NAME \
        peer lifecycle chaincode install /tmp/coffee_1.73.tgz
    
    if [ $? -eq 0 ]; then
        log_success "Chaincode installed on $PEER_NAME"
    else
        log_warning "Chaincode may already be installed on $PEER_NAME"
    fi
}

install_chaincode "peer0.ecta.cecbs.et" "ECTAMSP" "ecta"
install_chaincode "peer0.nbe.cecbs.et" "NBEMSP" "nbe"
install_chaincode "peer0.banks.cecbs.et" "BanksMSP" "banks"
install_chaincode "peer0.ecx.cecbs.et" "ECXMSP" "ecx"
install_chaincode "peer0.customs.cecbs.et" "CustomsMSP" "customs"
install_chaincode "peer0.shipping.cecbs.et" "ShippingMSP" "shipping"

sleep 3

# Step 9: Get package ID
log_step "Step 9: Getting chaincode package ID..."

PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode queryinstalled | \
    grep coffee_1.73 | \
    sed 's/.*Package ID: //' | sed 's/, Label.*//')

if [ -z "$PACKAGE_ID" ]; then
    log_error "Failed to get package ID"
    exit 1
fi

log_success "Package ID: $PACKAGE_ID"

# Step 10: Approve chaincode for all organizations
log_step "Step 10: Approving chaincode for all organizations..."

approve_chaincode() {
    local PEER_NAME=$1
    local PEER_PORT=$2
    local MSP_ID=$3
    local ORG=$4
    
    log_step "Approving for $MSP_ID..."
    
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP_ID \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
        -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
        -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$PEER_NAME:$PEER_PORT \
        $PEER_NAME \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem
    
    if [ $? -eq 0 ]; then
        log_success "Approved for $MSP_ID"
    else
        log_error "Failed to approve for $MSP_ID"
        return 1
    fi
}

approve_chaincode "peer0.ecta.cecbs.et" 7051 "ECTAMSP" "ecta"
approve_chaincode "peer0.nbe.cecbs.et" 10051 "NBEMSP" "nbe"
approve_chaincode "peer0.banks.cecbs.et" 9051 "BanksMSP" "banks"
approve_chaincode "peer0.ecx.cecbs.et" 8051 "ECXMSP" "ecx"
approve_chaincode "peer0.customs.cecbs.et" 11051 "CustomsMSP" "customs"
approve_chaincode "peer0.shipping.cecbs.et" 12051 "ShippingMSP" "shipping"

sleep 3

# Step 11: Check commit readiness
log_step "Step 11: Checking commit readiness..."

docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1

sleep 2

# Step 12: Commit chaincode
log_step "Step 12: Committing chaincode to channel..."

docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
    -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

if [ $? -eq 0 ]; then
    log_success "Chaincode committed successfully!"
else
    log_error "Failed to commit chaincode"
    exit 1
fi

sleep 5

# Step 13: Verify deployment
log_step "Step 13: Verifying deployment..."

echo ""
echo "=== Verification Tests ==="
echo ""

# Test 1: Query installed
echo "1. Query installed chaincodes:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled

echo ""

# Test 2: Query committed
echo "2. Query committed chaincodes:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel

echo ""

# Test 3: Query chaincode (should return empty array)
echo "3. Query chaincode (should return []):"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}'

echo ""

# Test 4: Initialize ledger
echo "4. Initialize ledger:"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
    -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et \
    peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"initLedger","Args":[]}' \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

echo ""
sleep 3

# Test 5: Query again (should return data)
echo "5. Query chaincode again (should return data):"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}'

echo ""
echo ""
echo "================================================================"
echo -e "${GREEN}✓ BLOCKCHAIN DEPLOYMENT COMPLETE!${NC}"
echo "================================================================"
echo ""
echo "Summary:"
echo "  • Orderer properly configured for Fabric 2.5 (no system channel)"
echo "  • All 6 peers joined to channel"
echo "  • Chaincode installed on all peers"
echo "  • Chaincode approved by all organizations"
echo "  • Chaincode committed to channel"
echo "  • Ledger initialized and queryable"
echo ""
echo "Next steps:"
echo "  1. Test with GoCBC portals"
echo "  2. Monitor blockchain performance"
echo "  3. Set up continuous monitoring"
echo ""
echo "To check status anytime:"
echo "  docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{\"function\":\"queryAllCoffee\",\"Args\":[]}'"
echo ""
