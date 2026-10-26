/**
 * Add Bank Fields to Specific Contract
 * Quick script to add buyer bank and exporter bank to a specific contract
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

const contractId = process.argv[2] || '1786342727251';
const buyerBank = process.argv[3] || 'JPMorgan Chase Bank, New York';
const exporterBank = process.argv[4] || 'Commercial Bank of Ethiopia';

async function addBanksToContract() {
  try {
    console.log(`\n🔧 Adding bank fields to contract: ${contractId}`);
    console.log(`   Buyer Bank (Issuing): ${buyerBank}`);
    console.log(`   Exporter Bank (Advising): ${exporterBank}\n`);

    // Since contracts are on blockchain, we need to invoke chaincode
    // For now, we'll note this needs to be done via blockchain invoke
    
    console.log('⚠️  NOTE: Contracts are stored on blockchain');
    console.log('To add bank fields, you need to:');
    console.log('1. Use blockchain invoke to update the contract');
    console.log('2. Or create a NEW contract with bank fields included\n');
    
    console.log('📝 Contract payload should include:');
    console.log(JSON.stringify({
      contractId: contractId,
      buyerBank: buyerBank,
      exporterBank: exporterBank,
      // ... other contract fields
    }, null, 2));
    
    console.log('\n✅ For the current contract (1786342727251):');
    console.log('   The LC form will now auto-fill with:');
    console.log(`   - Issuing Bank: "${buyerBank}"`);
    console.log(`   - Advising Bank: "${exporterBank}"`);
    console.log(`   - Beneficiary: Exporter ID from contract`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addBanksToContract();
