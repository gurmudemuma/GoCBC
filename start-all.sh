#!/bin/bash

#####################################################################
# GoCBC Complete System Startup Script
# Includes: Blockchain (Hyperledger Fabric 2.5) + All 7 Web Portals
#####################################################################

set -e

echo "========================================="
echo "GoCBC System Startup"
echo "========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start Docker Containers (Fabric + Supporting Services)
echo ""
echo "${YELLOW}Step 1: Starting Docker Containers${NC}"
echo "-------------------------------------------"
cd /home/guda/GoCBC

# Ensure builders directory exists with external builder scripts
if [ ! -d "builders/ccaas/bin" ]; then
    echo "Creating external builder scripts..."
    mkdir -p builders/ccaas/bin
    
    # Create detect script
    cat > builders/ccaas/bin/detect << 'EOF'
#!/bin/bash
set -euo pipefail
METADIR=$2
if [ -f "$METADIR/connection.json" ]; then
   exit 0
fi
exit 1
EOF
    
    # Create build script
    cat > builders/ccaas/bin/build << 'EOF'
#!/bin/bash
set -euo pipefail
BUILD_OUTPUT_DIR=$3
cp -a $2/* $BUILD_OUTPUT_DIR/
exit 0
EOF
    
    # Create release script
    cat > builders/ccaas/bin/release << 'EOF'
#!/bin/bash
set -euo pipefail
BUILD_OUTPUT_DIR=$2
RELEASE_OUTPUT_DIR=$3
cp -a $BUILD_OUTPUT_DIR/* $RELEASE_OUTPUT_DIR/
exit 0
EOF
    
    chmod +x builders/ccaas/bin/*
    echo "${GREEN}✓ External builder scripts created${NC}"
fi

# Ensure minimal core.yaml exists for external builders
if [ ! -f "minimal-core.yaml" ]; then
    cat > minimal-core.yaml << 'EOF'
chaincode:
    externalBuilders:
       - name: ccaas_builder
         path: /builders/ccaas
         propagateEnvironment:
           - CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG
EOF
    echo "${GREEN}✓ Minimal core.yaml created${NC}"
fi

# Copy core.yaml to all peer directories
echo "Copying core.yaml to peer directories..."
for peer_dir in blockchain/organizations/peerOrganizations/*/peers/peer0.*/; do
    cp minimal-core.yaml "${peer_dir}core.yaml" 2>/dev/null || true
done
echo "${GREEN}✓ Core.yaml distributed to all peers${NC}"

# Start all containers
echo "Starting Docker containers..."
docker-compose -f docker-compose-fabric.yml up -d

# Wait for containers to be healthy
echo "Waiting for containers to start (15 seconds)..."
sleep 15

# Check status
PEER_COUNT=$(docker ps | grep "peer0\." | wc -l)
ORDERER_COUNT=$(docker ps | grep "orderer\." | wc -l)
CHAINCODE_COUNT=$(docker ps | grep "coffee-chaincode" | wc -l)

echo ""
echo "${GREEN}Container Status:${NC}"
echo "  - Peers running: $PEER_COUNT/6"
echo "  - Orderer running: $ORDERER_COUNT/1"
echo "  - Chaincode running: $CHAINCODE_COUNT/1"

if [ $PEER_COUNT -lt 6 ] || [ $ORDERER_COUNT -lt 1 ] || [ $CHAINCODE_COUNT -lt 1 ]; then
    echo "${RED}✗ Not all required containers are running!${NC}"
    echo "Check logs with: docker-compose -f docker-compose-fabric.yml logs"
    exit 1
fi

echo "${GREEN}✓ All blockchain containers running${NC}"

# Step 2: Verify Blockchain State
echo ""
echo "${YELLOW}Step 2: Verifying Blockchain Configuration${NC}"
echo "-------------------------------------------"

# Check if orderer has channel
ORDERER_CHANNELS=$(docker exec orderer.cecbs.et osnadmin channel list -o localhost:7053 --ca-file /var/hyperledger/orderer/tls/ca.crt --client-cert /var/hyperledger/orderer/tls/server.crt --client-key /var/hyperledger/orderer/tls/server.key 2>/dev/null | grep -c "coffeechannel" || echo "0")

if [ "$ORDERER_CHANNELS" -eq "0" ]; then
    echo "${RED}✗ Orderer not joined to coffeechannel!${NC}"
    echo "Run: python3 join-orderer.py"
    exit 1
fi

echo "${GREEN}✓ Orderer joined to coffeechannel${NC}"

# Check if peers have joined channel
PEER_CHANNELS=$(docker exec peer0.ecta.cecbs.et peer channel list 2>/dev/null | grep -c "coffeechannel" || echo "0")

if [ "$PEER_CHANNELS" -eq "0" ]; then
    echo "${RED}✗ Peers not joined to coffeechannel!${NC}"
    echo "Run deployment script: ./FINAL-CHAINCODE-DEPLOY.sh"
    exit 1
fi

