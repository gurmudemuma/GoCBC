// Check LC and contract bank information
const { DatabaseService } = require('./dist/services/databaseService');

async function checkLCBanks() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== CHECKING LC AND CONTRACT BANK INFORMATION ===\n');
  
  try {
    // Get recent LCs
    const lcs = await db.all(
      `SELECT lc_number, contract_id, issuing_bank, advising_bank, bank_name, status
       FROM letter_of_credits
       ORDER BY created_at DESC
       LIMIT 5`
    );
    
    console.log(`Found ${lcs.length} recent LCs:\n`);
    
    for (const lc of lcs) {
      console.log(`LC: ${lc.lc_number}`);
      console.log(`  Contract: ${lc.contract_id}`);
      console.log(`  Issuing Bank: ${lc.issuing_bank || 'NULL'}`);
      console.log(`  Advising Bank: ${lc.advising_bank || 'NULL'}`);
      console.log(`  Bank Name: ${lc.bank_name || 'NULL'}`);
      console.log(`  Status: ${lc.status}\n`);
      
      // Get associated contract
      if (lc.contract_id) {
        const contract = await db.get(
          `SELECT contract_id, buyer_bank, exporter_bank, buyer_name, buyer_country
           FROM contracts
           WHERE contract_id = $1`,
          [lc.contract_id]
        );
        
        if (contract) {
          console.log(`  Associated Contract:`);
          console.log(`    Buyer Bank: ${contract.buyer_bank || 'NULL'}`);
          console.log(`    Exporter Bank: ${contract.exporter_bank || 'NULL'}`);
          console.log(`    Buyer: ${contract.buyer_name} (${contract.buyer_country})\n`);
        }
      }
    }
    
    // Check contracts
    console.log('\n=== RECENT CONTRACTS ===\n');
    const contracts = await db.all(
      `SELECT contract_id, buyer_name, buyer_country, buyer_bank, exporter_bank, exporter_id
       FROM contracts
       ORDER BY created_at DESC
       LIMIT 5`
    );
    
    contracts.forEach(c => {
      console.log(`Contract: ${c.contract_id}`);
      console.log(`  Exporter: ${c.exporter_id}`);
      console.log(`  Buyer: ${c.buyer_name} (${c.buyer_country})`);
      console.log(`  Buyer Bank (Issuing): ${c.buyer_bank || 'NULL'}`);
      console.log(`  Exporter Bank (Advising): ${c.exporter_bank || 'NULL'}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLCBanks().then(() => process.exit(0));
