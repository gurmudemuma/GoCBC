#!/bin/bash

echo "=== Fixing Chaincode Registration Issue ==="
echo ""

echo "The issue: Peers can't connect to chaincode container (registration timeout)"
echo "This happens when chaincode is deployed as CCAAS but not properly connected"
echo ""

echo "[1] Restarting chaincode container..."
docker restart coffee-chaincode
sleep 5

echo "[2] Checking if chaincode is listening on port 9999..."
docker exec coffee-chaincode netstat -ln 2>/dev/null | grep 9999 || echo "netstat not available, skipping"

echo ""
echo "[3] Testing chaincode connectivity from peer..."
docker exec peer0.ecta.cecbs.et ping -c 2 coffee-chaincode 2>&1 | head -5

echo ""
echo "[4] Checking chaincode container status..."
docker ps | grep coffee-chaincode

echo ""
echo "[5] Recent chaincode logs (last 10 lines)..."
docker logs --tail 10 coffee-chaincode

echo ""
echo "=== Attempting to invoke chaincode directly from peer CLI ==="
echo ""

# Try a simple query
echo "[6] Testing QueryAllExporters..."
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"QueryAllExporters","Args":[]}' \
  2>&1 | head -20

echo ""
echo "=== Diagnosis Complete ==="
echo ""
echo "If the query above succeeded, the chaincode is working."
echo "If it failed with 'timeout', there's a network/connectivity issue."
echo ""
echo "Next steps:"
echo "1. If chaincode works via CLI but not via API, check API's fabricService connection"
echo "2. If chaincode doesn't work at all, need to redeploy it properly"
echo "3. Consider switching from CCAAS to traditional chaincode deployment"
