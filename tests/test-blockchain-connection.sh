#!/bin/bash
# Test blockchain connection after peer restart

echo "=== Testing Blockchain Connection ==="
echo ""

# Wait for peers to be ready
echo "Waiting for peers to initialize..."
sleep 10

# Test peer connection
echo "Testing peer0.ecta.cecbs.et connection..."
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | head -5

echo ""
echo "Testing chaincode query..."
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllAssets","Args":[]}' \
  2>&1 | head -10

echo ""
echo "=== Connection Test Complete ==="
