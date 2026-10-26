// Inspect Blockchain Data Structure
const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function inspectBlockchainData() {
  let gateway;
  
  try {
    console.log('\n🔍 Inspecting Blockchain Data Structure...\n');
    
    // Connect to blockchain
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin-ECTAMSP');
    
    if (!identity) {
      console.log('❌ Admin identity not found');
      return;
    }
    
    const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'connection-ecta.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin-ECTAMSP',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');
    
    console.log('✅ Connected to blockchain\n');
    
    // Get first exporter
    console.log('═'.repeat(80));
    console.log('📦 EXPORTER DATA STRUCTURE');
    console.log('═'.repeat(80));
    const exportersResult = await contract.evaluateTransaction('QueryAllExporters');
    const exporters = JSON.parse(exportersResult.toString());
    
    if (exporters.length > 0) {
      console.log('\nFirst Exporter (ALL FIELDS):');
      console.log(JSON.stringify(exporters[0], null, 2));
      
      console.log('\nAvailable Fields:');
      Object.keys(exporters[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof exporters[0][key]}`);
      });
    }
    
    // Get first contract
    console.log('\n' + '═'.repeat(80));
    console.log('📜 CONTRACT DATA STRUCTURE');
    console.log('═'.repeat(80));
    const contractsResult = await contract.evaluateTransaction('QueryAllContracts');
    const contracts = JSON.parse(contractsResult.toString());
    
    if (contracts.length > 0) {
      console.log('\nFirst Contract (ALL FIELDS):');
      console.log(JSON.stringify(contracts[0], null, 2));
      
      console.log('\nAvailable Fields:');
      Object.keys(contracts[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof contracts[0][key]}`);
      });
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 ANALYSIS FOR AUDIT TRAIL');
    console.log('═'.repeat(80));
    
    if (exporters.length > 0) {
      const exp = exporters[0];
      console.log('\n📦 Exporter Audit Info:');
      console.log(`  Performer: ${exp.createdBy || exp.CreatedBy || exp.registeredBy || 'NOT FOUND'}`);
      console.log(`  IP Address: ${exp.ipAddress || exp.IPAddress || 'NOT FOUND'}`);
      console.log(`  Timestamp: ${exp.createdAt || exp.CreatedAt || exp.timestamp || 'NOT FOUND'}`);
      console.log(`  Organization: ${exp.organization || exp.Organization || exp.mspId || 'NOT FOUND'}`);
    }
    
    if (contracts.length > 0) {
      const con = contracts[0];
      console.log('\n📜 Contract Audit Info:');
      console.log(`  Performer: ${con.createdBy || con.CreatedBy || con.registeredBy || 'NOT FOUND'}`);
      console.log(`  IP Address: ${con.ipAddress || con.IPAddress || 'NOT FOUND'}`);
      console.log(`  Timestamp: ${con.createdAt || con.CreatedAt || con.timestamp || 'NOT FOUND'}`);
      console.log(`  Organization: ${con.organization || con.Organization || con.mspId || 'NOT FOUND'}`);
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (gateway) {
      gateway.disconnect();
    }
  }
}

inspectBlockchainData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
