#!/bin/bash

echo "Fixing chaincode version mismatch..."
echo ""
echo "Committed: coffee v1.0 (on blockchain)"
echo "Running: coffee v1.20 (in container)"
echo ""
echo "Starting chaincode with correct version 1.0..."

# Stop and remove current container
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

# Start with correct version 1.0 and matching package ID
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.0:4518e3caef07a9d6a4258e5762ec1fa1cd931ffe14368dc86ca841702b2fa1c4" \
  -e CORE_CHAINCODE_LOGGING_LEVEL=INFO \
  coffee-chaincode:1.9-tls

if [ $? -eq 0 ]; then
    echo "✅ Chaincode started with version 1.0"
    sleep 3
    echo ""
    echo "Container status:"
    docker ps | grep coffee-chaincode
    echo ""
    echo "Container logs:"
    docker logs coffee-chaincode 2>&1 | head -10
else
    echo "❌ Failed to start chaincode"
    exit 1
fi
