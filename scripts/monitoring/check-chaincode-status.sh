#!/bin/bash
echo "Checking chaincode deployment status..."
echo ""

# Check if committed
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee 2>&1

echo ""
echo "Checking channel list..."
docker exec peer0.ecta.cecbs.et peer channel list 2>&1
