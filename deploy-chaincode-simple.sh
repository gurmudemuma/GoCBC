#!/bin/bash
# Simple Chaincode Deployment - Shows all errors

set -e

echo "========================================="
echo "Simple Chaincode Deployment"
echo "========================================="

# Check if containers are running
echo ""
echo "Step 1: Checking containers..."
docker ps --format "{{.Names}}" | grep peer | wc -l | xargs echo "Peers running:"

# Install on one peer first
echo ""
echo "Step 2: Installing on peer0.ecta.cecbs.et..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee_1.0.tar.gz 2>&1 | head -20

# Check what got installed
echo ""
echo "Step 3: Query installed chaincodes..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | head -10

echo ""
echo "========================================="
echo "Done"
echo "========================================="
