#!/bin/bash
# Quick fix for chaincode connection issue
# Updates the chaincode container with the correct package ID

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Fixing Chaincode Connection Issue ===${NC}\n"

# Get the actual committed package ID from the blockchain
echo "1. Querying committed chaincode package ID..."
COMMITTED_PKG_ID=$(docker exec \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer lifecycle chaincode querycommitted -C coffeechannel -n coffee --output json 2>/dev/null \
  | grep -o '"package_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$COMMITTED_PKG_ID" ]; then
  echo -e "${RED}❌ Could not find committed chaincode${NC}"
  echo "The chaincode may need to be deployed first."
  echo "Run: ./deploy-chaincode.sh"
  exit 1
fi

echo -e "${GREEN}✓ Found committed package ID: ${COMMITTED_PKG_ID}${NC}\n"

# Check current chaincode container
echo "2. Checking current chaincode container..."
CURRENT_CCID=$(docker exec coffee-chaincode printenv CORE_CHAINCODE_ID_NAME 2>/dev/null || echo "")
echo "   Current: $CURRENT_CCID"
echo "   Expected: $COMMITTED_PKG_ID"

if [ "$CURRENT_CCID" = "$COMMITTED_PKG_ID" ]; then
  echo -e "${GREEN}✓ Package IDs match! The issue might be elsewhere.${NC}"
  echo -e "\nTrying to restart the chaincode container..."
  docker restart coffee-chaincode
  sleep 3
  docker logs coffee-chaincode --tail 10
  exit 0
fi

echo -e "${YELLOW}⚠️  Package ID mismatch detected!${NC}\n"

# Update docker-compose file
echo "3. Updating docker-compose-fabric.yml..."
cp docker-compose-fabric.yml docker-compose-fabric.yml.bak.$(date +%s)

# Update the CORE_CHAINCODE_ID_NAME
sed -i "s|CORE_CHAINCODE_ID_NAME=coffee_.*|CORE_CHAINCODE_ID_NAME=${COMMITTED_PKG_ID}|" docker-compose-fabric.yml

echo -e "${GREEN}✓ Updated docker-compose-fabric.yml${NC}\n"

# Restart chaincode container
echo "4. Restarting chaincode container..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

docker compose -f docker-compose-fabric.yml up -d coffee-chaincode

sleep 5

# Verify
if docker ps | grep -q coffee-chaincode; then
  echo -e "${GREEN}✓ Chaincode container restarted successfully${NC}\n"
  echo "Container logs:"
  docker logs coffee-chaincode --tail 10
  
  echo -e "\n${GREEN}=== Fix Complete ===${NC}"
  echo "The chaincode should now respond to queries."
  echo "Test by accessing the UI: http://localhost:3000"
else
  echo -e "${RED}❌ Chaincode container failed to start${NC}"
  echo "Check logs: docker logs coffee-chaincode"
  exit 1
fi