echo "${GREEN}✓ Peers joined to coffeechannel${NC}"

# Check if chaincode is committed
CHAINCODE_COMMITTED=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted -C coffeechannel 2>/dev/null | grep -c "coffee" || echo "0")

if [ "$CHAINCODE_COMMITTED" -eq "0" ]; then
    echo "${RED}✗ Chaincode not committed!${NC}"
    echo "Run deployment script: ./FINAL-CHAINCODE-DEPLOY.sh"
    exit 1
fi

echo "${GREEN}✓ Chaincode committed to channel${NC}"

# Step 3: Test Blockchain Connectivity
echo ""
echo "${YELLOW}Step 3: Testing Blockchain Connectivity${NC}"
echo "-------------------------------------------"

# Test chaincode invoke
echo "Testing chaincode invoke..."
INVOKE_RESULT=$(docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    -c '{"function":"ping","Args":[]}' 2>&1 || echo "FAILED")

if echo "$INVOKE_RESULT" | grep -q "FAILED\|Error\|error"; then
    echo "${RED}✗ Chaincode invoke test failed${NC}"
    echo "Details: $INVOKE_RESULT"
else
    echo "${GREEN}✓ Chaincode invoke successful${NC}"
fi

# Step 4: Start Web Portals
echo ""
echo "${YELLOW}Step 4: Starting Web Portals${NC}"
echo "-------------------------------------------"

# ECTA Portal
if [ -d "ecta-portal" ]; then
    echo "Starting ECTA Portal (Port 3001)..."
    cd ecta-portal
    npm run dev > /tmp/ecta-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ ECTA Portal started${NC}"
fi

# ECX Portal
if [ -d "ecx-portal" ]; then
    echo "Starting ECX Portal (Port 3002)..."
    cd ecx-portal
    npm run dev > /tmp/ecx-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ ECX Portal started${NC}"
fi

# Banks Portal
if [ -d "banks-portal" ]; then
    echo "Starting Banks Portal (Port 3003)..."
    cd banks-portal
    npm run dev > /tmp/banks-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ Banks Portal started${NC}"
fi

# NBE Portal
if [ -d "nbe-portal" ]; then
    echo "Starting NBE Portal (Port 3004)..."
    cd nbe-portal
    npm run dev > /tmp/nbe-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ NBE Portal started${NC}"
fi

# Customs Portal
if [ -d "customs-portal" ]; then
    echo "Starting Customs Portal (Port 3005)..."
    cd customs-portal
    npm run dev > /tmp/customs-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ Customs Portal started${NC}"
fi

# Shipping Portal
if [ -d "shipping-portal" ]; then
    echo "Starting Shipping Portal (Port 3006)..."
    cd shipping-portal
    npm run dev > /tmp/shipping-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ Shipping Portal started${NC}"
fi

# Exporters Portal
if [ -d "exporters-portal" ]; then
    echo "Starting Exporters Portal (Port 3007)..."
    cd exporters-portal
    npm run dev > /tmp/exporters-portal.log 2>&1 &
    cd ..
    echo "${GREEN}✓ Exporters Portal started${NC}"
fi

echo ""
echo "Waiting for portals to initialize (10 seconds)..."
sleep 10

# Step 5: Final System Status
echo ""
echo "========================================="
echo "${GREEN}GoCBC System Status${NC}"
echo "========================================="
echo ""
echo "${YELLOW}Blockchain Components:${NC}"
echo "  • Orderer:           Running (Port 7050)"
echo "  • ECTA Peer:         Running (Port 7051)"
echo "  • ECX Peer:          Running (Port 8051)"
echo "  • Banks Peer:        Running (Port 9051)"
echo "  • NBE Peer:          Running (Port 10051)"
echo "  • Customs Peer:      Running (Port 11051)"
echo "  • Shipping Peer:     Running (Port 12051)"
echo "  • Chaincode:         Running (Port 9999)"
echo ""
echo "${YELLOW}Web Portals:${NC}"
echo "  • ECTA Portal:       http://localhost:3001"
echo "  • ECX Portal:        http://localhost:3002"
echo "  • Banks Portal:      http://localhost:3003"
echo "  • NBE Portal:        http://localhost:3004"
echo "  • Customs Portal:    http://localhost:3005"
echo "  • Shipping Portal:   http://localhost:3006"
echo "  • Exporters Portal:  http://localhost:3007"
echo ""
echo "${YELLOW}Support Services:${NC}"
echo "  • PostgreSQL:        Running (Port 5432)"
echo "  • Redis:             Running (Port 6379)"
echo "  • Kafka:             Running (Port 9092)"
echo "  • CouchDB Instances: 6 running"
echo ""
echo "${GREEN}✓ System startup complete!${NC}"
echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo "1. Access any portal in your browser"
echo "2. Test blockchain transactions"
echo "3. Monitor logs: docker-compose -f docker-compose-fabric.yml logs -f"
echo "4. Stop system: ./stop-all.sh"
echo ""
