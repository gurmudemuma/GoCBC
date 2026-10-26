// Check Audit Trail Data Sources
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

(async () => {
  try {
    console.log('\n📊 AUDIT TRAIL DATA SOURCE ANALYSIS\n');
    console.log('='.repeat(50));
    
    // Total logs
    const total = await pool.query('SELECT COUNT(*) as count FROM audit_trail');
    console.log('\n✅ Total Audit Logs:', total.rows[0].count);
    
    // PostgreSQL logs
    const pg = await pool.query(`
      SELECT COUNT(*) as count 
      FROM audit_trail 
      WHERE metadata::text LIKE '%POSTGRESQL%'
    `);
    console.log('   PostgreSQL Source:', pg.rows[0].count);
    
    // Blockchain logs
    const bc = await pool.query(`
      SELECT COUNT(*) as count 
      FROM audit_trail 
      WHERE metadata::text LIKE '%HYPERLEDGER_FABRIC%'
    `);
    console.log('   Blockchain Source:', bc.rows[0].count);
    
    // By entity type
    console.log('\n📋 Logs by Entity Type:');
    const byType = await pool.query(`
      SELECT entity_type, COUNT(*) as count 
      FROM audit_trail 
      GROUP BY entity_type 
      ORDER BY count DESC
    `);
    byType.rows.forEach(row => {
      console.log(`   - ${row.entity_type.padEnd(25)}: ${row.count}`);
    });
    
    // Recent logs with source
    console.log('\n🕐 Recent 5 Logs with Source:');
    const recent = await pool.query(`
      SELECT 
        id,
        entity_type,
        action,
        performed_by_org,
        metadata::text as metadata,
        created_at
      FROM audit_trail 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    recent.rows.forEach((row, i) => {
      const hasPostgres = row.metadata.includes('POSTGRESQL');
      const hasBlockchain = row.metadata.includes('HYPERLEDGER_FABRIC');
      const source = hasBlockchain ? '⛓️  BLOCKCHAIN' : hasPostgres ? '🗄️  POSTGRESQL' : '❓ UNKNOWN';
      
      console.log(`   ${i + 1}. [${source}] ${row.action} - ${row.entity_type} (${row.performed_by_org})`);
    });
    
    console.log('\n' + '='.repeat(50));
    
    if (bc.rows[0].count === '0') {
      console.log('\n⚠️  WARNING: No blockchain data found!');
      console.log('   To add blockchain data:');
      console.log('   1. Start blockchain network: .\\start-all.sh or docker-compose up');
      console.log('   2. Run: node backfill-audit-trail-with-blockchain.js\n');
    } else {
      console.log('\n✅ Blockchain data is present!\n');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
