const { DatabaseService } = require('./api/dist/services/databaseService');

(async () => {
  const db = DatabaseService.getInstance();
  
  console.log('\n🔍 Checking NEW Forex: FOREX-TEST-1789043521688\n');
  
  const sigs = await db.all(`
    SELECT blockchain_tx_id, signer_org, chaincode_function, created_at
    FROM blockchain_signatures
    WHERE entity_id = 'FOREX-TEST-1789043521688'
    ORDER BY created_at, signer_org
  `, []);
  
  if (sigs.length === 0) {
    console.log('⚠️  No signatures found for this forex\n');
    console.log('This means RequestForex transaction was not stored.');
    console.log('This is the transaction from our earlier test that failed.\n');
    process.exit(0);
    return;
  }
  
  console.log(`✅ Found ${sigs.length} signature records\n`);
  
  const grouped = {};
  sigs.forEach(sig => {
    if (!grouped[sig.blockchain_tx_id]) {
      grouped[sig.blockchain_tx_id] = { function: sig.chaincode_function, orgs: [] };
    }
    grouped[sig.blockchain_tx_id].orgs.push(sig.signer_org);
  });
  
  Object.entries(grouped).forEach(([txId, data]) => {
    console.log(`${data.function}: ${data.orgs.length}/6 endorsers`);
    console.log(`Orgs: ${data.orgs.join(', ')}\n`);
  });
  
  process.exit(0);
})();
