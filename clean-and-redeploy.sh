#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  COMPLETE FRESH START - Clearing All Blockchain Data"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Stop all containers
echo "1. Stopping all blockchain containers..."
cd /home/guda/GoCBC
docker compose -f docker-compose-fabric.yml down

# Remove all persistent data
echo "2. Removing all blockchain persistent data..."
sudo rm -rf blockchain/channel-artifacts/*
sudo rm -rf blockchain/system-genesis-block/*

# Remove all peer data
echo "3. Removing all peer ledger data..."
for org in ecta ecx banks nbe customs shipping; do
    sudo rm -rf blockchain/organizations/peerOrganizations/${org}.cecbs.et/peers/peer0.${org}.cecbs.et/production
done

# Remove orderer data
echo "4. Removing orderer data..."
sudo rm -rf blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/production

# Clean chaincode packages
echo "5. Cleaning old chaincode packages..."
rm -f chaincodes/coffee/*.tar.gz
rm -rf chaincodes/coffee/pkg-temp
rm -rf chaincodes/coffee/code-temp

echo ""
echo "✓ All blockchain data cleared!"
echo ""
echo "6. Starting fresh blockchain network..."
docker compose -f docker-compose-fabric.yml up -d orderer.cecbs.et \
    peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et \
    peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et \
    ca.ecta.cecbs.et ca.ecx.cecbs.et ca.banks.cecbs.et \
    ca.nbe.cecbs.et ca.customs.cecbs.et ca.shipping.cecbs.et \
    couchdb0 couchdb1 couchdb2 couchdb3 couchdb4 couchdb5

echo "Waiting 10 seconds for network to stabilize..."
sleep 10

echo ""
echo "7. Creating channel..."
docker exec peer0.ecta.cecbs.et peer channel create \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    -f /etc/hyperledger/fabric/channel-artifacts/coffeechannel.tx \
    --outputBlock /etc/hyperledger/fabric/channel-artifacts/coffeechannel.block \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

echo ""
echo "8. Joining all peers to channel..."
for peer in peer0.ecta.cecbs.et peer0.ecx.cecbs.et peer0.banks.cecbs.et peer0.nbe.cecbs.et peer0.customs.cecbs.et peer0.shipping.cecbs.et; do
    echo "   Joining $peer..."
    docker exec $peer peer channel join \
        -b /etc/hyperledger/fabric/channel-artifacts/coffeechannel.block
done

echo ""
echo "9. Updating anchor peers..."
docker exec peer0.ecta.cecbs.et peer channel update \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    -f /etc/hyperledger/fabric/channel-artifacts/ECTAMSPanchors.tx \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

docker exec peer0.ecx.cecbs.et peer channel update \
    -o orderer.cecbs.et:7050 \
    -c coffeechannel \
    -f /etc/hyperledger/fabric/channel-artifacts/ECXMSPanchors.tx \
    --tls --cafile /etc/hyperledger/fabric/orderer-tls/tlsca.cecbs.et-cert.pem

echo ""
echo "✓ Fresh blockchain network created!"
echo ""
echo "10. Now deploying chaincode v1.0 as sequence 1..."

# Deploy using the standard script which will see no existing version and start fresh
bash /home/guda/GoCBC/deploy-chaincode.sh

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ COMPLETE FRESH DEPLOYMENT FINISHED"
echo "═══════════════════════════════════════════════════════════════"
