#!/bin/bash

# Register Exporter Directly on Blockchain via Peer CLI

echo "=========================================="
echo "Registering EXP001 Directly on Blockchain"
echo "=========================================="

# Register exporter using peer CLI as ECTAMSP
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode invoke \
  -o orderer.cecbs.et:7050 \
  --tls \
  --cafile /organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"RegisterExporter","Args":["EXP001","Test Coffee Exporter Ltd","ECTA-2024-001","company","5000000","yes","TASTER-CERT-001","LAB-CERT-001","2027-12-31"]}' \
  --waitForEvent

echo ""
echo "=========================================="
echo "Verifying registration..."
echo "=========================================="

# Query to verify
docker exec \
  -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"ReadExporter","Args":["EXP001"]}'

echo ""
echo "=========================================="
