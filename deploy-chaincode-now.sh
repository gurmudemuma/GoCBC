#!/bin/bash
set -e

echo "=== Deploying Coffee Chaincode ==="

# 1. Package chaincode
echo "Step 1: Packaging chaincode..."
cd /home/guda/GoCBC

# Create package directory
mkdir -p blockchain/channel-artifacts

# Create metadata.json
cat > blockchain/channel-artifacts/metadata.json << 'EOF'
{
  "type": "ccaas",
  "label": "coffee_1.0"
}
EOF

# Create connection.json
cat > blockchain/channel-artifacts/connection.json << 'EOF'
{
  "address": "coffee-chaincode:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

# Package
cd blockchain/channel-artifacts
tar czf code.tar.gz connection.json
tar czf coffee_1.0.tgz metadata.json code.tar.gz
rm -f metadata.json connection.json code.tar.gz
cd /home/guda/GoCBC

echo "✓ Chaincode packaged"

# 2. Start chaincode container
echo "Step 2: Starting chaincode container..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

cd chaincodes/coffee
docker build -t coffee-chaincode:1.0 .
cd /home/guda/GoCBC

docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME="coffee_1.0:latest" \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:9999" \
  coffee-chaincode:1.0

sleep 5
echo "✓ Chaincode container started"

# 3. Install on all peers
echo "Step 3: Installing on all peers..."

for peer in ecta ecx banks nbe customs shipping; do
  echo "  Installing on peer0.$peer..."
  docker exec peer0.${peer}.cecbs.et bash -c "
    peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/blockchain/channel-artifacts/coffee_1.0.tgz
  " 2>&1 | grep -i "installed\|error" || true
done

echo "✓ Installed on all peers"

# 4. Approve for all orgs
echo "Step 4: Approving for all organizations..."

PACKAGE_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep coffee_1.0 | awk '{print $3}' | sed 's/,$//')

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ Failed to get package ID"
  exit 1
fi

echo "  Package ID: $PACKAGE_ID"

for org in ECTA ECX Banks NBE Customs Shipping; do
  peer_lower=$(echo $org | tr '[:upper:]' '[:lower:]')
  echo "  Approving for $org..."
  
  docker exec peer0.${peer_lower}.cecbs.et bash -c "
    export CORE_PEER_LOCALMSPID=\"${org}MSP\"
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${peer_lower}.cecbs.et/msp
    peer lifecycle chaincode approveformyorg \
      --channelID coffeechannel \
      --name coffee \
      --version 1.0 \
      --package-id $PACKAGE_ID \
      --sequence 1 \
      --tls \
      --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
      --orderer orderer.cecbs.et:7050
  " 2>&1 | grep -i "successfully\|error" || true
done

echo "✓ Approved by all orgs"

# 5. Commit chaincode
echo "Step 5: Committing chaincode..."

docker exec peer0.ecta.cecbs.et bash -c "
  peer lifecycle chaincode commit \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 1 \
    --tls \
    --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --orderer orderer.cecbs.et:7050 \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric-ecx/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric-banks/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric-nbe/tls/ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric-customs/tls/ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric-shipping/tls/ca.crt
"

echo ""
echo "✅ Chaincode deployed successfully!"
echo ""
echo "Verify with: docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted --channelID coffeechannel"
