/**
 * Fix Forex Schema - Update existing forex records to have empty arrays instead of null
 * 
 * This script directly queries the blockchain state and fixes the screenedAgainst field
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function fixForexSchema() {
  console.log('🚀 Starting forex schema fix...');

  try {
    // Load connection profile
    const ccpPath = path.resolve(__dirname, '..', 'network', 'organizations', 'peerOrganizations', 'ecta.cecbs.com', 'connection-ecta.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Load wallet
    const walletPath = path.join(__dirname, '..', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if user identity exists
    const identity = await wallet.get('admin');
    if (!identity) {
      console.error('❌ Admin identity not found in wallet. Please enroll admin first.');
      return;
    }

    // Connect to gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: false }
    });

    console.log('✅ Connected to gateway');

    // Get network and contract
    const network = await gateway.getNetwork('cecbs-channel');
    const contract = network.getContract('coffee');

    console.log('📋 Fetching forex records using raw query...');

    // Use GetStateByRange to bypass schema validation
    const iterator = await contract.evaluateTransaction('GetQueryResult', JSON.stringify({
      selector: {
        forexId: { "$exists": true }
      }
    }));

    const forexRecords = JSON.parse(iterator.toString());
    console.log(`📊 Found ${forexRecords.length} forex records`);

    let fixed = 0;
    let failed = 0;

    for (const record of forexRecords) {
      try {
        const forex = record.Record || record;
        const forexId = forex.forexId || forex.ForexID;

        console.log(`\n🔍 Processing: ${forexId}`);

        // Check if screenedAgainst is null or missing
        if (!forex.screenedAgainst || !Array.isArray(forex.screenedAgainst)) {
          console.log(`  Fixing screenedAgainst field...`);

          // Update the record with proper empty array
          forex.screenedAgainst = [];
          
          // Re-submit to blockchain
          const forexJSON = JSON.stringify(forex);
          await contract.submitTransaction('UpdateForexMetadata', forexId, forexJSON);

          console.log(`  ✅ Fixed: ${forexId}`);
          fixed++;
        } else {
          console.log(`  ⏭️  Already valid: ${forexId}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to fix ${record.Key}:`, error.message);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`   Total Records: ${forexRecords.length}`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(60));

    await gateway.disconnect();
    console.log('\n✅ Script completed.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixForexSchema();
