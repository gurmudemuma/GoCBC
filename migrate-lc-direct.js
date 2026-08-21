// Direct LC Migration using Node.js
const { execSync } = require('child_process');

console.log('================================================================');
console.log('  Migrating LC Status: SHIPPED → ISSUED');
console.log('================================================================');
console.log('');
console.log('LC ID: LC1787055024941');
console.log('Target Status: ISSUED');
console.log('');

const command = `docker exec peer0.ecta.cecbs.et bash -c "export CORE_PEER_LOCALMSPID=ECTAMSP && export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/ecta.cecbs.et/users/Admin@ecta.cecbs.et/msp && peer chaincode invoke -o orderer.cecbs.et:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/msp/tlscacerts/tlsca.cecbs.et-cert.pem -C coffeechannel -n coffee --peerAddresses peer0.ecta.cecbs.et:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/ecta.cecbs.et/peers/peer0.ecta.cecbs.et/tls/ca.crt --peerAddresses peer0.banks.cecbs.et:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/banks.cecbs.et/peers/peer0.banks.cecbs.et/tls/ca.crt -c '{\\\"function\\\":\\\"MigrateLCStatus\\\",\\\"Args\\\":[\\\"LC1787055024941\\\",\\\"ISSUED\\\"]}'"`;

try {
  console.log('Executing migration...');
  const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  console.log('');
  console.log('Output:');
  console.log(output);
  console.log('');
  console.log('================================================================');
  console.log('  ✅ Migration Successful!');
  console.log('================================================================');
  console.log('');
  console.log('Next steps:');
  console.log('1. Refresh your browser (Ctrl+Shift+R)');
  console.log('2. Go to Exporter Portal → Forex & Banking tab');
  console.log('3. LC should now show "Forex Allocated" with KPI count = 1');
} catch (error) {
  console.error('');
  console.error('❌ Migration failed:');
  console.error(error.message);
  if (error.stderr) {
    console.error('');
    console.error('Error details:');
    console.error(error.stderr.toString());
  }
  process.exit(1);
}
