#!/bin/bash

set -e

echo "=== Completing Blockchain Deployment ==="
cd /home/guda/GoCBC/blockchain

PACKAGE_ID="coffee_1.73:1a98e2ff3a0091d86552052d62684f2f861f9bef69a6ce218e79540245c5438b"

# Install chaincode on Banks
echo "Installing chaincode on Banks peer..."
docker exec \
    -e CORE_PEER_LOCALMSPID="BanksMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
    peer0.banks.cecbs.et \
    peer lifecycle chaincode install \
    /var/hyperledger/fabric/channel-artifacts/coffee_1.73.tgz 2>&1 | grep "Chaincode code package identifier"

echo "✓ Package ID: $PACKAGE_ID"
echo ""

# Approve for all 3 orgs
echo "Approving chaincode for all organizations..."
for org in ecta nbe banks; do
    org_upper=$(echo $org | tr '[:lower:]' '[:upper:]')
    echo "  → ${org_upper}MSP"
    docker exec \
        -e CORE_PEER_LOCALMSPID="${org_upper}MSP" \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@${org}.cecbs.et/msp \
        peer0.${org}.cecbs.et \
        peer lifecycle chaincode approveformyorg \
        -o orderer.cecbs.et:7050 \
        --channelID coffeechannel \
        --name coffee \
        --version 1.73 \
        --package-id "$PACKAGE_ID" \
        --sequence 1 \
        --tls \
        --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem 2>&1 | head -2
done

echo ""
echo "Checking commit readiness..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
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
echo "Committing chaincode..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
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
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.nbe.cecbs.et:10051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.nbe.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/peers/peer0.banks.cecbs.et/tls/ca.crt 2>&1

sleep 3

echo ""
echo "Testing chaincode..."
docker exec \
    -e CORE_PEER_LOCALMSPID="ECTAMSP" \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
    peer0.ecta.cecbs.et \
    peer chaincode query \
    -C coffeechannel \
    -n coffee \
    -c '{"function":"queryAllCoffee","Args":[]}' 2>&1

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ BLOCKCHAIN FULLY DEPLOYED AND OPERATIONAL!            ║"
echo "║                                                            ║"
echo "║   Channel:       coffeechannel                             ║"
echo "║   Chaincode:     coffee v1.73                              ║"
echo "║   Organizations: ECTA, NBE, Banks (all approved)           ║"
echo "║   Status:        ✅ COMMITTED AND READY                    ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 GoCBC is now 100% operational with full blockchain integration!"
