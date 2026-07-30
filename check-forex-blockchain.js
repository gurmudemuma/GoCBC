/**
 * Check Forex Records Directly from Blockchain
 * This queries the blockchain through the Fabric SDK
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function checkForexOnBlockchain() {
  console.log('🔗 Checking Forex Records on Blockchain\n');
  console.log('='.repeat(60));
  
  try {
    // Connection profile path
    const ccpPath = path.resolve(__dirname, 'connection-profile.json');
    
    if (!fs.existsSync(ccpPath)) {
      console.log('⚠️  Connection profile not found at:', ccpPath);
      console.log('   Creating basic connection profile...\n');
      // We can't connect without proper setup
      throw new Error('Connection profile required');
    }
    
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    // Create wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check for admin identity
    const identity = await wallet.get('cbe-admin');
    if (!identity) {
      console.log('❌ CBE admin identity not found in wallet');
      console.log('   Run: node enrollAdmin.js first\n');
      return;
    }
    
    // Connect to gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'cbe-admin',
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');
    
    // Query forex records
    console.log('\n📊 Querying Forex Allocations...\n');
    
    const result = await contract.evaluateTransaction('QueryNewForex');
    const forex = JSON.parse(result.toString());
    
    console.log(`✅ Found ${forex.length} forex allocation(s) with _v2 suffix\n`);
    
    if (forex.length > 0) {
      console.log('Forex Records:');
      console.log('-'.repeat(60));
      forex.forEach((f, index) => {
        console.log(`\n${index + 1}. Forex ID: ${f.forexId}`);
        console.log(`   LC ID: ${f.lcId || 'Not linked yet'}`);
        console.log(`   Contract: ${f.contractId}`);
        console.log(`   Exporter: ${f.exporterId}`);
        console.log(`   Amount: ${f.currency} ${f.requestedAmount || f.allocatedAmount}`);
        console.log(`   Status: ${f.status}`);
        console.log(`   Has _v2: ${f.forexId.includes('_v2') ? '✅ YES' : '❌ NO'}`);
      });
    } else {
      console.log('⚠️  No forex allocations found with _v2 suffix');
      console.log('\n💡 Recommendations:');
      console.log('   1. Restart API server to load new code');
      console.log('   2. Issue a NEW LC through the UI');
      console.log('   3. Check API logs for forex creation errors');
    }
    
    await gateway.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Blockchain Check Complete\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 This test requires:');
    console.log('   1. Fabric network running');
    console.log('   2. Connection profile configured');
    console.log('   3. Admin enrolled in wallet');
    console.log('\n   For simpler testing, use the API-based test instead:');
    console.log('   node test-forex-allocation.js YOUR_AUTH_TOKEN\n');
  }
}

checkForexOnBlockchain();
