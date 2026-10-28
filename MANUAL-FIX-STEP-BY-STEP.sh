#!/bin/bash

# Manual Step-by-Step Blockchain Fix
# Each step is clear and can be verified

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================================"
echo "MANUAL BLOCKCHAIN DEPLOYMENT - STEP BY STEP"
echo "================================================================"
echo ""

cd /home/guda/GoCBC

# Step 1: Use the genesis block to bootstrap orderer manually
echo -e "${BLUE}Step 1: Copy genesis block to orderer${NC}"
docker cp blockchain/channel-artifacts/coffeechannel.block orderer.cecbs.et:/var/hyperledger/production/orderer/
echo -e "${GREEN}✓ Genesis block copied${NC}"
echo ""

# Step 2: Create channel directory structure in orderer
echo -e "${BLUE}Step 2: Setup channel directory in orderer${NC}"
docker exec orderer.cecbs.et mkdir -p /var/hyperledger/production/orderer/chains/coffeechannel
docker exec orderer.cecbs.et cp /var/hyperledger/production/orderer/coffeechannel.block /var/hyperledger/production/orderer/chains/coffeechannel/
echo -e "${GREEN}✓ Channel directory setup${NC}"
echo ""

# Step 3: Restart orderer to recognize the channel
echo -e "${BLUE}Step 3: Restart orderer${NC}"
docker restart orderer.cecbs.et
sleep 10
echo -e "${GREEN}✓ Orderer restarted${NC}"
echo ""

# Step 4: Verify orderer is healthy
echo -e "${BLUE}Step 4: Check orderer status${NC}"
docker logs orderer.cecbs.et 2>&1 | tail -20
echo ""

# Step 5: Join ECTA peer to channel
echo -e "${BLUE}Step 5: Join peer0.ecta to channel${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
    -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    peer0.ecta.cecbs.et \
    peer channel fetch 0 /tmp/coffeechannel.block \
    -c coffeechannel \
    -o orderer.cecbs.et:7050 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer/msp/tlscacerts/tlsca.cecbs.et-cert.pem

docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer channel join -b /tmp/coffeechannel.block

echo -e "${GREEN}✓ ECTA peer joined${NC}"
echo ""

# Step 6: Verify peer joined
echo -e "${BLUE}Step 6: Verify ECTA peer joined${NC}"
docker exec peer0.ecta.cecbs.et peer channel list
echo ""

echo -e "${GREEN}✓ Manual bootstrap complete! Now run automated script...${NC}"
echo ""
