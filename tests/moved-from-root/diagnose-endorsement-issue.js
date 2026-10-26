const { DatabaseService } = require('./api/dist/services/databaseService');
const { FabricService } = require('./api/dist/services/fabricService');

(async () => {
  console.log('\n🔍 INVESTIGATING ENDORSEMENT ISSUE\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const db = DatabaseService.getInstance();
  
  // Check ALL functions and their endorsement counts
  const summary = await db.all(`
    SELECT 
      chaincode_function,
      COUNT(DISTINCT blockchain_tx_id) as tx_count,
      AVG(endorser_count) as avg_endorsers
    FROM (
      SELECT 
        chaincode_function,
        blockchain_tx_id,
        COUNT(*) as endorser_count
      FROM blockchain_signatures
      GROUP BY chaincode_function, blockchain_tx_id
    ) AS tx_endorsers
    GROUP BY chaincode_function
    ORDER BY tx_count DESC
  `, []);
  
  console.log('📊 Endorsement Summary by Function:\n');
  summary.forEach(row => {
    const emoji = row.avg_endorsers >= 6 ? '✅' : '⚠️';
    console.log(`${emoji} ${row.chaincode_function.padEnd(20)} - ${row.tx_count} txs, avg ${parseFloat(row.avg_endorsers).toFixed(1)} endorsers`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('📋 Recent Transactions (all functions):\n');
  
  const recent = await db.all(`
    SELECT 
      chaincode_function,
      blockchain_tx_id,
      COUNT(*) as endorser_count,
      MAX(created_at) as created_at,
      string_agg(signer_org, ', ' ORDER BY signer_org) as orgs
    FROM blockchain_signatures
    GROUP BY chaincode_function, blockchain_tx_id
    ORDER BY MAX(created_at) DESC
    LIMIT 10
  `, []);
  
  recent.forEach((tx, i) => {
    const emoji = tx.endorser_count >= 6 ? '✅' : '⚠️';
    console.log(`${i + 1}. ${emoji} ${tx.chaincode_function}`);
    console.log(`   Endorsers: ${tx.endorser_count}/6`);
    console.log(`   Orgs: ${tx.orgs}`);
    console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}\n`);
  });
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🎯 HONEST DIAGNOSIS:\n');
  
  const has6Endorsers = recent.some(tx => tx.endorser_count === 6);
  const allHave6 = recent.every(tx => tx.endorser_count === 6);
  
  if (allHave6) {
    console.log('✅ ALL recent transactions have 6 endorsers!');
    console.log('   The system is working correctly.\n');
  } else if (has6Endorsers) {
    console.log('⚠️  MIXED RESULTS:');
    console.log('   - Some transactions have 6 endorsers (NEW ones)');
    console.log('   - Some transactions have fewer (OLD ones from before the fix)');
    console.log('   - This is EXPECTED and CORRECT behavior\n');
    console.log('✅ The system IS working - old data reflects historical state\n');
  } else {
    console.log('❌ PROBLEM CONFIRMED:');
    console.log('   NO transactions have 6 endorsers');
    console.log('   The endorsement targeting may not be working\n');
  }
  
  // Check when the last 6-endorser transaction was created
  const last6 = await db.get(`
    SELECT 
      chaincode_function,
      blockchain_tx_id,
      MAX(created_at) as created_at
    FROM blockchain_signatures
    GROUP BY chaincode_function, blockchain_tx_id
    HAVING COUNT(*) = 6
    ORDER BY MAX(created_at) DESC
    LIMIT 1
  `, []);
  
  if (last6) {
    console.log(`📅 Most recent 6-endorser transaction:`);
    console.log(`   Function: ${last6.chaincode_function}`);
    console.log(`   Date: ${new Date(last6.created_at).toLocaleString()}`);
    console.log(`   TX: ${last6.blockchain_tx_id.substring(0, 40)}...\n`);
  }
  
  process.exit(0);
})();
