#!/bin/bash

################################################################################
# Complete Blockchain Fix Script
# Fixes chaincode connectivity issues
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                       ║${NC}"
echo -e "${CYAN}║              Fixing Blockchain Chaincode Issues                      ║${NC}"
echo -e "${CYAN}║                                                                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$(dirname "$0")"

# Step 1: Ensure coffee-chaincode container is running
echo -e "${BLUE}Step 1: Checking chaincode container...${NC}"
if docker ps | grep -q "coffee-chaincode"; then
    echo -e "${GREEN}✓ Chaincode container is running${NC}"
else
    echo -e "${YELLOW}⚠ Chaincode container not running, starting it...${NC}"
    docker-compose -f docker-compose-fabric.yml up -d coffee-chaincode
    sleep 5
    
    if docker ps | grep -q "coffee-chaincode"; then
        echo -e "${GREEN}✓ Chaincode container started${NC}"
    else
        echo -e "${RED}✗ Failed to start chaincode container${NC}"
        echo "Checking logs..."
        docker logs coffee-chaincode 2>&1 | tail -20
        exit 1
    fi
fi

# Step 2: Check chaincode deployment
echo ""
echo -e "${BLUE}Step 2: Checking chaincode deployment status...${NC}"
CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null || echo "NOT_FOUND")

if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
    VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
    SEQUENCE=$(echo "$CHAINCODE_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
    echo -e "${GREEN}✓ Chaincode is committed${NC}"
    echo "  • Version: $VERSION"
    echo "  • Sequence: $SEQUENCE"
else
    echo -e "${YELLOW}⚠ Chaincode not committed, attempting deployment...${NC}"
    if [ -f "deploy-chaincode.sh" ]; then
        bash deploy-chaincode.sh
    else
        echo -e "${RED}✗ deploy-chaincode.sh not found${NC}"
        exit 1
    fi
fi

# Step 3: Test chaincode invoke
echo ""
echo -e "${BLUE}Step 3: Testing chaincode connectivity...${NC}"
sleep 2

TEST_RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"function":"ping","Args":[]}' 2>&1 || echo "FAILED")

if echo "$TEST_RESULT" | grep -qE "Error|error|FAILED|could not launch"; then
    echo -e "${RED}✗ Chaincode test failed${NC}"
    echo "Error details:"
    echo "$TEST_RESULT" | head -10
    
    echo ""
    echo -e "${YELLOW}This usually means the chaincode container can't be reached.${NC}"
    echo -e "${YELLOW}Attempting to restart peers and chaincode...${NC}"
    
    # Restart chaincode container
    docker restart coffee-chaincode
    sleep 3
    
    # Restart one peer to force reconnection
    docker restart peer0.ecta.cecbs.et
    sleep 10
    
    echo ""
    echo -e "${BLUE}Testing again after restart...${NC}"
    TEST_RESULT2=$(docker exec \
        -e CORE_PEER_LOCALMSPID=ECTAMSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
        peer0.ecta.cecbs.et peer chaincode query \
        -C coffeechannel -n coffee \
        -c '{"function":"ping","Args":[]}' 2>&1 || echo "FAILED")
    
    if echo "$TEST_RESULT2" | grep -qE "Error|error|FAILED|could not launch"; then
        echo -e "${RED}✗ Chaincode still not responding${NC}"
        echo ""
        echo -e "${YELLOW}Advanced debugging needed:${NC}"
        echo "1. Check chaincode logs: docker logs coffee-chaincode"
        echo "2. Check peer logs: docker logs peer0.ecta.cecbs.et"
        echo "3. Verify network: docker network inspect cecbs-network"
        exit 1
    else
        echo -e "${GREEN}✓ Chaincode is now responding!${NC}"
    fi
else
    echo -e "${GREEN}✓ Chaincode is responding properly${NC}"
fi

# Step 4: Verify API can connect
echo ""
echo -e "${BLUE}Step 4: Testing API integration...${NC}"
if curl -s --max-time 3 http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API is running${NC}"
    echo -e "${YELLOW}  Note: API will reconnect to chaincode automatically${NC}"
else
    echo -e "${YELLOW}⚠ API not running (start with: cd api && npm run dev)${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                       ║${NC}"
echo -e "${GREEN}║                    ✓ Blockchain Fixed Successfully!                  ║${NC}"
echo -e "${GREEN}║                                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo "  • Chaincode container: Running"
echo "  • Chaincode committed: Yes"
echo "  • Chaincode responding: Yes"
echo ""
echo -e "${YELLOW}Next: Access the application at http://localhost:3000${NC}"
echo ""
