#!/bin/bash

echo "=========================================="
echo "Chaincode Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking if chaincode container exists..."
docker ps -a | grep coffee || echo "  No coffee container found"
echo ""

echo "2. Checking if chaincode image exists..."
docker images | grep coffee || echo "  No coffee image found"
echo ""

echo "3. Building chaincode image..."
cd /home/guda/GoCBC
docker build -t coffee-chaincode:1.9-tls chaincodes/coffee
echo ""

echo "4. Checking docker network..."
docker network ls | grep cecbs
echo ""

echo "5. Trying to start chaincode container..."
# Remove old container if exists
docker rm -f coffee-chaincode 2>/dev/null

# Start new container
docker run -d \
  --name coffee-chaincode \
  --network cecbs_cecbs \
  -p 9999:9999 \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.9_tls:2b094adc2b1d5c848eacf297c7ab1c1bcd2af67cb7f763f8f11c8e303a951db4" \
  -e CORE_CHAINCODE_LOGGING_LEVEL=INFO \
  coffee-chaincode:1.9-tls

echo ""
echo "6. Waiting 5 seconds for startup..."
sleep 5
echo ""

echo "7. Checking container status..."
docker ps -a | grep coffee
echo ""

echo "8. Checking container logs..."
docker logs coffee-chaincode 2>&1 | tail -20
echo ""

echo "9. Testing port 9999..."
nc -zv localhost 9999 2>&1 || echo "  Port 9999 not accessible"
echo ""

echo "10. Checking peer connection..."
docker logs peer0.ecx.cecbs.et 2>&1 | grep -i chaincode | tail -10
echo ""

echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
