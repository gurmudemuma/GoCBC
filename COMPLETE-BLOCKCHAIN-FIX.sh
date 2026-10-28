#!/bin/bash

echo "==============================================="
echo "GoCBC Blockchain Complete Fix & Test"
echo "==============================================="

cd /home/guda/GoCBC

# Step 1: Stop all containers
echo ""
echo "Step 1: Stopping all containers..."
docker-compose -f docker-compose-fabric.yml down

# Step 2: Start infrastructure
echo ""
echo "Step 2: Starting blockchain infrastructure..."
docker-compose -f docker-compose-fabric.yml up -d

# Step 3: Wait for containers
echo ""
echo "Step 3: Waiting for containers to start (20 seconds)..."
sleep 20

# Step 4: Check status
echo ""
echo "Step 4: Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | tee /tmp/container-status.txt

# Step 5: Count peers
PEER_COUNT=$(docker ps | grep peer0 | wc -l)
echo ""
echo "Peer count: $PEER_COUNT / 6"

if [ $PEER_COUNT -eq 0 ]; then
    echo ""
    echo "ERROR: No peers are running!"
    echo "Checking peer logs..."
    docker logs peer0.ecta.cecbs.et 2>&1 | tail -20 | tee /tmp/peer-error.txt
    echo ""
    echo "Peer error saved to /tmp/peer-error.txt"
    exit 1
fi

# Step 6: Test chaincode invoke
echo ""
echo "Step 5: Testing chaincode invoke..."
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    -c '{"function":"initLedger","Args":[]}' 2>&1 | tee /tmp/invoke-result.txt

echo ""
echo "==============================================="
echo "Test Complete!"
echo "==============================================="
echo "Check /tmp/invoke-result.txt for chaincode invoke result"
