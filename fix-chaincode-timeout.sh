#!/bin/bash
# Fix chaincode timeout issue

echo "==================================="
echo "Fixing Blockchain Chaincode Timeout"
echo "==================================="
echo ""

# Stop API if running
echo "Step 1: Stopping API..."
pkill -f "node.*api" 2>/dev/null || true

# Restart chaincode container
echo "Step 2: Restarting chaincode container..."
docker restart coffee-chaincode
sleep 5

# Restart all peers
echo "Step 3: Restarting all peer containers..."
docker restart \
  peer0.ecta.cecbs.et \
  peer0.ecx.cecbs.et \
  peer0.nbe.cecbs.et \
  peer0.customs.cecbs.et \
  peer0.shipping.cecbs.et \
  peer0.banks.cecbs.et

# Wait for peers to initialize
echo "Step 4: Waiting for peers to initialize..."
sleep 20

# Check peer status
echo "Step 5: Checking peer status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep peer

echo ""
echo "Step 6: Testing blockchain query..."
# Try a simple query
docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | grep -E "coffeechannel|ERROR|WARN" | head -3

echo ""
echo "==================================="
echo "Fix Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Start the API: cd api && npm run dev"
echo "2. Open Shipping Portal in browser"
echo "3. Check browser console for logs"
echo ""
echo "If still timing out, try full network restart:"
echo "  docker-compose down && docker-compose up -d"
echo ""
