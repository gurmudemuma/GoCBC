#!/bin/bash

set -e

CHANNEL_NAME="coffeechannel"
CHAINCODE_NAME="coffee"

echo "=== Registering Exporter EXP001 on Blockchain ==="

# Invoke registerExporter function on chaincode
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
    -c '{"function":"registerExporter","Args":["EXP001","Test Coffee Exporter","ECTA-2024-001"]}'

echo ""
echo "✅ Exporter registered on blockchain"

# Query to verify
echo "Verifying registration..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode query \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    -c '{"function":"getExporter","Args":["EXP001"]}'

echo ""
echo "Done!"
