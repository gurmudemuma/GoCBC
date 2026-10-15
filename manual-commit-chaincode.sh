#!/bin/bash

# Manual Chaincode Commit
# This script manually commits the installed and approved chaincode

set -e

echo "=============================================="
echo "Manual Chaincode Commit"
echo "=============================================="
echo ""

PACKAGE_ID="coffee_1.0:5520674eca7e1c884926e36270381f68ca663e43a8450fb616c86849004fa021"

echo "Package ID: $PACKAGE_ID"
echo ""

# Commit the chaincode
echo "Committing chaincode to channel..."
docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
export CORE_PEER_LOCALMSPID=ECXMSP
export CORE_PEER_ADDRESS=peer0.ecx.cecbs.et:8051
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt

peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem \
    --channelID coffeechannel \
    --name coffee \
    --version 1.0 \
    --sequence 1 \
    --peerAddresses peer0.ecx.cecbs.et:8051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt
"

echo ""
echo "=============================================="
echo "Verifying commit..."
echo "=============================================="
echo ""

docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee
"

echo ""
echo "=============================================="
echo "Testing chaincode..."
echo "=============================================="
echo ""

docker exec peer0.ecx.cecbs.et bash -c "
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp
peer chaincode query -C coffeechannel -n coffee -c '{\"function\":\"QueryAllExporters\",\"Args\":[]}'
"

echo ""
echo "=============================================="
echo "Done!"
echo "=============================================="
