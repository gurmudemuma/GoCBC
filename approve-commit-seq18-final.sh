#!/bin/bash
set -e

PACKAGE_ID="coffee_2.18:3fa4d778fc75412f891e28f8b0bb0b3b9587f1344dd2a149aba8b4d089b1f1ab"

echo "=== Approving sequence 18 for all 6 organizations ==="

declare -a ORGS=(
  "ECTAMSP:ecta.cecbs.et:peer0.ecta.cecbs.et:7051"
  "ECXMSP:ecx.cecbs.et:peer0.ecx.cecbs.et:8051"
  "BanksMSP:banks.cecbs.et:peer0.banks.cecbs.et:9051"
  "NBEMSP:nbe.cecbs.et:peer0.nbe.cecbs.et:10051"
  "CustomsMSP:customs.cecbs.et:peer0.customs.cecbs.et:11051"
  "ShippingMSP:shipping.cecbs.et:peer0.shipping.cecbs.et:12051"
)

for org_info in "${ORGS[@]}"; do
  IFS=':' read -r MSP_ID ORG_DOMAIN PEER_NAME PEER_PORT <<< "$org_info"
  echo "Approving for $MSP_ID..."
  
  docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG_DOMAIN}/msp \
    -e CORE_PEER_LOCALMSPID=$MSP_ID \
    -e CORE_PEER_ADDRESS=${PEER_NAME}:${PEER_PORT} \
    $PEER_NAME peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel --name coffee --version 2.18 --package-id "$PACKAGE_ID" \
    --sequence 18 2>&1 | tail -1
done

echo -e "\n=== Committing sequence 18 ==="
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 2.18 --sequence 18 \
  --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

echo -e "\n=== Testing chaincode query ==="
sleep 3
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetAllExporters"]}' 2>&1 | head -10
  
echo -e "\n=== BLOCKCHAIN CONNECTION TEST COMPLETE ==="
