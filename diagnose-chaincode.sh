#!/bin/bash

echo "=== Chaincode Deployment Diagnostics ==="
echo ""

echo "1. Checking if chaincode container exists:"
docker ps -a | grep coffee-chaincode || echo "  No coffee-chaincode container found"
echo ""

echo "2. Checking chaincode container logs (if exists):"
docker logs coffee-chaincode 2>&1 | tail -50 || echo "  Container doesn't exist or no logs"
echo ""

echo "3. Checking if chaincode image was built:"
docker images | grep coffee-chaincode || echo "  No coffee-chaincode image found"
echo ""

echo "4. Checking peer logs for chaincode registration:"
docker logs peer0.ecta.cecbs.et 2>&1 | grep -i "chaincode\|register" | tail -20 || echo "  No relevant logs"
echo ""

echo "5. Checking connection.json TLS setting:"
cat chaincodes/coffee/connection.json
echo ""

echo "6. Checking docker-compose chaincode TLS setting:"
grep -A2 "CHAINCODE_TLS_DISABLED" docker-compose-fabric.yml
echo ""

echo "7. Testing manual chaincode query:"
docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"Args":["QueryAllLCs"]}' 2>&1 | head -20
echo ""

echo "8. Checking if chaincode is committed:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
    --channelID coffeechannel --name coffee 2>&1
echo ""

echo "9. Checking chaincode package on peer:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1
echo ""

echo "10. Network connectivity test (peer to chaincode DNS):"
docker exec peer0.ecta.cecbs.et getent hosts coffee-chaincode 2>&1 || echo "  DNS resolution failed"
echo ""
