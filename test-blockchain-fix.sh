#!/bin/bash

echo "=== BLOCKCHAIN CONNECTION TEST ==="
echo

echo "1. Checking if coffee-chaincode container exists..."
docker ps -a | grep coffee-chaincode

echo
echo "2. Checking if coffee-chaincode is running..."
docker logs coffee-chaincode 2>&1 | tail -5

echo
echo "3. Testing peer to chaincode connection..."
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetAllExporters"]}' 2>&1 | head -20

echo
echo "4. Checking peer logs for connection status..."
docker logs peer0.ecta.cecbs.et 2>&1 | grep -i "f18babbd" | tail -3

echo
echo "=== TEST COMPLETE ==="
