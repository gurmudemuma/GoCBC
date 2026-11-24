#!/bin/bash

echo "========================================"
echo "BLOCKCHAIN DIAGNOSTIC"
echo "========================================"
echo ""

echo "1. Committed Chaincode:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1 | grep Version
echo ""

echo "2. Docker Compose CCID:"
grep "CORE_CHAINCODE_ID_NAME" /home/guda/GoCBC/docker-compose-fabric.yml
echo ""

echo "3. Chaincode Container Status:"
docker ps --filter "name=coffee-chaincode" --format "{{.Names}}: {{.Status}}"
echo ""

echo "4. Chaincode Logs (last 10 lines):"
docker logs coffee-chaincode 2>&1 | tail -10
echo ""

echo "5. Peer Cache:"
docker exec peer0.ecta.cecbs.et ls /var/hyperledger/production/externalbuilder/builds/ 2>&1
echo ""

echo "6. Connection.json in Cache:"
docker exec peer0.ecta.cecbs.et sh -c "cat /var/hyperledger/production/externalbuilder/builds/coffee_2.21-*/bld/connection.json 2>/dev/null | grep -E 'address|tls_required'"
echo ""

echo "7. Quick Chaincode Test:"
timeout 10 docker exec peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee -c '{"Args":["GetAllExporters"]}' 2>&1 | head -5 || echo "TIMEOUT or ERROR"
echo ""

echo "========================================"
