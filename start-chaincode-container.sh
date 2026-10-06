#!/bin/bash
# Start chaincode container with the correct version matching blockchain deployment

DEPLOYED_VERSION="1.20"
PACKAGE_ID="coffee_1.20:2e5f9ccea8ac289bb6036f0258aa13961a56fdb1677ceb6bf933b05d3f243268"

echo "Starting chaincode container v${DEPLOYED_VERSION}..."

# Remove old container if exists
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

# Start new container with matching version
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CORE_CHAINCODE_ID_NAME=${PACKAGE_ID} \
  -e CORE_CHAINCODE_LOGGING_LEVEL=INFO \
  coffee-chaincode:${DEPLOYED_VERSION}

if [ $? -eq 0 ]; then
    echo "✅ Chaincode container started successfully"
    echo "Version: ${DEPLOYED_VERSION}"
    echo "Package ID: ${PACKAGE_ID}"
    
    # Wait and check logs
    sleep 3
    echo ""
    echo "Container logs:"
    docker logs coffee-chaincode 2>&1 | tail -10
else
    echo "❌ Failed to start chaincode container"
    exit 1
fi
