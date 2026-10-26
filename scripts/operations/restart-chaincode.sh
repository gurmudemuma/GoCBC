#!/bin/bash
# Restart chaincode with correct version

echo "🛑 Stopping old chaincode..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

echo "🔨 Building chaincode v1.93..."
cd chaincodes/coffee
docker build -t coffee-chaincode:1.93 . || exit 1
cd ../..

echo "🚀 Starting chaincode v1.93..."
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.93:2bd58e3c5096bff38d3bfb12edcc2f08b11c7c9fa234044d6835973090f7388d" \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  coffee-chaincode:1.93

sleep 5

echo "✅ Chaincode status:"
docker ps | grep coffee
echo ""
echo "📋 Chaincode logs:"
docker logs coffee-chaincode 2>&1 | tail -5
