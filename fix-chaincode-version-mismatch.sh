#!/bin/bash

# Fix chaincode version mismatch - redeploy with correct version 1.13

set -e

echo "============================================================================"
echo "  Fixing Chaincode Version Mismatch"
echo "============================================================================"

# Stop and remove old chaincode container
echo ""
echo "Step 1: Stopping old chaincode container..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

# Update metadata to version 1.13
echo ""
echo "Step 2: Updating chaincode metadata to version 1.13..."
cat > chaincode-package/metadata.json <<EOF
{
  "type": "ccaas",
  "label": "coffee_1.13"
}
EOF

echo "✓ Metadata updated"

# Rebuild chaincode Docker image with version 1.13
echo ""
echo "Step 3: Rebuilding chaincode Docker image..."
cd chaincodes/coffee
docker build -t coffee-chaincode:1.13 .
cd ../..

echo "✓ Chaincode image built: coffee-chaincode:1.13"

# Start chaincode container
echo ""
echo "Step 4: Starting new chaincode container..."
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CHAINCODE_ID=coffee_1.13:$(cat chaincode-package/code.tar.gz | sha256sum | awk '{print $1}') \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  coffee-chaincode:1.13

echo "✓ Chaincode container started"

# Give it a moment to start
echo ""
echo "Waiting for chaincode to initialize..."
sleep 5

# Check container status
echo ""
echo "Chaincode container status:"
docker ps --filter name=coffee-chaincode --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "============================================================================"
echo "  ✅ Chaincode Version Fixed to 1.13"
echo "============================================================================"
echo ""
echo "The chaincode container now matches the deployed chaincode version."
echo "You can now test blockchain queries through the API."
