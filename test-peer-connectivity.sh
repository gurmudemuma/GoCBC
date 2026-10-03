#!/bin/bash

# Test if peer can reach chaincode
echo "Testing peer connectivity to chaincode..."
docker exec peer0.ecx.cecbs.et ping -c 2 coffee-chaincode 2>&1
echo "---"

# Test port connectivity
echo "Testing port 9999 connectivity..."
docker exec peer0.ecx.cecbs.et nc -zv coffee-chaincode 9999 2>&1
echo "---"

# Check peer logs for chaincode connection attempts
echo "Recent peer logs (chaincode related)..."
docker logs peer0.ecx.cecbs.et 2>&1 | grep -i "chaincode\|coffee" | tail -20
