#!/bin/bash

# Final LC Migration Script
# Uses winpty to avoid Git Bash path conversion issues

echo "================================================================"
echo "  Migrating LC Status: SHIPPED → ISSUED"
echo "================================================================"
echo ""
echo "LC ID: LC1787055024941"
echo "Target Status: ISSUED"
echo ""
echo "Invoking chaincode migration function..."
echo ""

# Use winpty if available (for Git Bash on Windows)
DOCKER_CMD="docker"
if command -v winpty &> /dev/null; then
    DOCKER_CMD="winpty docker"
fi

$DOCKER_CMD exec -i peer0.ecta.cecbs.et peer chaincode invoke \
  -o orderer.cecbs.et:7050 \
  --tls \
  --cafile /etc/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
  -C coffeechannel \
  -n coffee \
  --peerAddresses peer0.ecta.cecbs.et:7051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
  --peerAddresses peer0.banks.cecbs.et:9051 \
  --tlsRootCertFiles /etc/hyperledger/fabric/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
  -c '{"function":"MigrateLCStatus","Args":["LC1787055024941","ISSUED"]}'

EXIT_CODE=$?

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "================================================================"
    echo "  ✅ Migration Successful!"
    echo "================================================================"
    echo ""
    echo "LC LC1787055024941 has been migrated to status: ISSUED"
    echo ""
    echo "Next steps:"
    echo "1. Refresh your browser (Ctrl+Shift+R)"
    echo "2. Go to Exporter Portal → Forex & Banking tab"
    echo "3. You should now see:"
    echo "   - LC displayed with 'Forex Allocated' label"
    echo "   - KPI count showing 1"
    echo ""
else
    echo "================================================================"
    echo "  ❌ Migration Failed"
    echo "================================================================"
    echo ""
    echo "Error code: $EXIT_CODE"
    echo ""
    echo "Please try running in PowerShell instead:"
    echo "See FINAL-STATUS-SUMMARY.md for PowerShell command"
    echo ""
fi
