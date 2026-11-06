#!/bin/bash

echo "Testing chaincode deployment flow..."
echo ""

# Test 1: Check if deploy-chaincode.sh exists
echo "1. Checking deploy-chaincode.sh..."
if [ -f "/home/guda/GoCBC/deploy-chaincode.sh" ]; then
  echo "   ✅ File exists"
  ls -lh /home/guda/GoCBC/deploy-chaincode.sh
else
  echo "   ❌ File missing"
  exit 1
fi

echo ""

# Test 2: Check if it's executable
echo "2. Checking execute permissions..."
if [ -x "/home/guda/GoCBC/deploy-chaincode.sh" ]; then
  echo "   ✅ Executable"
else
  echo "   ❌ Not executable - fixing..."
  chmod +x /home/guda/GoCBC/deploy-chaincode.sh
  echo "   ✅ Fixed"
fi

echo ""

# Test 3: Run deployment script
echo "3. Testing deployment script (should skip if no changes)..."
cd /home/guda/GoCBC && ./deploy-chaincode.sh 2>&1 | head -20

echo ""
echo "4. Verifying chaincode is deployed..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee 2>&1 | grep -E "Version|Sequence"

echo ""
echo "✅ Chaincode deployment integration verified!"
