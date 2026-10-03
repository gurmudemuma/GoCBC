#!/bin/bash

echo "=== Chaincode Connection Test ===" > /tmp/chaincode-test.log
echo "" >> /tmp/chaincode-test.log

echo "1. Checking chaincode container status:" >> /tmp/chaincode-test.log
docker ps -a | grep coffee-chaincode >> /tmp/chaincode-test.log 2>&1
echo "" >> /tmp/chaincode-test.log

echo "2. Chaincode container logs:" >> /tmp/chaincode-test.log
docker logs coffee-chaincode >> /tmp/chaincode-test.log 2>&1
echo "" >> /tmp/chaincode-test.log

echo "3. Network connectivity:" >> /tmp/chaincode-test.log
docker exec peer0.ecx.cecbs.et ping -c 2 coffee-chaincode >> /tmp/chaincode-test.log 2>&1
echo "" >> /tmp/chaincode-test.log

echo "4. Port check from peer:" >> /tmp/chaincode-test.log
docker exec peer0.ecx.cecbs.et nc -zv coffee-chaincode 9999 >> /tmp/chaincode-test.log 2>&1
echo "" >> /tmp/chaincode-test.log

echo "5. Peer logs (last 50 lines):" >> /tmp/chaincode-test.log
docker logs --tail 50 peer0.ecx.cecbs.et >> /tmp/chaincode-test.log 2>&1
echo "" >> /tmp/chaincode-test.log

echo "Test complete. Results saved to /tmp/chaincode-test.log"
cat /tmp/chaincode-test.log
