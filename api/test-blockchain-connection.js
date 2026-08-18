// Test Blockchain Connection for Audit Trail
const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function testConnection() {
  console.log('\n🔗 Testing Hyperledger Fabric Connection...\n');
  
  try {
    // Load wallet
    const walletPath = path.join(__dirname, 'wallet');
    console.log('📁 Wallet Path:', walletPath);
    
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if admin identity exists
    const identity = await wallet.get('admin-ECTAMSP');
    if (!identity) {
      console.log('❌ Admin identity not found in wallet');
      return false;
    }
    console.log('✅ Found admin-ECTAMSP identity in wallet');
    
    // Build connection profile path
    const ccpPath = path.resolve(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'connection-ecta.json');
    console.log('📄 Connection Profile Path:', ccpPath);
    console.log('   Exists:', fs.existsSync(ccpPath) ? 'YES' : 'NO');
    
    if (!fs.existsSync(ccpPath)) {
      console.log('❌ Connection profile not found');
      return false;
    }
    
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    console.log('✅ Connection profile loaded');
    console.log('   Peers:', Object.keys(ccp.peers || {}).join(', '));
    
    // Check TLS cert
    const tlsCertPath = path.join(__dirname, '..', 'blockchain', 'organizations', 'peerOrganizations', 'ecta.cecbs.et', 'peers', 'peer0.ecta.cecbs.et', 'tls', 'ca.crt');
    console.log('🔐 TLS Cert Path:', tlsCertPath);
    console.log('   Exists:', fs.existsSync(tlsCertPath) ? 'YES' : 'NO');
    
    // Connect to gateway
    console.log('\n🔌 Connecting to gateway...');
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin-ECTAMSP',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    console.log('✅ Connected to gateway');
    
    // Get network and contract
    console.log('📡 Getting network channel: coffeechannel...');
    const network = await gateway.getNetwork('coffeechannel');
    console.log('✅ Connected to channel');
    
    console.log('📜 Getting coffee chaincode contract...');
    const contract = network.getContract('coffee');
    console.log('✅ Got contract');
    
    // Query exporters
    console.log('\n📦 Querying all exporters from blockchain...');
    const result = await contract.evaluateTransaction('QueryAllExporters');
    const exporters = JSON.parse(result.toString());
    
    console.log(`✅ Found ${exporters.length} exporters on blockchain`);
    if (exporters.length > 0) {
      console.log('   First exporter:', exporters[0].exporterId || exporters[0].ExporterId);
    }
    
    // Disconnect
    gateway.disconnect();
    console.log('\n✅ Connection test successful!');
    console.log(`✅ Blockchain data available: ${exporters.length} exporters found\n`);
    
    return true;
    
  } catch (error) {
    console.log('\n❌ Connection test failed:', error.message);
    console.log('   Stack:', error.stack);
    return false;
  }
}

testConnection().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
