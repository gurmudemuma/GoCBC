#!/bin/bash
echo "======================================"
echo "Direct Chaincode Invocation Test"
echo "======================================"
echo ""
echo "Starting chaincode and peer log monitoring..."
echo ""

# Clear recent logs by marking the time
START_TIME=$(date -u +"%Y-%m-%d %H:%M:%S")

# Run a query in background
echo "Invoking chaincode query (will timeout after 30s)..."
timeout 30 docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"Args":["GetAllExporters"]}' \
  2>&1 | head -20 &

QUERY_PID=$!

# Wait 5 seconds for query to start
sleep 5

# Check chaincode logs for any connection attempts
echo ""
echo "Chaincode logs (last 20 lines):"
echo "--------------------------------------"
docker logs coffee-chaincode 2>&1 | tail -20

echo ""
echo "Peer logs (since query started):"
echo "--------------------------------------"
docker logs peer0.ecta.cecbs.et --since "${START_TIME}" 2>&1 | grep -i "coffee\|chaincode\|external\|grpc" | head -30

# Wait for query to finish or timeout
wait $QUERY_PID
RESULT=$?

echo ""
echo "======================================"
if [ $RESULT -eq 124 ]; then
  echo "Query TIMED OUT (as expected)"
else
  echo "Query completed with exit code: $RESULT"
fi
echo "======================================"
