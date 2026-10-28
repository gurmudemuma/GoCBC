#!/bin/bash

################################################################################
# Chaincode Deployment Script for GoCBC
# Deploys the coffee chaincode to all peers
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Coffee Chaincode Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if already committed
echo -e "${YELLOW}Checking if chaincode is already deployed...${NC}"
CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null || echo "NOT_FOUND")

if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
    CURRENT_VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
    CURRENT_SEQUENCE=$(echo "$CHAINCODE_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
    
    echo -e "${GREEN}✓ Chaincode is already deployed:${NC}"
    echo "  • Version: $CURRENT_VERSION"
    echo "  • Sequence: $CURRENT_SEQUENCE"
    echo ""
    
    # Test if it's working
    echo -e "${YELLOW}Testing chaincode...${NC}"
    TEST_RESULT=$(docker exec \
        -e CORE_PEER_LOCALMSPID=ECTAMSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
        peer0.ecta.cecbs.et peer chaincode query \
        -C coffeechannel -n coffee \
        -c '{"function":"ping","Args":[]}' 2>&1 || echo "FAILED")
    
    if echo "$TEST_RESULT" | grep -qE "Error|error|FAILED"; then
        echo -e "${RED}✗ Chaincode is not responding properly${NC}"
        echo "  This may require manual intervention"
        exit 1
    else
        echo -e "${GREEN}✓ Chaincode is operational${NC}"
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  Deployment successful - chaincode is ready${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        exit 0
    fi
fi

# If we get here, chaincode is not deployed
echo -e "${YELLOW}⚠ Chaincode not yet deployed${NC}"
echo ""

# Check if chaincode package exists
CHAINCODE_PACKAGE="/tmp/coffee_1.0.tar.gz"
CHAINCODE_DIR="$PWD/chaincodes/coffee"

if [ ! -f "$CHAINCODE_PACKAGE" ]; then
    echo -e "${YELLOW}Chaincode package not found, checking alternatives...${NC}"
    
    # Look for package in chaincodes directory
    if [ -f "$CHAINCODE_DIR/coffee_1.0.tar.gz" ]; then
        echo -e "${GREEN}✓ Found package in chaincodes directory${NC}"
        CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee_1.0.tar.gz"
    elif [ -f "$CHAINCODE_DIR/coffee.tar.gz" ]; then
        echo -e "${GREEN}✓ Found package as coffee.tar.gz${NC}"
        CHAINCODE_PACKAGE="$CHAINCODE_DIR/coffee.tar.gz"
    else
        echo -e "${RED}✗ Chaincode package not found${NC}"
        echo ""
        echo "Expected locations:"
        echo "  • /tmp/coffee_1.0.tar.gz"
        echo "  • $CHAINCODE_DIR/coffee_1.0.tar.gz"
        echo ""
        echo "Please package the chaincode first:"
        echo "  cd chaincodes/coffee"
        echo "  peer lifecycle chaincode package coffee_1.0.tar.gz \\"
        echo "    --path . \\"
        echo "    --lang golang \\"
        echo "    --label coffee_1.0"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Using chaincode package: $CHAINCODE_PACKAGE${NC}"
echo ""

# Copy package to container if needed
if [ "$CHAINCODE_PACKAGE" != "/tmp/coffee_1.0.tar.gz" ]; then
    echo -e "${YELLOW}Copying chaincode package to peer container...${NC}"
    docker cp "$CHAINCODE_PACKAGE" peer0.ecta.cecbs.et:/tmp/coffee_1.0.tar.gz
    echo -e "${GREEN}✓ Package copied${NC}"
    echo ""
fi

# Install on ECTA peer
echo -e "${YELLOW}Installing chaincode on peer0.ecta.cecbs.et...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.0.tar.gz

# Get package ID
echo ""
echo -e "${YELLOW}Retrieving package ID...${NC}"
PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled \
    | grep "coffee" | awk '{print $3}' | sed 's/,//')

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}✗ Failed to get package ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Package ID: $PACKAGE_ID${NC}"
echo ""

# Approve for ECTA
echo -e "${YELLOW}Approving chaincode for ECTA...${NC}"
docker exec \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --package-id "$PACKAGE_ID" \
    --sequence 1

echo -e "${GREEN}✓ Approved for ECTA${NC}"
echo ""

# Check commit readiness
echo -e "${YELLOW}Checking commit readiness...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 1 \
    --output json

echo ""

# Commit chaincode
echo -e "${YELLOW}Committing chaincode to channel...${NC}"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 1 \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt

echo -e "${GREEN}✓ Chaincode committed${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 3

VERIFY_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null || echo "")

if echo "$VERIFY_CHECK" | grep -q "Version:"; then
    VERSION=$(echo "$VERIFY_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
    SEQUENCE=$(echo "$VERIFY_CHECK" | grep -oP 'Sequence: \K[0-9]+' || echo "unknown")
    echo -e "${GREEN}✓ Deployment verified${NC}"
    echo "  • Version: $VERSION"
    echo "  • Sequence: $SEQUENCE"
else
    echo -e "${RED}✗ Deployment verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Chaincode deployment completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
