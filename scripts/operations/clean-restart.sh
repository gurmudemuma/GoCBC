#!/bin/bash
# Clean restart script - resets blockchain network and starts fresh

set -e

echo "=========================================="
echo "🧹 CLEAN RESTART - Resetting System"
echo "=========================================="
echo ""

# Stop all services
echo "1. Stopping all services..."
killall -9 node 2>/dev/null || true
docker-compose -f docker-compose-fabric.yml down -v 2>/dev/null || true
docker rm -f coffee-chaincode 2>/dev/null || true
echo "   ✅ All services stopped"
echo ""

# Clean up volumes and data
echo "2. Cleaning up blockchain data..."
rm -rf blockchain/channel-artifacts/*.block 2>/dev/null || true
rm -rf blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/production 2>/dev/null || true
rm -rf blockchain/organizations/peerOrganizations/*/peers/*/production 2>/dev/null || true
echo "   ✅ Blockchain data cleaned"
echo ""

# Clean chaincode packages
echo "3. Cleaning old chaincode packages..."
rm -f chaincodes/coffee/coffee_*.tgz 2>/dev/null || true
rm -f chaincodes/coffee/coffee_*.tar.gz 2>/dev/null || true
echo "   ✅ Chaincode packages cleaned"
echo ""

# Start fresh
echo "=========================================="
echo "🚀 Starting Fresh System"
echo "=========================================="
echo ""

bash start-all.sh
