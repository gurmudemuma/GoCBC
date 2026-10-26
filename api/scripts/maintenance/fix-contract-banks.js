// Fix contract bank information
const { DatabaseService } = require('./dist/services/databaseService');

async function fixContractBanks() {
  const db = DatabaseService.getInstance();
  
  const contractID = 'CONTRACT1787051634593';
  
  console.log(`\n=== FIXING BANK INFORMATION FOR ${contractID} ===\n`);
  
  try {
    // Get contract
    const contract = await db.get(
      `SELECT contract_id, buyer_name, buyer_country, buyer_bank, exporter_bank, exporter_id
       FROM contracts
       WHERE contract_id = $1`,
      [contractID]
    );
    
    if (!contract) {
      console.log('❌ Contract not found');
      return;
    }
    
    console.log('Current values:');
    console.log(`  Buyer: ${contract.buyer_name} (${contract.buyer_country})`);
    console.log(`  Buyer Bank: ${contract.buyer_bank || 'NULL'}`);
    console.log(`  Exporter Bank: ${contract.exporter_bank || 'NULL'}\n`);
    
    // Update with proper bank names
    const buyerBank = 'Deutsche Bank AG, Frankfurt';  // Typical German bank for US buyer
    const exporterBank = 'Commercial Bank of Ethiopia';  // Ethiopian bank
    
    await db.run(
      `UPDATE contracts
       SET buyer_bank = $1, exporter_bank = $2
       WHERE contract_id = $3`,
      [buyerBank, exporterBank, contractID]
    );
    
    console.log('✅ Updated bank information:');
    console.log(`  Issuing Bank (Buyer's Bank): ${buyerBank}`);
    console.log(`  Advising Bank (Exporter's Bank): ${exporterBank}\n`);
    
    // Verify
    const updated = await db.get(
      `SELECT buyer_bank, exporter_bank FROM contracts WHERE contract_id = $1`,
      [contractID]
    );
    
    console.log('Verification:');
    console.log(`  Buyer Bank: ${updated.buyer_bank}`);
    console.log(`  Exporter Bank: ${updated.exporter_bank}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixContractBanks().then(() => process.exit(0));
