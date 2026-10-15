#!/bin/bash
set -e

echo "=== Deploying Chaincode WITHOUT TLS ==="

# 1. Start chaincode container without TLS
echo "1. Starting chaincode container (no TLS)..."
docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME=coffee_1.0:latest \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  coffee-chaincode:latest

sleep 5

if ! docker ps | grep -q coffee-chaincode; then
    echo "❌ Chaincode failed to start"
    exit 1
fi

echo "✅ Chaincode container running"

# 2. Package the updated chaincode
echo ""
echo "2. Packaging chaincode with no-TLS connection.json..."
cd /home/guda/GoCBC/chaincodes/coffee
tar czf code.tar.gz connection.json metadata.json

# 3. Install on all peers
echo ""
echo "3. Installing chaincode package on all peers..."

PACKAGE_FILE="/tmp/coffee_no_tls.tar.gz"
tar czf $PACKAGE_FILE code.tar.gz connection.json metadata.json

for peer in ecta ecx banks nbe customs shipping; do
    echo "Installing on peer0.$peer..."
    
    MSP=$(echo $peer | tr '[:lower:]' '[:upper:]')MSP
    if [ "$peer" = "ecta" ]; then
        MSP="ECTAMSP"
    elif [ "$peer" = "ecx" ]; then
        MSP="ECXMSP"
    elif [ "$peer" = "banks" ]; then
        MSP="BanksMSP"
    elif [ "$peer" = "nbe" ]; then
        MSP="NBEMSP"
    elif [ "$peer" = "customs" ]; then
        MSP="CustomsMSP"
    elif [ "$peer" = "shipping" ]; then
        MSP="ShippingMSP"
    fi
    
    docker exec \
      -e CORE_PEER_LOCALMSPID=$MSP \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$peer.cecbs.et/msp \
      peer0.$peer.cecbs.et \
      peer lifecycle chaincode install $PACKAGE_FILE 2>&1 | tail -1 || echo "⚠️ Install failed for $peer"
done

# 4. Get new package ID
echo ""
echo "4. Getting new package ID..."
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "coffee" | tail -1 | awk -F'Package ID: |, Label:' '{print $2}')

echo "New Package ID: $PACKAGE_ID"

# 5. Approve for all orgs with sequence 2
echo ""
echo "5. Approving chaincode (sequence 2) for all organizations..."

for org in ECTAMSP ECXMSP BanksMSP NBEMSP CustomsMSP ShippingMSP; do
    peer=$(echo $org | tr '[:upper:]' '[:lower:]' | sed 's/msp//')
    
    echo "Approving for $org..."
    docker exec \
      -e CORE_PEER_LOCALMSPID=$org \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$peer.cecbs.et/msp \
      peer0.$peer.cecbs.et \
      peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.0 \
        --package-id "$PACKAGE_ID" \
        --sequence 2 \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "INFO|Error" || echo "Done"
done

# 6. Commit with sequence 2
echo ""
echo "6. Committing chaincode (sequence 2)..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 2 \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.customs.cecbs.et:11051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/customs-ca.crt \
    --peerAddresses peer0.shipping.cecbs.et:12051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/shipping-ca.crt

echo ""
echo "7. Verifying..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C coffeechannel -n coffee

echo ""
echo "=== Deployment Complete ==="
