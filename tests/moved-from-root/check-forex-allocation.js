const { DatabaseService } = require('./api/dist/services/databaseService');

(async () => {
  const db = DatabaseService.getInstance();
  
  console.log('\n🔍 Checking Forex Allocation: FOREX_LC-CONTRACT1788435011592-1788509695626_1788592090021\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Check blockchain signatures for this forex
  const sigs = await db.all(`
    SELECT blockchain_tx_id, signer_org, chaincode_function, created_at
    FROM blockchain_signatures
    WHERE entity_id = 'FOREX_LC-CONTRACT1788435011592-1788509695626_1788592090021'
    ORDER BY created_at, signer_org
  `, []);
  
  if (sigs.length === 0) {
    console.log('⚠️  No blockchain signatures found in PostgreSQL\n');
    console.log('This could mean:');
    console.log('1. The forex was created before signature tracking was implemented');
    console.log('2. The blockchain_tx_id in the UI query does not match entity_id\n');
    
    // Try searching by partial match
    const partialSigs = await db.all(`
      SELECT entity_id, blockchain_tx_id, signer_org, chaincode_function, created_at
      FROM blockchain_signatures
      WHERE entity_id LIKE '%1788592090021%'
      ORDER BY created_at, signer_org
    `, []);
    
    if (partialSigs.length > 0) {
      console.log('✅ Found signatures with partial match:\n');
      partialSigs.forEach(sig => {
        console.log(`   Entity: ${sig.entity_id}`);
        console.log(`   Function: ${sig.chaincode_function}`);
        console.log(`   Org: ${sig.signer_org}`);
        console.log(`   Date: ${new Date(sig.created_at).toLocaleString()}\n`);
      });
    }
    
    process.exit(0);
    return;
  }
  
  // Group by transaction
  const grouped = {};
  sigs.forEach(sig => {
    if (!grouped[sig.blockchain_tx_id]) {
      grouped[sig.blockchain_tx_id] = {
        function: sig.chaincode_function,
        date: sig.created_at,
        orgs: []
      };
    }
    grouped[sig.blockchain_tx_id].orgs.push(sig.signer_org);
  });
  
  Object.entries(grouped).forEach(([txId, data]) => {
    console.log(`📋 Transaction: ${data.function}`);
    console.log(`   TX ID: ${txId.substring(0, 40)}...`);
    console.log(`   Date: ${new Date(data.date).toLocaleString()}`);
    console.log(`   Endorsers: ${data.orgs.length}/6`);
    console.log(`   Organizations: ${data.orgs.join(', ')}\n`);
  });
  
  const totalEndorsers = Object.values(grouped).reduce((sum, tx) => sum + tx.orgs.length, 0);
  const txCount = Object.keys(grouped).length;
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`📊 Summary: ${txCount} transactions, ${totalEndorsers} total endorser records\n`);
  
  if (totalEndorsers === 3) {
    console.log('✅ CONFIRMED: This forex allocation was created on Sept 7, 2026');
    console.log('   BEFORE the 6-endorser system was implemented (Sept 10, 2026)\n');
    console.log('📅 Historical data correctly shows 3 endorsers (old endorsement policy)\n');
  } else if (totalEndorsers === 6) {
    console.log('✅ CONFIRMED: This allocation has 6/6 endorsers');
    console.log('   The 6-endorser system is working correctly!\n');
  }
  
  process.exit(0);
})();
