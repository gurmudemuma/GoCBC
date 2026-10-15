#!/bin/bash
docker stop coffee-chaincode 2>/dev/null
docker rm coffee-chaincode 2>/dev/null
docker run -d --name coffee-chaincode --network cecbs-network -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME=coffee_1.0:latest \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  coffee-chaincode:latest
sleep 3
docker ps | grep coffee-chaincode && echo "✅ Chaincode restarted without TLS"
