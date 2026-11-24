#!/bin/bash
set -e

echo "=========================================="
echo "BLOCKCHAIN TLS MISMATCH - COMPLETE FIX"
echo "=========================================="
echo ""

# Step 1: Clear all peer caches
echo "[1/5] Clearing all peer caches..."
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
  docker exec $peer rm -rf /var/hyperledger/production/externalbuilder/builds/* 2>/dev/null || true
done
echo "✓ Caches cleared"
echo ""

# Step 2: Update docker-compose with v2.21 CCID
echo "[2/5] Updating docker-compose for v2.21..."
cd /home/guda/GoCBC
sed -i 's|image: coffee-chaincode:.*|image: coffee-chaincode:2.21|' docker-compose-fabric.yml
sed -i 's|CORE_CHAINCODE_ID_NAME=coffee_[0-9.]*:[a-f0-9]*|CORE_CHAINCODE_ID_NAME=coffee_2.21:7fd9e44c15fd1d31530cca415fd93efc7f4ceb3cd75b39e9032eccebea698573|' docker-compose-fabric.yml
echo "✓ docker-compose updated to v2.21"
echo ""

# Step 3: Restart all peers
echo "[3/5] Restarting all peers..."
docker compose -f docker-compose-fabric.yml restart peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et
echo "✓ Peers restarted"
echo ""

# Step 4: Restart chaincode
echo "[4/5] Restarting chaincode..."
docker compose -f docker-compose-fabric.yml stop coffee-chaincode
docker compose -f docker-compose-fabric.yml rm -f coffee-chaincode
docker compose -f docker-compose-fabric.yml up -d coffee-chaincode
echo "✓ Chaincode restarted"
echo ""

# Step 5: Wait and show status
echo "[5/5] Waiting 15 seconds for services to stabilize..."
sleep 15
echo ""

echo "=========================================="
echo "Chaincode Status:"
docker logs coffee-chaincode 2>&1 | tail -5
echo ""
echo "Committed Version:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1 | grep Version
echo ""
echo "=========================================="
echo "FIX COMPLETE"
echo "=========================================="
echo ""
echo "Now test with: bash test-api-blockchain.sh"
