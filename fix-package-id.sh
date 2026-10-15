#!/bin/bash
set -e

echo "=== Fixing Chaincode Package ID in Definition ==="

# Get the NEW package ID (the one with TLS cert)
PACKAGE_ID=$(docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode queryinstalled | grep "coffee_1.10" | awk -F'Package ID: |, Label:' '{print $2}')

echo "New Package ID with TLS: $PACKAGE_ID"

# Approve for all orgs with sequence 3 and the correct package ID
echo ""
echo "Approving with correct package ID (sequence 3)..."
for org in ECTAMSP ECXMSP BanksMSP NBEMSP CustomsMSP ShippingMSP; do
    peer=$(echo $org | sed 's/MSP$//' | tr '[:upper:]' '[:lower:]')
    echo "  $org..."
    
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
        --sequence 3 \
        --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | grep -E "txid.*VALID|Error"
done

# Commit
echo ""
echo "Committing with package ID (sequence 3)..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECXMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et \
  peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 3 \
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
echo "✅ Fixed! Now using package with TLS certificate"
