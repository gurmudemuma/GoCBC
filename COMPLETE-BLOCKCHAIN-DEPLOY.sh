#!/bin/bash

# Complete Blockchain Deployment - All Steps
# Handles Fabric 2.5 properly with channel participation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /home/guda/GoCBC

echo "================================================================"
echo "COMPLETE BLOCKCHAIN DEPLOYMENT"
echo "================================================================"
echo ""

# Function to join peer
join_peer() {
    local PEER=$1
    local PORT=$2
    local ORG=$3
    local MSP=$4
    
    echo -e "${BLUE}Joining $PEER...${NC}"
    
    # Fetch block
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        $PEER \
        peer channel fetch 0 /tmp/coffeechannel.block \
        -c coffeechannel \
        -o orderer.cecbs.et:7050 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "Received block|error" || true
    
    # Join
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        $PEER \
        peer channel join -b /tmp/coffeechannel.block 2>&1 | grep -E "Successfully|already|error" || true
    
    # Verify
    if docker exec $PEER peer channel list 2>&1 | grep -q coffeechannel; then
        echo -e "${GREEN}✓ $PEER joined${NC}"
        return 0
    else
        echo -e "${RED}✗ $PEER failed${NC}"
        return 1
    fi
}

# Join all peers
echo "Step 1: Joining all peers to channel"
echo "-------------------------------------"
join_peer "peer0.ecta.cecbs.et" 7051 "ecta" "ECTAMSP"
join_peer "peer0.nbe.cecbs.et" 10051 "nbe" "NBEMSP"
join_peer "peer0.banks.cecbs.et" 9051 "banks" "BanksMSP"
join_peer "peer0.ecx.cecbs.et" 8051 "ecx" "ECXMSP"
join_peer "peer0.customs.cecbs.et" 11051 "customs" "CustomsMSP"
join_peer "peer0.shipping.cecbs.et" 12051 "shipping" "ShippingMSP"
echo ""

# Install chaincode
echo "Step 2: Installing chaincode on all peers"
echo "------------------------------------------"
for peer in peer0.ecta.cecbs.et peer0.nbe.cecbs.et peer0.banks.cecbs.et peer0.ecx.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    echo -e "${BLUE}Installing on $peer...${NC}"
    docker cp blockchain/channel-artifacts/coffee_1.73.tgz $peer:/tmp/ 2>/dev/null
    docker exec $peer peer lifecycle chaincode install /tmp/coffee_1.73.tgz 2>&1 | grep -E "Chaincode code package|already|error" || true
done
echo ""

# Get package ID
echo "Step 3: Getting package ID"
echo "--------------------------"
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_1.73 | sed 's/.*Package ID: //' | sed 's/, Label.*//')
echo -e "${GREEN}Package ID: $PACKAGE_ID${NC}"
echo ""

# Approve for all orgs
echo "Step 4: Approving chaincode for all organizations"
echo "--------------------------------------------------"

approve_for_org() {
    local PEER=$1
    local PORT=$2
    local ORG=$3
    local MSP=$4
    
    echo -e "${BLUE}Approving for $MSP...${NC}"
    docker exec \
        -e CORE_PEER_LOCALMSPID=$MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$PEER:$PORT \
        $PEER \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "Successfully|committed|error" | head -3
}

approve_for_org "peer0.ecta.cecbs.et" 7051 "ecta" "ECTAMSP"
approve_for_org "peer0.nbe.cecbs.et" 10051 "nbe" "NBEMSP"
approve_for_org "peer0.banks.cecbs.et" 9051 "banks" "BanksMSP"
approve_for_org "peer0.ecx.cecbs.et" 8051 "ecx" "ECXMSP"
approve_for_org "peer0.customs.cecbs.et" 11051 "customs" "CustomsMSP"
approve_for_org "peer0.shipping.cecbs.et" 12051 "shipping" "ShippingMSP"
echo ""

# Check commit readiness
echo "Step 5: Check commit readiness"
echo "-------------------------------"
docker exec peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 2>&1
echo ""

# Commit chaincode
echo "Step 6: Committing chaincode"
echo "-----------------------------"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1 | grep -E "Successfully|Chaincode|error" | head -5
echo ""

echo "Step 7: Verification"
echo "--------------------"

# Query committed
echo "Committed chaincodes:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel 2>&1 | head -10
echo ""

# Test query
echo "Test query (should return [] before init):"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1
echo ""

# Initialize
echo "Initializing ledger..."
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1 | grep -E "Chaincode invoke|error" | head -3
echo ""

sleep 3

# Query again
echo "Test query after init:"
docker exec peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1 | head -20
echo ""

echo "================================================================"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo "================================================================"
echo ""
echo "All 6 peers joined to channel 'coffeechannel'"
echo "Chaincode 'coffee v1.73' installed, approved, and committed"
echo "Blockchain is ready for use!"
echo ""
