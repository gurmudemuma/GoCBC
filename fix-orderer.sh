#!/bin/bash

echo "================================================================"
echo "  Orderer Fix Script"
echo "================================================================"
echo ""

# Check if orderer exists
echo "1. Checking orderer container..."
ORDERER_STATUS=$(docker ps -a --format "{{.Names}}\t{{.Status}}" | grep orderer || echo "NOT_FOUND")

if [ "$ORDERER_STATUS" = "NOT_FOUND" ]; then
  echo "❌ Orderer container not found"
  echo "   Starting blockchain network..."
  cd /home/guda/GoCBC
  docker-compose -f docker-compose-fabric.yml up -d orderer.cecbs.et
  sleep 5
  echo "✓ Orderer started"
else
  echo "Found: $ORDERER_STATUS"
  
  # Check if running
  if echo "$ORDERER_STATUS" | grep -q "Up"; then
    echo "✓ Orderer is running"
  else
    echo "❌ Orderer is not running"
    echo "   Starting orderer..."
    docker start orderer.cecbs.et
    sleep 5
    echo "✓ Orderer started"
  fi
fi

# Test orderer connectivity
echo ""
echo "2. Testing orderer connectivity..."
docker exec peer0.ecta.cecbs.et sh -c "nc -zv -w5 orderer.cecbs.et 7050" 2>&1 | head -3

# Check orderer logs
echo ""
echo "3. Checking orderer logs..."
docker logs orderer.cecbs.et --tail 20 2>&1 | tail -10

# Try a simple chaincode invocation
echo ""
echo "4. Testing chaincode through orderer..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  -C coffeechannel -n coffee \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  -c '{"function":"ping","Args":[]}' 2>&1 | grep -E "Chaincode invoke successful|Error|error" | head -5

echo ""
echo "Done!"
