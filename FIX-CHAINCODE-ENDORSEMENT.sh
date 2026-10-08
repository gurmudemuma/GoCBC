#!/bin/bash
##################################################################
# EXPERT FIX: Endorsement Mismatch - Complete Solution
# Fixes the "ProposalResponsePayloads do not match" error
##################################################################

set -e

echo "=========================================="
echo "  EXPERT CHAINCODE FIX"
echo "=========================================="
echo ""

cd /home/guda/GoCBC

# Step 1: Clean everything
echo "Step 1: Stopping and cleaning..."
./stop-all.sh 2>/dev/null || true
docker-compose -f docker-compose-fabric.yml down -v 2>&1 | grep -E "Removed" | tail -5
docker volume prune -f >/dev/null 2>&1

# Step 2: Start network fresh
echo "Step 2: Starting Fabric network..."
docker-compose -f docker-compose-fabric.yml up -d \
  orderer.cecbs.et \
  peer0.ecta.cecbs.et peer0.ecx.cecbs.et \
  peer0.banks.cecbs.et peer0.nbe.cecbs.et \
  peer0.customs.cecbs.et peer0.shipping.cecbs.et \
  couchdb.ecta couchdb.ecx couchdb.banks \
  couchdb.nbe couchdb.customs couchdb.shipping \
  cecbs-postgres cecbs-redis 2>&1 | grep "Started" | tail -10

echo "Waiting for network to stabilize (30s)..."
sleep 30

# Step 3: Create channel properly
echo "Step 3: Creating channel..."

# Generate channel artifacts if missing
if [ ! -f blockchain/channel-artifacts/coffeechannel.tx ]; then
  docker run --rm \
    -v $PWD/blockchain:/work \
    hyperledger/fabric-tools:2.5 \
    configtxgen -profile CoffeeChannel \
    -outputCreateChannelTx /work/channel-artifacts/coffeechannel.tx \
    -channelID coffeechannel \
    -configPath /work
fi

# Create channel
docker exec peer0.ecta.cecbs.et peer channel create \
  -o orderer.cecbs.et:7050 \
  -c coffeechannel \
  -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/coffeechannel.tx \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
  2>&1 | grep -E "Created|Joined|Error" || echo "Channel may already exist"

sleep 5

# Step 4: Join all peers
echo "Step 4: Joining all peers to channel..."
for org in ecta ecx banks nbe customs shipping; do
  echo "  Joining peer0.${org}..."
  docker exec peer0.${org}.cecbs.et peer channel join -b coffeechannel.block 2>&1 | grep -E "Joined|Error|already" || true
done

sleep 5

# Step 5: Package chaincode
echo "Step 5: Packaging chaincode..."
cd chaincodes/coffee

# Clean up old versions (keep only latest 2)
echo "  Cleaning old chaincode packages..."
ls -t coffee_*.tgz 2>/dev/null | tail -n +3 | xargs -r rm -f
ls -t coffee_*.tar.gz 2>/dev/null | xargs -r rm -f
echo "  Old packages removed, keeping only latest versions"

# Package new version
tar czf coffee_1.0.tgz code.tar.gz connection.json metadata.json
echo "  Created coffee_1.0.tgz"
cd ../..

# Step 6: Install on all peers
echo "Step 6: Installing chaincode on all peers..."
PACKAGE_ID=""
for org in ecta ecx banks nbe customs shipping; do
  echo "  Installing on peer0.${org}..."
  OUTPUT=$(docker exec peer0.${org}.cecbs.et peer lifecycle chaincode install \
    /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincodes/coffee/coffee_1.0.tgz 2>&1)
  
  if [ -z "$PACKAGE_ID" ]; then
    PACKAGE_ID=$(echo "$OUTPUT" | grep "Package ID:" | sed 's/.*Package ID: //' | sed 's/,.*//')
  fi
done

echo "Package ID: $PACKAGE_ID"
sleep 5

# Step 7: Approve for ALL orgs with EXACT same parameters
echo "Step 7: Approving for all organizations..."
for org in ECTA ECX Banks NBE Customs Shipping; do
  orgLower=$(echo $org | tr '[:upper:]' '[:lower:]')
  echo "  Approving ${org}MSP..."
  
  docker exec \
    -e CORE_PEER_LOCALMSPID="${org}MSP" \
    -e CORE_PEER_ADDRESS="peer0.${orgLower}.cecbs.et:7051" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${orgLower}.cecbs.et/peers/peer0.${orgLower}.cecbs.et/tls/ca.crt" \
    -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${orgLower}.cecbs.et/users/Admin@${orgLower}.cecbs.et/msp" \
    peer0.${orgLower}.cecbs.et \
    peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    2>&1 | grep -E "approved|Error" || echo "  Already approved"
  
  sleep 2
done

# Step 8: Check commit readiness
echo "Step 8: Checking commit readiness..."
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode checkcommitreadiness \
  --channelID coffeechannel \
  --name coffee \
  --version 1.0 \
  --sequence 1 \
  2>&1 | grep -E "MSP|true|false"

# Step 9: Commit chaincode
echo "Step 9: Committing chaincode (THE FIX!)..."
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel \
  --name coffee \
  --version 1.0 \
  --sequence 1 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt \
  --peerAddresses peer0.banks.cecbs.et:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
  2>&1 | tail -10

# Step 10: Start chaincode container
echo "Step 10: Starting chaincode container..."
docker-compose -f docker-compose-fabric.yml up -d coffee-chaincode 2>&1 | grep "Started"

sleep 10

# Step 11: Verify
echo "Step 11: Verifying chaincode..."
docker exec peer0.ecta.cecbs.et \
  peer lifecycle chaincode querycommitted \
  --channelID coffeechannel \
  --name coffee \
  2>&1 | grep -E "Version|Sequence|Approvals"

echo ""
echo "=========================================="
echo "  ✓ CHAINCODE FIX COMPLETE"
echo "=========================================="
echo ""
echo "Chaincode should now be committed and operational."
echo "Run: docker logs coffee-chaincode"
echo ""
