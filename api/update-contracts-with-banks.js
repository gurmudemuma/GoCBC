/**
 * Update Existing Contracts with Bank Information
 * 
 * This script adds buyerBank and exporterBank fields to existing contracts
 * that don't have these fields yet.
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function updateContractsWithBanks() {
  try {
    console.log('🔄 Starting contract bank fields update...\n');

    // Load connection profile
    const ccpPath = path.resolve(__dirname, '..', 'connection.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create wallet
    const walletPath = path.join(__dirname, '..', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if admin exists
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.error('❌ Admin identity not found in wallet');
      console.log('Run: node enrollAdmin.js first');
      return;
    }

    // Connect to gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('coffeechannel');
    const contract = network.getContract('coffee');

    // Get all contracts
    console.log('📋 Fetching all contracts...');
    const result = await contract.evaluateTransaction('QueryAllContracts');
    const contracts = JSON.parse(result.toString());

    console.log(`Found ${contracts.length} contracts\n`);

    let updated = 0;
    let skipped = 0;

    for (const c of contracts) {
      // Skip if already has bank fields
      if (c.buyerBank && c.exporterBank) {
        console.log(`⏭️  ${c.contractId || c.ContractID} - Already has bank fields`);
        skipped++;
        continue;
      }

      const contractId = c.contractId || c.ContractID;
      const buyerCountry = c.buyerCountry || c.BuyerCountry || 'Unknown';
      const buyerName = c.buyerName || c.BuyerName || 'Unknown Buyer';

      // Set default banks
      const buyerBank = `International Bank - ${buyerCountry}`;
      const exporterBank = 'Commercial Bank of Ethiopia';

      console.log(`🔧 Updating ${contractId}...`);
      console.log(`   Buyer Bank: ${buyerBank}`);
      console.log(`   Exporter Bank: ${exporterBank}`);

      // Update contract with bank fields
      const updatePayload = {
        ...c,
        buyerBank,
        exporterBank,
        updatedAt: new Date().toISOString()
      };

      try {
        await contract.submitTransaction(
          'UpdateContract',
          contractId,
          JSON.stringify(updatePayload)
        );
        console.log(`✅ Updated ${contractId}\n`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update ${contractId}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${contracts.length}`);

    await gateway.disconnect();
    console.log('\n✅ Update complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateContractsWithBanks();
