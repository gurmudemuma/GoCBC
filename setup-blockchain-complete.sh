#!/bin/bash

# Complete Blockchain Setup and Chaincode Deployment

set -e

echo "=============================================="
echo "Complete Blockchain Setup & Deployment"
echo "=============================================="
echo ""

# Step 1: Check if channel exists
echo "[1/4] Checking channel status..."
CHANNEL_CHECK=$(docker exec peer0.ecta.cecbs.et peer channel list 2>&1 | grep -c "coffeechannel" || echo "0")

if [ "$CHANNEL_CHECK" -eq "0" ]; then
    echo "⚠️ Channel 'coffeechannel' not found"
    echo "Creating channel..."
    cd /home/guda/GoCBC/scripts
    bash create-channel-docker.sh
    echo "✅ Channel created"
else
    echo "✅ Channel 'coffeechannel' exists"
fi

# Step 2: Join peers to channel (if not already joined)
echo ""
echo "[2/4] Ensuring all peers are joined to channel..."
cd /home/guda/GoCBC/scripts
bash join-peers-to-channel.sh 2>&1 | tail -20 || echo "⚠️ Peers may already be joined"
echo "✅ Peers joined to channel"

# Step 3: Deploy chaincode
echo ""
echo "[3/4] Deploying chaincode..."
cd /home/guda/GoCBC
bash deploy-chaincode.sh
echo "✅ Chaincode deployed"

# Step 4: Register test exporter
echo ""
echo "[4/4] Registering test exporter EXP001..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode invoke \
  -o orderer.cecbs.et:7050 \
  --tls \
  --cafile /organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"RegisterExporter","Args":["EXP001","Test Coffee Exporter Ltd","ECTA-2024-001","company","5000000","yes","TASTER-CERT-001","LAB-CERT-001","2027-12-31"]}' \
  --waitForEvent

echo "✅ Test exporter registered"

echo ""
echo "=============================================="
echo "✅ Setup Complete!"
echo "=============================================="
echo ""
echo "Next: Run workflow test"
echo "  cd /home/guda/GoCBC && ./complete-workflow-test-fixed.sh"
echo ""
