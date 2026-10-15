#!/bin/bash

set -e

echo "=== Fixing Missing Organizations (Banks and NBE) ==="

# First, restart the banks peer with proper configuration
echo "1. Restarting Banks peer..."
cd /home/guda/GoCBC
docker-compose -f docker-compose-fabric.yml stop peer0.banks.cecbs.et 2>/dev/null || true
docker-compose -f docker-compose-fabric.yml rm -f peer0.banks.cecbs.et 2>/dev/null || true

# Clear any corrupted ledger data
docker volume rm gocbc_peer0.banks.cecbs.et 2>/dev/null || true

# Start fresh
docker-compose -f docker-compose-fabric.yml up -d peer0.banks.cecbs.et

echo "Waiting for Banks peer to start..."
sleep 10

# Check if it's running
if docker ps | grep -q peer0.banks.cecbs.et; then
    echo "✅ Banks peer is running"
else
    echo "❌ Banks peer failed to start"
    docker logs peer0.banks.cecbs.et 2>&1 | tail -20
    exit 1
fi

# 2. Fetch channel block
echo ""
echo "2. Fetching channel block..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer channel fetch 0 /tmp/coffeechannel.block -c coffeechannel \
    -o orderer.cecbs.et:7050 \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

# 3. Join Banks peer to channel
echo ""
echo "3. Joining Banks peer to channel..."
docker cp peer0.ecx.cecbs.et:/tmp/coffeechannel.block /tmp/coffeechannel.block
docker cp /tmp/coffeechannel.block peer0.banks.cecbs.et:/tmp/coffeechannel.block

docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et \
  peer channel join -b /tmp/coffeechannel.block

echo "✅ Banks peer joined channel"

# 4. Fix NBE peer - rejoin channel
echo ""
echo "4. Fixing NBE peer channel membership..."
docker cp /tmp/coffeechannel.block peer0.nbe.cecbs.et:/tmp/coffeechannel.block

docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et \
  peer channel join -b /tmp/coffeechannel.block 2>&1 || echo "⚠️ NBE join failed (may already be member)"

# 5. Get package ID and approve chaincode for both orgs
echo ""
echo "5. Getting chaincode package ID..."
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "coffee" | awk -F'Package ID: |, Label:' '{print $2}' | head -1)

echo "Package ID: $PACKAGE_ID"

# 6. Approve for Banks
echo ""
echo "6. Approving chaincode for BanksMSP..."
docker exec \
  -e CORE_PEER_LOCALMSPID=BanksMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem

echo "✅ BanksMSP approved"

# 7. Approve for NBE
echo ""
echo "7. Approving chaincode for NBEMSP..."
docker exec \
  -e CORE_PEER_LOCALMSPID=NBEMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et \
  peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 || echo "⚠️ NBE approval failed"

echo ""
echo "8. Checking approval status..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode checkcommitreadiness -C coffeechannel -n coffee --version 1.0 --sequence 1

echo ""
echo "=== FIX COMPLETE ==="
echo "All organizations should now be active for DiscoveryService"
