#!/bin/bash

echo "================================================"
echo "Restarting Coffee Chaincode with Correct CCID"
echo "================================================"

cd /home/guda/GoCBC

echo ""
echo "[1/4] Stopping old chaincode container..."
docker compose -f docker-compose-fabric.yml stop coffee-chaincode
docker compose -f docker-compose-fabric.yml rm -f coffee-chaincode

echo ""
echo "[2/4] Starting chaincode with correct CCID..."
docker compose -f docker-compose-fabric.yml up -d coffee-chaincode

echo ""
echo "[3/4] Waiting for chaincode to start (5 seconds)..."
sleep 5

echo ""
echo "[4/4] Chaincode logs (last 30 lines):"
echo "--------------------------------------"
docker logs coffee-chaincode 2>&1 | tail -30

echo ""
echo "================================================"
echo "Chaincode restart complete"
echo "================================================"
echo ""
echo "Next: Wait 30 seconds for peer registration, then test:"
echo "  bash test-api-blockchain.sh"
