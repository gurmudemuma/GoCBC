#!/bin/bash

# Start the coffee chaincode container with correct configuration

set -e

cd /home/guda/GoCBC

# Stop and remove any existing container
docker rm -f coffee-chaincode 2>/dev/null || true

# Calculate the chaincode ID hash
CCID=$(cat chaincode-package/code.tar.gz | sha256sum | awk '{print $1}')

echo "Starting coffee chaincode container..."
echo "CCID: coffee_1.13:${CCID}"

docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.13:${CCID}" \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  coffee-chaincode:1.13

echo "✓ Container started"
echo ""
echo "Waiting for chaincode to initialize..."
sleep 3

echo ""
echo "Chaincode logs:"
docker logs --tail 20 coffee-chaincode

echo ""
echo "Container status:"
docker ps --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}"
