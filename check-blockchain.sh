#!/bin/bash

##############################################################################
# Blockchain Network Status Check
# Verifies all required Hyperledger Fabric components are running
##############################################################################

echo "=========================================="
echo "Blockchain Network Status Check"
echo "=========================================="
echo ""

# Check Docker
echo "[1] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi
echo "✅ Docker is installed"
echo ""

# Check running containers
echo "[2] Checking Hyperledger Fabric containers..."
CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|ca" || true)

if [ -z "$CONTAINERS" ]; then
    echo "❌ No Hyperledger Fabric containers are running"
    echo ""
    echo "Expected containers:"
    echo "  - orderer.cecbs.et (Orderer)"
    echo "  - peer0.ecta.cecbs.et (ECTA peer)"
    echo "  - peer0.ecx.cecbs.et (ECX peer)"
    echo "  - peer0.banks.cecbs.et (Banks peer)"
    echo "  - peer0.nbe.cecbs.et (NBE peer)"
    echo "  - peer0.customs.cecbs.et (Customs peer)"
    echo "  - peer0.shipping.cecbs.et (Shipping peer)"
    echo "  - ca.ecta.cecbs.et (ECTA CA)"
    echo "  - ca.ecx.cecbs.et (ECX CA)"
    echo "  - ca.banks.cecbs.et (Banks CA)"
    echo "  - ca.nbe.cecbs.et (NBE CA)"
    echo "  - ca.customs.cecbs.et (Customs CA)"
    echo "  - ca.shipping.cecbs.et (Shipping CA)"
    echo ""
    echo "To start the blockchain network, run:"
    echo "  cd /home/guda/GoCBC/blockchain"
    echo "  ./network.sh up createChannel"
    echo ""
    exit 1
fi

echo "✅ Hyperledger Fabric containers found:"
echo "$CONTAINERS"
echo ""

# Count peer organizations
PEER_COUNT=$(docker ps --format "{{.Names}}" | grep -c "^peer0\." || true)
echo "[3] Checking peer organizations..."
echo "Found $PEER_COUNT peer organizations running"

if [ "$PEER_COUNT" -lt 6 ]; then
    echo "⚠️  Expected 6 peer organizations, found $PEER_COUNT"
    echo "Missing peers may cause blockchain operations to fail"
else
    echo "✅ All 6 peer organizations are running"
fi
echo ""

# Check orderer
echo "[4] Checking orderer..."
if docker ps --format "{{.Names}}" | grep -q "orderer"; then
    echo "✅ Orderer is running"
else
    echo "❌ Orderer is not running"
fi
echo ""

# Check CouchDB instances
echo "[5] Checking CouchDB state databases..."
COUCHDB_COUNT=$(docker ps --format "{{.Names}}" | grep -c "couchdb" || true)
if [ "$COUCHDB_COUNT" -gt 0 ]; then
    echo "✅ Found $COUCHDB_COUNT CouchDB instances"
    docker ps --format "table {{.Names}}\t{{.Ports}}" | grep couchdb
else
    echo "⚠️  No CouchDB instances found (may be using LevelDB)"
fi
echo ""

# Check API connection to blockchain
echo "[6] Checking API blockchain connection..."
if [ -f "/home/guda/GoCBC/api/.env" ]; then
    FABRIC_NETWORK=$(grep "^FABRIC_NETWORK_PATH=" /home/guda/GoCBC/api/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | sed 's|^\.\.||')
    FABRIC_MSP=$(grep "^FABRIC_MSP_ID=" /home/guda/GoCBC/api/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -n "$FABRIC_MSP" ]; then
        echo "  MSP ID: $FABRIC_MSP"
    fi
    
    if [ -n "$FABRIC_NETWORK" ]; then
        # Resolve relative path from API directory
        FULL_NETWORK_PATH="/home/guda/GoCBC${FABRIC_NETWORK}"
        echo "  Network config: $FULL_NETWORK_PATH"
        
        if [ -d "$FULL_NETWORK_PATH" ]; then
            echo "✅ Network configuration directory exists"
        else
            echo "❌ Network configuration directory not found: $FULL_NETWORK_PATH"
        fi
    else
        echo "⚠️  FABRIC_NETWORK_PATH not set in .env"
    fi
else
    echo "⚠️  API .env file not found"
fi
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
if [ "$PEER_COUNT" -ge 6 ] && docker ps --format "{{.Names}}" | grep -q "orderer"; then
    echo "✅ Blockchain network is ready for testing"
    echo ""
    echo "You can now run the end-to-end test:"
    echo "  cd /home/guda/GoCBC"
    echo "  bash end-to-end-test.sh"
else
    echo "❌ Blockchain network is not ready"
    echo ""
    echo "Please start the network first:"
    echo "  cd /home/guda/GoCBC/blockchain"
    echo "  ./network.sh up createChannel -ca -s couchdb"
    echo ""
    echo "Then deploy the chaincode:"
    echo "  ./network.sh deployCC -ccn coffee -ccp ../chaincode -ccl go"
fi
echo ""
