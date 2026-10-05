#!/bin/bash

# Test chaincode query using Admin identity instead of peer identity

set -e

echo "Testing chaincode query with ECTA Admin identity..."

docker run --rm \
    --network cecbs-network \
    -v "$(pwd):/work" \
    -w /work \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/work/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer chaincode query \
        -C coffeechannel \
        -n coffee \
        -c '{"Args":["GetAllShipments"]}'

echo ""
echo "✓ Query successful!"
