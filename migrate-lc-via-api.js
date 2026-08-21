#!/usr/bin/env node

// Migrate LC Status via API
const https = require('https');
const http = require('http');

const LC_ID = 'LC1787055024941';
const NEW_STATUS = 'ISSUED';

console.log('════════════════════════════════════════════════════════════════');
console.log('  Migrating LC Status via Chaincode');
console.log('════════════════════════════════════════════════════════════════');
console.log('');
console.log(`LC ID: ${LC_ID}`);
console.log(`Current Status: SHIPPED (invalid)`);
console.log(`Target Status: ${NEW_STATUS}`);
console.log('');

// We need to invoke the chaincode function directly
// Since we have peer access, let's use the fabric SDK approach

const { exec } = require('child_process');

const command = `
cd /c/goCBC && 
docker exec -e CORE_PEER_LOCALMSPID=ECTAMSP \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp \
  peer0.ecta.cecbs.et \
  peer chaincode invoke \
    -o orderer.cecbs.et:7050 \
    --tls \
    --cafile /etc/hyperledger/fabric/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem \
    -C coffeechannel \
    -n coffee \
    --peerAddresses peer0.ecta.cecbs.et:7051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt \
    --peerAddresses peer0.banks.cecbs.et:9051 \
    --tlsRootCertFiles /etc/hyperledger/fabric/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt \
    -c '{"function":"MigrateLCStatus","Args":["${LC_ID}","${NEW_STATUS}"]}'
`;

console.log('Invoking chaincode migration function...');
console.log('');

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    console.error('');
    console.error('Stderr:', stderr);
    process.exit(1);
  }

  if (stderr) {
    console.log('Stderr output:', stderr);
  }

  console.log('Stdout:', stdout);
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  ✅ Migration Command Executed');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Next steps:');
  console.log('1. Refresh your browser (Ctrl+Shift+R)');
  console.log('2. Go to Exporter Portal → Forex & Banking tab');
  console.log('3. You should now see:');
  console.log('   - LC displayed with "Forex Allocated" label');
  console.log('   - KPI count showing 1');
  console.log('');
});
