#!/bin/bash

################################################################################
# Sync Chaincode CCID Script
# Automatically updates docker-compose-fabric.yml with the current committed
# chaincode package ID from the blockchain
################################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Chaincode CCID Sync${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

PEER_CONTAINER="peer0.ecta.cecbs.et"
COMPOSE_FILE="/home/guda/GoCBC/docker-compose-fabric.yml"

# Check if peer container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${PEER_CONTAINER}$"; then
    echo -e "${RED}ERROR: Peer container ${PEER_CONTAINER} is not running${NC}"
    echo "Start blockchain first: bash start-all.sh --skip-build"
    exit 1
fi

echo -e "${YELLOW}[1/4] Querying committed chaincode from blockchain...${NC}"
PACKAGE_ID=$(docker exec $PEER_CONTAINER peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>/dev/null | \
    grep "Package ID:" | awk -F': ' '{print $2}' | tr -d ', ')

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}ERROR: Could not get committed package ID${NC}"
    echo "Is the chaincode deployed? Check with:"
    echo "  docker exec $PEER_CONTAINER peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee"
    exit 1
fi

echo -e "${GREEN}✓ Found committed package ID:${NC} $PACKAGE_ID"
echo ""

# Extract version from package ID (e.g., coffee_2.20:hash → 2.20)
VERSION=$(echo $PACKAGE_ID | grep -oP 'coffee_\K[0-9.]+')

if [ -z "$VERSION" ]; then
    echo -e "${RED}ERROR: Could not extract version from package ID${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/4] Extracted version:${NC} $VERSION"
echo ""

# Backup current docker-compose file
BACKUP_FILE="${COMPOSE_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
cp "$COMPOSE_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backed up docker-compose to:${NC} $BACKUP_FILE"
echo ""

# Update docker-compose-fabric.yml
echo -e "${YELLOW}[3/4] Updating docker-compose-fabric.yml...${NC}"

# Update image version
sed -i "s|image: coffee-chaincode:[0-9.]*|image: coffee-chaincode:$VERSION|" "$COMPOSE_FILE"

# Update CORE_CHAINCODE_ID_NAME
sed -i "s|CORE_CHAINCODE_ID_NAME=coffee_[0-9.]*:[a-f0-9]*|CORE_CHAINCODE_ID_NAME=$PACKAGE_ID|" "$COMPOSE_FILE"

echo -e "${GREEN}✓ docker-compose-fabric.yml updated${NC}"
echo ""

# Show what changed
echo -e "${YELLOW}[4/4] Changes made:${NC}"
echo "  Image version: coffee-chaincode:$VERSION"
echo "  CCID: $PACKAGE_ID"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  CCID Sync Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next step:${NC} Restart chaincode container"
echo "  bash restart-chaincode-fixed.sh"
echo ""
