#!/bin/bash
set -e

echo "=== Redeploying Chaincode with Proper TLS Certificate ==="

cd /home/guda/GoCBC/chaincodes/coffee

# 1. Package with updated connection.json (includes TLS CA cert)
echo "1. Packaging chaincode with TLS certificate..."
tar czf code.tar.gz connection.json metadata.json
tar czf coffee-tls.tar.gz code.tar.gz connection.json metadata.json

# 2. Copy to all peers and install
echo ""
echo "2. Installing on all peers..."
for peer in ecta ecx banks nbe customs shipping; do
    echo "  Installing on $peer..."
    docker cp coffee-tls.tar.gz peer0.$peer.cecbs.et:/tmp/coffee-tls.tar.gz
    
    MSP=$(echo $peer | tr '[:lower:]' '[:upper:]')MSP
    [ "$peer" = "ecta" ] && MSP="ECTAMSP"
    [ "$peer" = "ecx" ] && MSP="ECXMSP"
    [ "$peer" = "banks" ] && MSP="BanksMSP"
    [ "$peer" = "nbe" ] && MSP="NBEMSP"
    [ "$peer" = "customs" ] && MSP="CustomsMSP"
    [ "$peer" = "shipping" ] && MSP="ShippingMSP"
    
    docker exec \
      -e CORE_PEER_LOCALMSPID=$MSP \
      -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$peer.cecbs.et/msp \
      peer0.$peer.cecbs.et \
      peer lifecycle chaincode install /tmp/coffee-tls.tar.gz 2>&1 | grep -E "Chaincode code package identifier|installed"
done

# 3. Get package ID
echo ""
echo "3. Getting package ID..."
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "coffee" | tail -1 | awk -F'Package ID: |, Label:' '{print $2}')

echo "Package ID: $PACKAGE_ID"

# 4. Approve for all orgs (sequence 2)
echo ""
echo "4. Approving for all organizations (sequence 2)..."
for org in ECTAMSP ECXMSP BanksMSP NBEMSP CustomsMSP ShippingMSP; do
    peer=$(echo $org | sed 's/MSP$//' | tr '[:upper:]' '[:lower:]')
    echo "  Approving $org..."
    
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
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "txid.*committed|Error"
done

# 5. Check readiness
echo ""
echo "5. Checking commit readiness..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode checkcommitreadiness -C coffeechannel -n coffee --version 1.0 --sequence 2

# 6. Commit
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

# 7. Verify
echo ""
echo "7. Verifying committed chaincode..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode querycommitted -C coffeechannel -n coffee

# 8. Start chaincode container with TLS
echo ""
echo "8. Restarting chaincode container with TLS..."
docker stop coffee-chaincode 2>/dev/null || true
docker rm coffee-chaincode 2>/dev/null || true

docker run -d \
  --name coffee-chaincode \
  --network cecbs-network \
  -p 9999:9999 \
  -e CORE_CHAINCODE_ID_NAME=coffee_1.0:latest \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CORE_CHAINCODE_TLS_ENABLED=true \
  -e CORE_CHAINCODE_TLS_CERT_FILE=/app/tls/server-cert.pem \
  -e CORE_CHAINCODE_TLS_KEY_FILE=/app/tls/server-key.pem \
  -v /home/guda/GoCBC/chaincodes/coffee/tls:/app/tls:ro \
  coffee-chaincode:latest

sleep 5
docker ps | grep coffee-chaincode && echo "✅ Chaincode running with TLS"

echo ""
echo "=== Deployment Complete! ==="
echo "Chaincode now has proper TLS configuration with root certificate in connection.json"
