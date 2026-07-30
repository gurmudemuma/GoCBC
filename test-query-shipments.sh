#!/bin/bash
# Test QueryAllShipments directly through peer CLI

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="ECTAMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=/c/goCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=/c/goCBC/blockchain/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp
export CORE_PEER_ADDRESS=localhost:7051

echo "Testing QueryAllShipments chaincode function..."
echo "================================================"
echo ""

# Query all shipments
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"Args":["QueryAllShipments"]}' \
  2>&1 | head -50

echo ""
echo "================================================"
echo "If you see JSON output above, the fix worked!"
echo "If you see 'Invalid type' error, the fix failed."
