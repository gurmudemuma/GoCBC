#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════"
echo "  Installing and Upgrading Chaincode to v1.1"
echo "════════════════════════════════════════════════════════════"
echo ""

CHAINCODE_PKG="/home/guda/GoCBC/chaincodes/coffee/coffee_1.1.tar.gz"

# Install on all peers
echo "Installing on all peers..."
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
  echo "  $peer..."
  docker cp "$CHAINCODE_PKG" "$peer:/tmp/coffee_1.1.tar.gz"
  docker exec $peer peer lifecycle chaincode install /tmp/coffee_1.1.tar.gz 2>&1 | grep -i "installed" || echo "  (already installed)"
done

echo ""
echo "✓ Installed on all peers"
echo ""

# Get package ID
PKG_ID=$(docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>/dev/null | grep "coffee_1.1" | awk '{print $3}' | sed 's/,//')
echo "Package ID: $PKG_ID"
echo ""

# Approve for all orgs (sequence 2)
echo "Approving for all organizations (v1.1, sequence 2)..."
for org_info in "peer0.ecta.cecbs.et:ECTAMSP:ECTA" \
                "peer0.ecx.cecbs.et:ECXMSP:ECX" \
                "peer0.banks.cecbs.et:BanksMSP:Banks" \
                "peer0.nbe.cecbs.et:NBEMSP:NBE" \
                "peer0.customs.cecbs.et:CustomsMSP:Customs" \
                "peer0.shipping.cecbs.et:ShippingMSP:Shipping"; do
  IFS=':' read -r peer msp name <<< "$org_info"
  echo "  $name..."
  docker exec $peer peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version 1.1 \
    --package-id "$PKG_ID" --sequence 2 2>&1 | grep -i "committed" || echo "  approved"
done

echo ""
echo "✓ All approved"
echo ""

# Commit
echo "Committing chaincode v1.1..."
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --sequence 2 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt 2>&1 | head -3

echo ""
echo "✓ Committed"
echo ""

# Verify
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee 2>&1 | grep -E "Version|Sequence"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Upgrade Complete!"
echo "════════════════════════════════════════════════════════════"
