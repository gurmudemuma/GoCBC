#!/bin/bash

set -e

echo "=== Fixing Chaincode TLS Configuration ==="

# 1. Stop and remove existing chaincode container
echo "1. Stopping existing chaincode container..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

# 2. Start chaincode with TLS certificates mounted
echo "2. Starting chaincode with TLS certificates..."
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME=coffee_1.0:latest \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CORE_CHAINCODE_TLS_ENABLED=true \
  -e CORE_CHAINCODE_TLS_CERT_FILE=/app/tls/server-cert.pem \
  -e CORE_CHAINCODE_TLS_KEY_FILE=/app/tls/server-key.pem \
  -v /home/guda/GoCBC/chaincodes/coffee/tls:/app/tls:ro \
  coffee-chaincode:latest

echo "3. Waiting for chaincode to start..."
sleep 5

# 4. Check if it's running
if docker ps | grep -q coffee-chaincode; then
    echo "✅ Chaincode container running with TLS"
    docker logs coffee-chaincode 2>&1 | tail -10
else
    echo "❌ Chaincode failed to start"
    docker logs coffee-chaincode 2>&1 | tail -20
    exit 1
fi

echo ""
echo "=== Chaincode TLS Fix Complete ==="
echo "The chaincode should now properly handle TLS connections"
