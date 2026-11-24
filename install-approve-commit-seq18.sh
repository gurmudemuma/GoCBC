#!/bin/bash
set -e

PACKAGE_FILE="/home/guda/GoCBC/chaincodes/coffee/coffee_2.18_tls.tgz"

echo "=== Installing TLS-enabled chaincode package on all peers ==="

# Install on all 6 peers
for PEER_INFO in "peer0.ecta.cecbs.et:7051:ECTAMSP:ecta.cecbs.et" \
                  "peer0.ecx.cecbs.et:8051:ECXMSP:ecx.cecbs.et" \
                  "peer0.banks.cecbs.et:9051:BanksMSP:banks.cecbs.et" \
                  "peer0.nbe.cecbs.et:10051:NBEMSP:nbe.cecbs.et" \
                  "peer0.customs.cecbs.et:11051:CustomsMSP:customs.cecbs.et" \
                  "peer0.shipping.cecbs.et:12051:ShippingMSP:shipping.cecbs.et"; do
    
    IFS=':' read -r PEER_NAME PEER_PORT MSP_ID ORG <<< "$PEER_INFO"
    echo "Installing on $PEER_NAME..."
    
    docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}/msp \
      -e CORE_PEER_ADDRESS=${PEER_NAME}:${PEER_PORT} \
      ${PEER_NAME} peer lifecycle chaincode install "$PACKAGE_FILE" 2>&1 | grep "Chaincode code package identifier"
done

echo -e "\n=== Getting package ID ==="
PACKAGE_ID=$(docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "coffee_2.18_tls" | awk '{print $3}' | sed 's/,$//')

echo "Package ID: $PACKAGE_ID"

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not get package ID"
    exit 1
fi

echo -e "\n=== Approving sequence 18 for all organizations ==="

for PEER_INFO in "peer0.ecta.cecbs.et:7051:ECTAMSP:ecta.cecbs.et" \
                  "peer0.ecx.cecbs.et:8051:ECXMSP:ecx.cecbs.et" \
                  "peer0.banks.cecbs.et:9051:BanksMSP:banks.cecbs.et" \
                  "peer0.nbe.cecbs.et:10051:NBEMSP:nbe.cecbs.et" \
                  "peer0.customs.cecbs.et:11051:CustomsMSP:customs.cecbs.et" \
                  "peer0.shipping.cecbs.et:12051:ShippingMSP:shipping.cecbs.et"; do
    
    IFS=':' read -r PEER_NAME PEER_PORT MSP_ID ORG <<< "$PEER_INFO"
    echo "Approving for $MSP_ID..."
    
    docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${ORG}/msp \
      -e CORE_PEER_ADDRESS=${PEER_NAME}:${PEER_PORT} \
      -e CORE_PEER_LOCALMSPID=${MSP_ID} \
      ${PEER_NAME} peer lifecycle chaincode approveformyorg \
      -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
      --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
      --channelID coffeechannel --name coffee --version 2.18 --package-id "$PACKAGE_ID" \
      --sequence 18 2>&1 | grep -E "successfully|error"
done

echo -e "\n=== Committing sequence 18 ==="

docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode commit \
  -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
  --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
  --channelID coffeechannel --name coffee --version 2.18 --sequence 18 \
  --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
  --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt

echo -e "\n=== DONE! Testing query ==="
sleep 3

docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetAllExporters"]}' 2>&1 | head -5
