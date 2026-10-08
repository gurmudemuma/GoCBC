#!/bin/bash
# Complete fix and start - does everything step by step

set -e

cd /home/guda/GoCBC

echo "=========================================="
echo "🔧 COMPLETE SYSTEM FIX AND START"
echo "=========================================="

# Step 1: Clean everything
echo ""
echo "Step 1: Cleaning all volumes and containers..."
docker-compose -f docker-compose-fabric.yml down -v
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
echo "✅ Cleaned"

# Step 2: Start Fabric network
echo ""
echo "Step 2: Starting Fabric network..."
docker-compose -f docker-compose-fabric.yml up -d
echo "Waiting 30 seconds for network to initialize..."
sleep 30
echo "✅ Network started"

# Step 3: Run migrations directly
echo ""
echo "Step 3: Running database migrations..."
docker exec cecbs-postgres psql -U cecbs -d cecbs -f /docker-entrypoint-initdb.d/000_initial_schema.sql 2>&1 | grep -E "CREATE|ERROR" | head -20
echo "✅ Migration executed"

# Step 4: Create channel properly
echo ""
echo "Step 4: Creating blockchain channel..."

# Generate block
docker run --rm -v "$(pwd):/work" -w /work hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
        -outputBlock /work/blockchain/channel-artifacts/coffeechannel.block \
        -channelID coffeechannel \
        -configPath /work/blockchain

# Join orderer
docker run --rm --network cecbs-network -v "$(pwd)/blockchain:/work" hyperledger/fabric-tools:2.5 \
    osnadmin channel join \
        --channelID coffeechannel \
        --config-block /work/channel-artifacts/coffeechannel.block \
        -o orderer.cecbs.et:7053 \
        --ca-file /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
        --client-cert /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.crt \
        --client-key /work/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/server.key

sleep 10

# Join all peers
for org in ecta ecx banks nbe customs shipping; do
    docker cp blockchain/channel-artifacts/coffeechannel.block peer0.${org}.cecbs.et:/tmp/
    
    case $org in
        ecta) MSP=ECTAMSP ;;
        ecx) MSP=ECXMSP ;;
        banks) MSP=BanksMSP ;;
        nbe) MSP=NBEMSP ;;
        customs) MSP=CustomsMSP ;;
        shipping) MSP=ShippingMSP ;;
    esac
    
    docker exec -e CORE_PEER_LOCALMSPID=$MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer channel join -b /tmp/coffeechannel.block
    
    echo "  ✅ $org joined"
done

echo "✅ Channel created"

# Step 5: Deploy chaincode
echo ""
echo "Step 5: Deploying chaincode..."
bash deploy-chaincode.sh 2>&1 | tail -20

echo ""
echo "=========================================="
echo "✅ SYSTEM READY"
echo "=========================================="
echo ""
echo "Starting API and UI..."
cd api && npm start > /tmp/api.log 2>&1 &
cd ../ui && npm run dev > /tmp/ui.log 2>&1 &

echo ""
echo "System URLs:"
echo "  UI: http://localhost:3000"
echo "  API: http://localhost:3001"
echo ""
