#!/bin/bash

# Continue Expert Fix - From Step 6 onwards
# Assumes containers are running and genesis block is created

set -e

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

echo "================================================================"
echo "CONTINUING BLOCKCHAIN DEPLOYMENT FROM STEP 6"
echo "================================================================"
echo ""

# Step 6: Join orderer to channel using osnadmin (Fabric 2.5 method)
log_step "Step 6: Joining orderer to channel (Fabric 2.5 method)..."

# Fix permissions first
sudo chown -R $USER:$USER blockchain/channel-artifacts/ 2>/dev/null || true

# Copy channel block to orderer's volume
docker cp blockchain/channel-artifacts/coffeechannel.block orderer.cecbs.et:/var/hyperledger/coffeechannel.block

# Join orderer using osnadmin channel join
docker exec orderer.cecbs.et \
    osnadmin channel join \
    --channelID coffeechannel \
    --config-block /var/hyperledger/coffeechannel.block \
    -o localhost:7053 \
    --ca-file /var/hyperledger/orderer/tls/ca.crt \
    --client-cert /var/hyperledger/orderer/tls/server.crt \
    --client-key /var/hyperledger/orderer/tls/server.key

if [ $? -eq 0 ]; then
    log_success "Orderer joined to channel"
else
    log_warning "Orderer may already be in channel or join failed (checking...)"
    # List channels on orderer
    docker exec orderer.cecbs.et \
        osnadmin channel list \
        -o localhost:7053 \
        --ca-file /var/hyperledger/orderer/tls/ca.crt \
        --client-cert /var/hyperledger/orderer/tls/server.crt \
        --client-key /var/hyperledger/orderer/tls/server.key
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
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1
    
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
        peer channel join -b /tmp/coffeechannel.block 2>&1
    
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
        peer lifecycle chaincode install /tmp/coffee_1.73.tgz 2>&1
    
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
    peer lifecycle chaincode queryinstalled 2>&1 | \
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
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1
    
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
    --sequence 1 2>&1

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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1

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
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1

echo ""

# Test 2: Query committed
echo "2. Query committed chaincodes:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel 2>&1

echo ""

# Test 3: Query chaincode (should return empty array)
echo "3. Query chaincode (should return []):"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1

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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1

echo ""
sleep 3

# Test 5: Query again (should return data)
echo "5. Query chaincode again (should return data):"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1

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
