#!/bin/bash

# Start Chaincode Container for v1.62

echo "Starting Coffee Chaincode v1.62 Container..."

# Remove existing container if any
docker rm -f coffee-chaincode 2>/dev/null

# Start new container
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.62:49263e3a4f3119a588510711e736a969a58fdf6bedddf7ac6a0125176756df99" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  coffee-chaincode:1.62

if [ $? -eq 0 ]; then
    echo "✅ Chaincode container started successfully"
    sleep 3
    echo ""
    echo "Container status:"
    docker ps | grep coffee-chaincode
    echo ""
    echo "Container logs:"
    docker logs coffee-chaincode
else
    echo "❌ Failed to start chaincode container"
    exit 1
fi
