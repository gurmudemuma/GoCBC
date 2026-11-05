#!/bin/bash

# Blockchain Connectivity Fix Script
# Diagnoses and fixes blockchain/chaincode issues

set -e

echo "================================================================"
echo "  Blockchain Connectivity Diagnostic & Fix"
echo "================================================================"
echo ""

# Check if peers are running
echo "1. Checking peer status..."
PEER_COUNT=$(docker ps --filter "name=peer0" --format "{{.Names}}" | wc -l)

if [ "$PEER_COUNT" -lt 6 ]; then
  echo "❌ Only $PEER_COUNT/6 peers running"
  echo "   Starting all peers..."
  cd /home/guda/GoCBC
  docker-compose -f docker-compose-fabric.yml up -d
  sleep 10
  echo "✓ Peers started"
else
  echo "✓ All 6 peers are running"
fi

# Check chaincode deployment
echo ""
echo "2. Checking chaincode deployment..."
CHAINCODE_CHECK=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee 2>&1 || echo "NOT_DEPLOYED")

if echo "$CHAINCODE_CHECK" | grep -q "Version:"; then
  VERSION=$(echo "$CHAINCODE_CHECK" | grep -oP 'Version: \K[0-9.]+' || echo "unknown")
  echo "✓ Chaincode deployed: Version $VERSION"
else
  echo "❌ Chaincode not deployed"
  echo "   Deploying chaincode..."
  
  if [ -f /home/guda/GoCBC/deploy-chaincode.sh ]; then
    bash /home/guda/GoCBC/deploy-chaincode.sh
    echo "✓ Chaincode deployed"
  else
    echo "❌ deploy-chaincode.sh not found"
    exit 1
  fi
fi

# Test chaincode ping
echo ""
echo "3. Testing chaincode connectivity..."
PING_RESULT=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  -C coffeechannel -n coffee \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  -c '{"function":"ping","Args":[]}' 2>&1)

if echo "$PING_RESULT" | grep -qE "Chaincode invoke successful|status:200"; then
  echo "✓ Chaincode ping successful"
else
  echo "❌ Chaincode ping failed"
  echo "$PING_RESULT" | tail -10
  exit 1
fi

# Test contract creation on blockchain
echo ""
echo "4. Testing blockchain contract creation..."
TEST_CONTRACT_ID="TEST-BLOCKCHAIN-$(date +%s)"

CREATE_RESULT=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  -C coffeechannel -n coffee \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  -c "{\"function\":\"RegisterSalesContract\",\"Args\":[
    \"$TEST_CONTRACT_ID\",
    \"EXP-TEST\",
    \"BUYER-TEST\",
    \"Test Buyer\",
    \"USA\",
    \"Arabica\",
    \"100\",
    \"10\",
    \"USD\",
    \"LC\"
  ]}" 2>&1)

if echo "$CREATE_RESULT" | grep -qE "Chaincode invoke successful|status:200"; then
  echo "✓ Contract creation test successful"
  
  # Verify contract exists
  sleep 2
  READ_RESULT=$(docker exec peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c "{\"function\":\"ReadSalesContract\",\"Args\":[\"$TEST_CONTRACT_ID\"]}" 2>&1)
  
  if echo "$READ_RESULT" | grep -q "$TEST_CONTRACT_ID"; then
    echo "✓ Contract verified on blockchain"
  else
    echo "⚠ Contract created but verification failed"
  fi
else
  echo "❌ Contract creation test failed"
  echo "$CREATE_RESULT" | tail -10
  exit 1
fi

echo ""
echo "================================================================"
echo "  ✓ Blockchain is healthy and ready"
echo "================================================================"
echo ""
echo "You can now run the workflow test:"
echo "  bash /home/guda/GoCBC/continue-workflow-from-existing.sh"
echo ""
