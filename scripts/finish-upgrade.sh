#!/bin/bash
set -e

PKG_ID="coffee_1.1:0a4a96dedd5bcca3933bd6b6f23f7b25bebff35a232d63d6e44ee6d0dac54b0f"

echo "Finishing chaincode v1.1 upgrade..."
echo "Package ID: $PKG_ID"
echo ""

# Approve for all orgs
echo "Approving for all organizations..."
for org in "peer0.ecta.cecbs.et:ECTAMSP:ecta.cecbs.et:ECTA" \
           "peer0.ecx.cecbs.et:ECXMSP:ecx.cecbs.et:ECX" \
           "peer0.banks.cecbs.et:BanksMSP:banks.cecbs.et:Banks" \
           "peer0.nbe.cecbs.et:NBEMSP:nbe.cecbs.et:NBE" \
           "peer0.customs.cecbs.et:CustomsMSP:customs.cecbs.et:Customs" \
           "peer0.shipping.cecbs.et:ShippingMSP:shipping.cecbs.et:Shipping"; do
  IFS=':' read -r peer msp domain name <<< "$org"
  echo "  $name..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=$msp \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@$domain/msp \
    $peer peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version 1.1 \
    --package-id "$PKG_ID" --sequence 2 2>&1 | tail -1
done

echo ""
echo "✓ All approved"
echo ""

# Commit
echo "Committing chaincode v1.1..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 1.1 --sequence 2 \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/banks-ca.crt

echo ""
echo "✓ Committed!"
echo ""

# Verify
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode querycommitted \
  --channelID coffeechannel --name coffee

echo ""
echo "✅ Chaincode v1.1 is now active with new border crossing functions!"
