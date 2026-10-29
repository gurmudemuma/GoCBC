#!/bin/bash

echo "================================================================"
echo "  Restarting Blockchain Network to Fix Endorsement Issues"
echo "================================================================"
echo ""

cd /home/guda/GoCBC

echo "1. Restarting orderer..."
docker restart orderer.cecbs.et
sleep 3

echo "2. Restarting all peers..."
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
  echo "   Restarting $peer..."
  docker restart $peer
done

sleep 5

echo ""
echo "3. Waiting for network to stabilize..."
sleep 10

echo ""
echo "4. Testing chaincode query..."
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllContracts","Args":[]}' 2>&1 | head -5

echo ""
echo "✓ Blockchain network restarted"
echo ""
echo "Now run: bash continue-workflow-from-existing.sh"
