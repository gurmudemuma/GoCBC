#!/bin/bash

set -e

echo "=== Initializing Blockchain Ledger with Test Data ==="

# Try to call InitLedger function
echo "Calling InitLedger..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    -C coffeechannel \
    -n coffee \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecx.cecbs.et:8051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecx-ca.crt \
    -c '{"function":"InitLedger","Args":[]}'

echo ""
echo "Ledger initialized!"

# Try to query an exporter to verify
echo "Verifying exporter data..."
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"QueryAllExporters","Args":[]}'

echo ""
echo "Done!"
