#!/bin/bash

# Initialize chaincode ledger with sample data using Admin identity

set -e

CHANNEL_NAME="coffeechannel"
CHAINCODE_NAME="coffee"
ORDERER_CA="/work/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"
WORK_DIR="$(pwd)"

echo "============================================================================"
echo "  Initializing Chaincode Ledger with Sample Data"
echo "============================================================================"

echo ""
echo "Invoking InitLedger function as ECTA Admin..."

docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -w /work \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer chaincode invoke \
        -o orderer.cecbs.et:7050 \
        --tls \
        --cafile ${ORDERER_CA} \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        --peerAddresses peer0.ecta.cecbs.et:7051 \
        --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.ecx.cecbs.et:8051 \
        --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt \
        --peerAddresses peer0.banks.cecbs.et:9051 \
        --tlsRootCertFiles /work/blockchain/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
        -c '{"function":"InitLedger","Args":[]}'

echo ""
echo "✅ Ledger initialized successfully!"
echo ""
echo "Testing query..."

docker run --rm \
    --network cecbs-network \
    -v "${WORK_DIR}:/work" \
    -w /work \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer chaincode query \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        -c '{"Args":["GetAllShipments"]}'

echo ""
echo "============================================================================"
echo "  ✅ Chaincode Initialization Complete!"
echo "============================================================================"
