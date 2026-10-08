#!/bin/bash
##################################################################
# Fix Endorsement Mismatch - Expert Solution
# Resolves ProposalResponsePayloads do not match errors
##################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Fixing Chaincode Endorsement Mismatch"
echo "=========================================="
echo ""

# Step 1: Stop all containers
echo -e "${YELLOW}Step 1: Stopping all containers...${NC}"
./stop-all.sh >/dev/null 2>&1 || true
sleep 2

# Step 2: Clean ledger data (keeps chaincode packages)
echo -e "${YELLOW}Step 2: Cleaning inconsistent ledger data...${NC}"
docker-compose -f docker-compose-fabric.yml down -v 2>&1 | grep -v "^WARN"
sleep 2

# Step 3: Remove orphaned volumes
echo -e "${YELLOW}Step 3: Removing orphaned volumes...${NC}"
docker volume prune -f >/dev/null 2>&1 || true

# Step 4: Start network fresh
echo -e "${YELLOW}Step 4: Starting network with clean state...${NC}"
docker-compose -f docker-compose-fabric.yml up -d orderer.cecbs.et \
    peer0.ecta.cecbs.et peer0.ecx.cecbs.et \
    peer0.banks.cecbs.et peer0.nbe.cecbs.et \
    peer0.customs.cecbs.et peer0.shipping.cecbs.et \
    couchdb.ecta couchdb.ecx couchdb.banks \
    couchdb.nbe couchdb.customs couchdb.shipping 2>&1 | grep -v "^WARN"

echo -e "${GREEN}Waiting for peers to start...${NC}"
sleep 15

# Step 5: Create channel
echo -e "${YELLOW}Step 5: Creating channel...${NC}"
docker exec peer0.ecta.cecbs.et peer channel create \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    >/dev/null 2>&1 || echo "Channel may already exist"

sleep 5

# Step 6: Join all peers to channel
echo -e "${YELLOW}Step 6: Joining all peers to channel...${NC}"
for org in ecta ecx banks nbe customs shipping; do
    echo "  Joining peer0.${org}..."
    docker exec peer0.${org}.cecbs.et peer channel join \
        -b coffeechannel.block >/dev/null 2>&1 || echo "  Already joined"
done

sleep 5

# Step 7: Install chaincode on all peers
echo -e "${YELLOW}Step 7: Installing chaincode on all peers...${NC}"

# Find the latest chaincode package
LATEST_PKG=$(ls -t chaincodes/coffee/coffee_*.tgz 2>/dev/null | head -1)
if [ -z "$LATEST_PKG" ]; then
    echo -e "${RED}ERROR: No chaincode package found!${NC}"
    echo "Run: cd chaincodes/coffee && ./package.sh"
    exit 1
fi

echo "  Using package: $LATEST_PKG"

for org in ecta ecx banks nbe customs shipping; do
    echo "  Installing on peer0.${org}..."
    docker exec peer0.${org}.cecbs.et peer lifecycle chaincode install \
        /opt/gopath/src/github.com/hyperledger/fabric/peer/$LATEST_PKG \
        >/dev/null 2>&1 || echo "  Already installed"
done

sleep 5

# Step 8: Get package ID
echo -e "${YELLOW}Step 8: Getting package ID...${NC}"
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled \
    | grep "coffee_" | head -1 | sed 's/Package ID: //' | sed 's/, Label.*//')

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}ERROR: Could not get package ID${NC}"
    exit 1
fi

echo "  Package ID: $PACKAGE_ID"

# Step 9: Approve for all orgs
echo -e "${YELLOW}Step 9: Approving chaincode for all organizations...${NC}"

for org in ECTA ECX Banks NBE Customs Shipping; do
    orgLower=$(echo $org | tr '[:upper:]' '[:lower:]')
    echo "  Approving for ${org}MSP..."
    
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org}MSP" \
        -e CORE_PEER_ADDRESS="peer0.${orgLower}.cecbs.et:7051" \
        -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${orgLower}.cecbs.et/peers/peer0.${orgLower}.cecbs.et/tls/ca.crt" \
        -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${orgLower}.cecbs.et/users/Admin@${orgLower}.cecbs.et/msp" \
        peer0.${orgLower}.cecbs.et peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --channelID coffeechannel \
        --name coffee \
        --version 1.20 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --signature-policy "OR('ECTAMSP.peer','ECXMSP.peer','BanksMSP.peer','NBEMSP.peer','CustomsMSP.peer','ShippingMSP.peer')" \
        >/dev/null 2>&1 || echo "  Already approved"
    
    sleep 2
done

# Step 10: Check commit readiness
echo -e "${YELLOW}Step 10: Checking commit readiness...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.20 \
    --sequence 1 \
    --signature-policy "OR('ECTAMSP.peer','ECXMSP.peer','BanksMSP.peer','NBEMSP.peer','CustomsMSP.peer','ShippingMSP.peer')" \
    2>&1 | grep -E "ECTAMSP|ECXMSP|BanksMSP|NBEMSP|CustomsMSP|ShippingMSP"

# Step 11: Commit chaincode
echo -e "${YELLOW}Step 11: Committing chaincode definition...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.20 \
    --sequence 1 \
    --signature-policy "OR('ECTAMSP.peer','ECXMSP.peer','BanksMSP.peer','NBEMSP.peer','CustomsMSP.peer','ShippingMSP.peer')" \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt

echo ""
echo -e "${GREEN}✓ Chaincode deployed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start chaincode container: docker-compose -f docker-compose-fabric.yml up -d coffee-chaincode"
echo "  2. Start services: ./start-all.sh"
echo ""
