const { DatabaseService } = require('./api/dist/services/databaseService');

(async () => {
  const db = DatabaseService.getInstance();
  
  console.log('\n🔍 Raw Data Analysis\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Get raw records
  const records = await db.all(`
    SELECT blockchain_tx_id, signer_org, chaincode_function, created_at
    FROM blockchain_signatures
    ORDER BY created_at DESC, blockchain_tx_id, signer_org
    LIMIT 30
  `, []);
  
  // Group by tx_id
  const grouped = {};
  records.forEach(r => {
    if (!grouped[r.blockchain_tx_id]) {
      grouped[r.blockchain_tx_id] = {
        txId: r.blockchain_tx_id,
        function: r.chaincode_function,
        date: r.created_at,
        endorsers: []
      };
    }
    grouped[r.blockchain_tx_id].endorsers.push(r.signer_org);
  });
  
  const txs = Object.values(grouped);
  
  console.log(`Found ${txs.length} unique transactions:\n`);
  txs.forEach((tx, i) => {
    const emoji = tx.endorsers.length === 6 ? '✅' : '⚠️';
    console.log(`${i + 1}. ${emoji} ${tx.function} - ${tx.endorsers.length}/6 endorsers`);
    console.log(`   TX: ${tx.txId.substring(0, 30)}...`);
    console.log(`   Orgs: ${tx.endorsers.join(', ')}`);
    console.log(`   Date: ${new Date(tx.date).toLocaleString()}\n`);
  });
  
  const six = txs.filter(tx => tx.endorsers.length === 6).length;
  const total = txs.length;
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`📊 Summary: ${six}/${total} transactions have 6 endorsers\n`);
  
  if (six > 0) {
    console.log('✅ CONFIRMED: System IS capturing 6-endorser transactions!\n');
  }
  
  process.exit(0);
})();
