#!/bin/bash

#####################################################################
# GoCBC Complete System Shutdown Script
#####################################################################

set -e

echo "========================================="
echo "GoCBC System Shutdown"
echo "========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /home/guda/GoCBC

# Step 1: Stop Web Portals
echo ""
echo "${YELLOW}Step 1: Stopping Web Portals${NC}"
echo "-------------------------------------------"

# Find and kill all npm/node processes for portals
echo "Stopping portal processes..."
pkill -f "npm run dev" || true
pkill -f "next dev" || true
sleep 2
echo "${GREEN}✓ Portal processes stopped${NC}"

# Step 2: Stop Docker Containers
echo ""
echo "${YELLOW}Step 2: Stopping Docker Containers${NC}"
echo "-------------------------------------------"

docker-compose -f docker-compose-fabric.yml down

echo "${GREEN}✓ All Docker containers stopped${NC}"

# Step 3: Clean up log files (optional)
echo ""
echo "${YELLOW}Step 3: Cleaning up logs${NC}"
echo "-------------------------------------------"

rm -f /tmp/*-portal.log
echo "${GREEN}✓ Log files cleaned${NC}"

echo ""
echo "========================================="
echo "${GREEN}GoCBC System Shutdown Complete${NC}"
echo "========================================="
echo ""
echo "To restart the system, run: ./start-all.sh"
echo ""
