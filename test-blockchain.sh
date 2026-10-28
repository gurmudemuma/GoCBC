#!/bin/bash

set -e

echo "========================================="
echo "GoCBC Blockchain Comprehensive Test"
echo "========================================="

# Test 1: Check channel info
echo ""
echo "Test 1: Channel Information"
echo "----------------------------"
docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel 2>&1 | grep -E "(height|Current block hash)"

# Test 2: Invoke initLedger
echo ""
echo "Test 2: Initialize Ledger"
echo "----------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    -c '{"function":"initLedger","Args":[]}' --waitForEvent 2>&1

# Test 3: Query coffee
echo ""
echo "Test 3: Query All Coffee"
echo "----------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"function":"getAllCoffee","Args":[]}' 2>&1 | head -20

# Test 4: Create new coffee
echo ""
echo "Test 4: Create New Coffee"
echo "----------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode invoke \
    -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et \
    --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    -C coffeechannel -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/ecta-ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/channel-artifacts/peer-tls/nbe-ca.crt \
    -c '{"function":"createCoffee","Args":["TEST001","100","Yirgacheffe","Ethiopia","Washed","Arabica","ECTA","Available"]}' --waitForEvent 2>&1

# Test 5: Query the created coffee
echo ""
echo "Test 5: Query Created Coffee"
echo "----------------------------"
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/User1@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et peer chaincode query \
    -C coffeechannel -n coffee \
    -c '{"function":"queryCoffee","Args":["TEST001"]}' 2>&1

# Test 6: Check final channel height
echo ""
echo "Test 6: Final Channel State"
echo "----------------------------"
docker exec peer0.ecta.cecbs.et peer channel getinfo -c coffeechannel 2>&1 | grep -E "(height|Current block hash)"

echo ""
echo "========================================="
echo "Test Complete!"
echo "========================================="
