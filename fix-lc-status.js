#!/usr/bin/env node
// Fix LC status from SHIPPED to ISSUED
// This script updates the LC that was incorrectly set to SHIPPED status

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function fixLCStatus() {
  console.log('🔧 Fixing LC status from SHIPPED to ISSUED...\n');
  
  try {
    // The LC ID from the logs
    const lcID = 'LC1787055024941';
    const newStatus = 'ISSUED';
    
    console.log(`Updating LC ${lcID} to status: ${newStatus}`);
    
    const command = `docker exec peer0.ecta.cecbs.et bash -c 'export FABRIC_CFG_PATH=/etc/hyperledger/fabric; export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@ecta.cecbs.et/msp; peer chaincode invoke -o orderer.cecbs.et:7050 --ordererTLSHostnameOverride orderer.cecbs.et --tls --cafile /var/hyperledger/orderer-tls/tlsca.cecbs.et-cert.pem -C coffeechannel -n coffee -c "{\\"function\\":\\"UpdateLCStatus\\",\\"Args\\":[\\"${lcID}\\",\\"${newStatus}\\"]}"'`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && !stderr.includes('Chaincode invoke successful')) {
      console.error('❌ Error:', stderr);
      return false;
    }
    
    console.log('✅ LC status updated successfully!');
    console.log(stdout);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update LC status:', error.message);
    return false;
  }
}

fixLCStatus().then(success => {
  if (success) {
    console.log('\n✅ LC status fix completed');
    process.exit(0);
  } else {
    console.log('\n❌ LC status fix failed');
    process.exit(1);
  }
});
