#!/bin/bash

echo "=== System Test ==="
echo ""

echo "1. Checking Docker containers..."
docker ps --format "{{.Names}}" | grep -E "peer0|orderer|postgres|redis" | sort
echo ""

echo "2. Checking ports..."
ss -tuln | grep -E ":3001|:7051|:7050|:5432" | awk '{print $5}' | sort -u
echo ""

echo "3. Testing chaincode deployment..."
timeout 30 docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1 | head -20
echo ""

echo "4. Testing API health..."
timeout 5 curl -s http://localhost:3001/health 2>&1 | head -5
echo ""

echo "=== Test Complete ==="
