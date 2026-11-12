#!/bin/bash

################################################################################
# Complete Fresh Start Script for CECBS
# This script tears down everything and starts completely fresh
################################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}║           COMPLETE FRESH START - CECBS System Reset                  ║${NC}"
echo -e "${BLUE}║                                                                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# Compose command detection
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}✗ Neither 'docker compose' nor 'docker-compose' is available${NC}"
    exit 1
fi

echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}  WARNING: This will completely wipe all blockchain data!${NC}"
echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "This script will:"
echo "  1. Stop all Docker containers"
echo "  2. Remove all volumes (blockchain data, database, etc.)"
echo "  3. Clean all network artifacts"
echo "  4. Remove compiled chaincode packages"
echo "  5. Clear all state tracking files"
echo "  6. Rebuild and restart everything from scratch"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 1: Stopping All Services${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Stop all containers
echo -e "${YELLOW}▶ Stopping all Docker containers...${NC}"
$COMPOSE -f docker-compose-fabric.yml down 2>/dev/null || true
$COMPOSE -f docker-compose-db.yml down 2>/dev/null || true
docker stop $(docker ps -aq --filter "name=cecbs" --filter "name=peer0" --filter "name=orderer" --filter "name=couchdb" --filter "name=coffee-chaincode") 2>/dev/null || true
echo -e "${GREEN}✓ All containers stopped${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 2: Removing Containers and Volumes${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Remove containers
echo -e "${YELLOW}▶ Removing all containers...${NC}"
$COMPOSE -f docker-compose-fabric.yml down -v --remove-orphans 2>/dev/null || true
$COMPOSE -f docker-compose-db.yml down -v --remove-orphans 2>/dev/null || true
docker rm -f $(docker ps -aq --filter "name=cecbs" --filter "name=peer0" --filter "name=orderer" --filter "name=couchdb" --filter "name=coffee-chaincode") 2>/dev/null || true
echo -e "${GREEN}✓ Containers removed${NC}"

# Remove volumes
echo -e "${YELLOW}▶ Removing all Docker volumes...${NC}"
docker volume rm $(docker volume ls -q --filter "name=cecbs" --filter "name=peer0" --filter "name=orderer" --filter "name=couchdb") 2>/dev/null || true
echo -e "${GREEN}✓ Volumes removed${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 3: Cleaning Local Artifacts${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Clean blockchain artifacts
echo -e "${YELLOW}▶ Cleaning blockchain channel artifacts...${NC}"
rm -rf blockchain/channel-artifacts/*.block 2>/dev/null || true
rm -rf blockchain/channel-artifacts/*.tx 2>/dev/null || true
echo -e "${GREEN}✓ Channel artifacts cleaned${NC}"

# Clean chaincode packages and state files
echo -e "${YELLOW}▶ Cleaning chaincode packages...${NC}"
rm -f chaincodes/coffee/*.tar.gz 2>/dev/null || true
rm -f chaincodes/coffee/.last_deployed 2>/dev/null || true
rm -rf chaincodes/coffee/pkg-temp 2>/dev/null || true
rm -rf chaincodes/coffee/code-temp 2>/dev/null || true
echo -e "${GREEN}✓ Chaincode packages cleaned${NC}"

# Clean peer data directories (if they exist locally)
echo -e "${YELLOW}▶ Cleaning peer data directories...${NC}"
rm -rf blockchain/organizations/peerOrganizations/*/peers/*/data 2>/dev/null || true
rm -rf blockchain/organizations/peerOrganizations/*/peers/*/production 2>/dev/null || true
echo -e "${GREEN}✓ Peer data cleaned${NC}"

# Clean orderer data
echo -e "${YELLOW}▶ Cleaning orderer data...${NC}"
rm -rf blockchain/organizations/ordererOrganizations/*/orderers/*/data 2>/dev/null || true
rm -rf blockchain/organizations/ordererOrganizations/*/orderers/*/production 2>/dev/null || true
echo -e "${GREEN}✓ Orderer data cleaned${NC}"

# Clean API build artifacts
echo -e "${YELLOW}▶ Cleaning API build artifacts...${NC}"
rm -rf api/dist 2>/dev/null || true
rm -f api/.tsbuildinfo 2>/dev/null || true
echo -e "${GREEN}✓ API artifacts cleaned${NC}"

# Clean any PID files
echo -e "${YELLOW}▶ Cleaning PID files...${NC}"
rm -f api/.api.pid 2>/dev/null || true
rm -f ui/.ui.pid 2>/dev/null || true
echo -e "${GREEN}✓ PID files cleaned${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 4: Docker System Cleanup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}▶ Pruning Docker system...${NC}"
docker system prune -f 2>/dev/null || true
echo -e "${GREEN}✓ Docker system pruned${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Cleanup Complete! Starting Fresh Build...${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

sleep 2

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 5: Fresh Installation${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Run the regular startup script
echo -e "${YELLOW}▶ Running complete system startup...${NC}"
echo ""

if [ -f "$REPO_ROOT/start-all.sh" ]; then
    bash "$REPO_ROOT/start-all.sh"
else
    echo -e "${RED}✗ start-all.sh not found!${NC}"
    echo "Please run the startup manually."
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                       ║${NC}"
echo -e "${GREEN}║              FRESH START COMPLETE - System Ready!                     ║${NC}"
echo -e "${GREEN}║                                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

exit 0
