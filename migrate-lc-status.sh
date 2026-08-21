#!/bin/bash

# Migrate Existing LC Status from SHIPPED to ISSUED

echo "════════════════════════════════════════════════════════════════"
echo "  Migrating LC Status: SHIPPED → ISSUED"
echo "════════════════════════════════════════════════════════════════"
echo ""

LC_ID="LC1787055024941"
NEW_STATUS="ISSUED"

echo "LC ID: $LC_ID"
echo "Target Status: $NEW_STATUS"
echo ""

# Invoke migration function
echo "Invoking MigrateLCStatus chaincode function..."
echo ""

docker exec peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
  -C coffeechannel \
  -n coffee \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
  -c "{\"function\":\"MigrateLCStatus\",\"Args\":[\"$LC_ID\",\"$NEW_STATUS\"]}"

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  ✅ Migration Successful!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "LC $LC_ID has been migrated to status: $NEW_STATUS"
    echo ""
    echo "Next steps:"
    echo "1. Refresh your browser (Ctrl+Shift+R)"
    echo "2. Go to Exporter Portal → Forex & Banking tab"
    echo "3. You should now see:"
    echo "   - LC displayed with 'Forex Allocated' label"
    echo "   - KPI count showing 1"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    echo ""
fi
