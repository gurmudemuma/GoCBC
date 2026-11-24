#!/bin/bash
set -e

echo "=========================================="
echo "Channel MSP Certificate Fix Script"
echo "=========================================="
echo ""

CHANNEL_NAME="coffeechannel"
ORG_NAME="ecta"
MSP_ID="ECTAMSP"

echo "This script will update the channel configuration to trust the current CA certificates."
echo ""
echo "⚠️  WARNING: This requires stopping and restarting the network."
echo ""
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Backing up current configuration..."
mkdir -p /home/guda/GoCBC/backup-channel-config
cd /home/guda/GoCBC/blockchain

# Check if we have peer CLI tools
if ! command -v peer &> /dev/null; then
    echo "⚠️  Fabric peer CLI not found in PATH"
    echo "   Attempting to use Docker-based peer commands..."
    
    # Use docker exec to run peer commands
    PEER_CMD="docker exec -e CORE_PEER_LOCALMSPID=$MSP_ID \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
      peer0.${ORG_NAME}.cecbs.et peer"
else
    PEER_CMD="peer"
fi

echo ""
echo "Step 2: Fetching current channel config..."
echo "   This may take a moment..."

# Fetch the channel config
$PEER_CMD channel fetch config /tmp/config_block.pb \
  -o orderer.cecbs.et:7050 \
  -c $CHANNEL_NAME \
  --tls \
  --cafile /etc/hyperledger/fabric/tls/ca.crt 2>&1 | grep -v "Endorser and orderer connections"

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch channel config"
    echo ""
    echo "Alternative: Recreate the channel from scratch"
    echo "   This is a development network, so recreating is safe."
    echo ""
    read -p "Would you like to recreate the network? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo ""
        echo "Recreating network..."
        cd /home/guda/GoCBC
        ./teardown.sh
        sleep 5
        ./start-all.sh
        echo ""
        echo "✅ Network recreated with fresh certificates"
        exit 0
    else
        echo "Aborted."
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Channel config fetched successfully"
echo "=========================================="
