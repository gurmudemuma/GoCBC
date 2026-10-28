#!/bin/bash

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   APPROVING AND COMMITTING CHAINCODE                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/guda/GoCBC/blockchain

PACKAGE_ID="coffee_1.73:1a98e2ff3a0091d86552052d62684f2f861f9bef69a6ce218e79540245c5438b"

echo "Package ID: $PACKAGE_ID"
echo ""

# Approve for each organization
echo "=== Approving chaincode for all organizations ==="
echo ""

echo "1/3 Approving for ECTA..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 && echo "  ✓ ECTA approved" || echo "  ⚠ ECTA approval issue"

echo ""
echo "2/3 Approving for NBE..."
docker exec \
    -e CORE_PEER_LOCALMSPID="NBEMSP" \
    -e CORE_PEER_ADDRESS=peer0.nbe.cecbs.et:10051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
    peer0.nbe.cecbs.et \
    peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 && echo "  ✓ NBE approved" || echo "  ⚠ NBE approval issue"

echo ""
echo "3/3 Approving for Banks..."
docker exec \
    -e CORE_PEER_LOCALMSPID="BanksMSP" \
    -e CORE_PEER_ADDRESS=peer0.banks.cecbs.et:9051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et \
    peer lifecycle chaincode approveformyorg \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --package-id "$PACKAGE_ID" \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 && echo "  ✓ Banks approved" || echo "  ⚠ Banks approval issue"

echo ""
echo "=== Checking commit readiness ==="
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode checkcommitreadiness \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1

echo ""
echo "=== Committing chaincode to channel ==="
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer lifecycle chaincode commit \
    -o orderer.cecbs.et:7050 \
    --channelID coffeechannel \
    --name coffee \
    --version 1.73 \
    --sequence 1 \
    --tls \
    --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt 2>&1

echo ""
echo "=== Waiting for chaincode to be ready ==="
sleep 5

echo ""
echo "=== Testing chaincode ==="
RESULT=$(docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_ADDRESS=peer0.ecta.cecbs.et:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1)

if echo "$RESULT" | grep -q -E "Error|error|failed"; then
    echo "⚠️  Chaincode query returned:"
    echo "$RESULT"
    echo ""
    echo "Checking committed chaincodes..."
    docker exec \
        -e CORE_PEER_LOCALMSPID="ECTAMSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
        peer0.ecta.cecbs.et \
        peer lifecycle chaincode querycommitted --channelID coffeechannel 2>&1
else
    echo "✅ SUCCESS! Chaincode is working!"
    echo "Response: $RESULT"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║   🎉 BLOCKCHAIN 100% OPERATIONAL!                          ║"
    echo "║                                                            ║"
    echo "║   ✅ Channel:     coffeechannel                            ║"
    echo "║   ✅ Chaincode:   coffee v1.73                             ║"
    echo "║   ✅ Committed:   Yes                                      ║"
    echo "║   ✅ Organizations: ECTA, NBE, Banks                       ║"
    echo "║                                                            ║"
    echo "║   GoCBC is now 100% complete with blockchain!              ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
fi

echo ""
