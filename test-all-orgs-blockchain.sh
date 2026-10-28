#!/bin/bash

# GoCBC Blockchain - Multi-Organization Test Script
# Tests chaincode invocation from all 6 organizations

set -e

CHANNEL_NAME="coffeechannel"
CHAINCODE_NAME="coffee"
ORDERER_CA="/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem"

echo "════════════════════════════════════════════════════════════"
echo "  GoCBC BLOCKCHAIN - MULTI-ORGANIZATION TEST"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test function
test_org() {
    local ORG_NAME=$1
    local ORG_MSP=$2
    local PEER_ADDRESS=$3
    local PEER_PORT=$4
    local TLS_CERT=$5
    
    echo "Testing $ORG_NAME..."
    
    docker run --rm --network cecbs-network \
        -v $(pwd)/blockchain/organizations:/organizations \
        -e CORE_PEER_LOCALMSPID=$ORG_MSP \
        -e CORE_PEER_TLS_ENABLED=true \
        -e CORE_PEER_TLS_ROOTCERT_FILE=$TLS_CERT \
        -e CORE_PEER_MSPCONFIGPATH=/organizations/peerOrganizations/${ORG_NAME}.cecbs.et/users/User1@${ORG_NAME}.cecbs.et/msp \
        -e CORE_PEER_ADDRESS=$PEER_ADDRESS:$PEER_PORT \
        hyperledger/fabric-tools:2.5 \
        peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME \
        -c '{"Args":["QueryAllContracts"]}' 2>&1 | grep -q "Error" && echo "  ❌ $ORG_NAME - Query failed" || echo "  ✅ $ORG_NAME - Query successful"
}

# Test all organizations
test_org "ecta" "ECTAMSP" "peer0.ecta.cecbs.et" "7051" "/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt"

test_org "ecx" "ECXMSP" "peer0.ecx.cecbs.et" "8051" "/organizations/peerOrganizations/ecx.cecbs.et/peers/peer0.ecx.cecbs.et/tls/ca.crt"

test_org "banks" "BanksMSP" "peer0.banks.cecbs.et" "9051" "/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt"

test_org "nbe" "NBEMSP" "peer0.nbe.cecbs.et" "10051" "/organizations/peerOrganizations/nbe.cecbs.et/peers/peer0.nbe.cecbs.et/tls/ca.crt"

test_org "customs" "CustomsMSP" "peer0.customs.cecbs.et" "11051" "/organizations/peerOrganizations/customs.cecbs.et/peers/peer0.customs.cecbs.et/tls/ca.crt"

test_org "shipping" "ShippingMSP" "peer0.shipping.cecbs.et" "12051" "/organizations/peerOrganizations/shipping.cecbs.et/peers/peer0.shipping.cecbs.et/tls/ca.crt"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Test Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next: Test transaction invocation from all orgs"
echo ""

# Test a sample transaction (InitLedger)
echo "Testing InitLedger invocation..."
docker run --rm --network cecbs-network \
    -v $(pwd)/blockchain/organizations:/organizations \
    -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/organizations/peerOrganizations/ecta.cecbs.et/users/User1@ecta.cecbs.et/msp \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    hyperledger/fabric-tools:2.5 \
    peer chaincode invoke -o orderer.cecbs.et:7050 \
    --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile $ORDERER_CA \
    -C $CHANNEL_NAME -n $CHAINCODE_NAME \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    -c '{"function":"InitLedger","Args":[]}' 2>&1 | grep -q "status:200" && echo "✅ InitLedger successful" || echo "❌ InitLedger failed"

echo ""
echo "All tests completed!"
echo ""
