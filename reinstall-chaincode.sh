#!/bin/bash
set -e

echo "══════════════════════════════════════════════════════"
echo "  Reinstalling Coffee Chaincode v2.18 with Updated Connection"
echo "══════════════════════════════════════════════════════"
echo ""

cd /home/guda/GoCBC/chaincodes/coffee

# Create package
echo "Creating chaincode package..."
rm -f code.tar.gz coffee-ccaas.tar.gz
tar czf code.tar.gz connection.json
tar czf coffee-ccaas.tar.gz code.tar.gz metadata.json
echo "✓ Package created"
echo ""

# Install on all peers with admin identity
echo "Installing on all peers..."

# ECTA
echo "  Installing on peer0.ecta.cecbs.et..."
docker cp coffee-ccaas.tar.gz peer0.ecta.cecbs.et:/tmp/coffee-ccaas.tar.gz
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et peer lifecycle chaincode install /tmp/coffee-ccaas.tar.gz 2>&1 | tail -2

# ECX
echo "  Installing on peer0.ecx.cecbs.et..."
docker cp coffee-ccaas.tar.gz peer0.ecx.cecbs.et:/tmp/coffee-ccaas.tar.gz
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecx.cecbs.et/msp \
  peer0.ecx.cecbs.et peer lifecycle chaincode install /tmp/coffee-ccaas.tar.gz 2>&1 | tail -2

# Banks
echo "  Installing on peer0.banks.cecbs.et..."
docker cp coffee-ccaas.tar.gz peer0.banks.cecbs.et:/tmp/coffee-ccaas.tar.gz
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@banks.cecbs.et/msp \
  peer0.banks.cecbs.et peer lifecycle chaincode install /tmp/coffee-ccaas.tar.gz 2>&1 | tail -2

# NBE
echo "  Installing on peer0.nbe.cecbs.et..."
docker cp coffee-ccaas.tar.gz peer0.nbe.cecbs.et:/tmp/coffee-ccaas.tar.gz
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@nbe.cecbs.et/msp \
  peer0.nbe.cecbs.et peer lifecycle chaincode install /tmp/coffee-ccaas.tar.gz 2>&1 | tail -2

# Customs
echo "  Installing on peer0.customs.cecbs.et..."
docker cp coffee-ccaas.tar.gz peer0.customs.cecbs.et:/tmp/coffee-ccaas.tar.gz
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@customs.cecbs.et/msp \
  peer0.customs.cecbs.et peer lifecycle chaincode install /tmp/coffee-ccaas.tar.gz 2>&1 | tail -2

# Shipping
echo "  Installing on peer0.shipping.cecbs.et..."
docker cp coffee-ccaas.tar.gz peer0.shipping.cecbs.et:/tmp/coffee-ccaas.tar.gz
docker exec -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@shipping.cecbs.et/msp \
  peer0.shipping.cecbs.et peer lifecycle chaincode install /tmp/coffee-ccaas.tar.gz 2>&1 | tail -2

echo ""
echo "✓ Installation complete"
echo ""

# Get new package ID
echo "New package ID:"
docker exec peer0.ecta.cecbs.et peer lifecycle chaincode queryinstalled 2>&1 | grep "coffee_2.18" | tail -1

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Next Steps:"
echo "══════════════════════════════════════════════════════"
echo "1. Get the new package ID from above"
echo "2. Approve for each org with the new package ID"
echo "3. Commit the chaincode with sequence 17"
echo ""
