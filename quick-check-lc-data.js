// Quick check of LC data in PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function check() {
  try {
    console.log('\n=== Checking LC Data in PostgreSQL ===\n');
    
    const result = await pool.query(`
      SELECT lc_id, status, amount, currency, exporter_id,
             (SELECT COUNT(*) FROM documents WHERE entity_id = lc_id AND entity_type = 'LC') as doc_count
      FROM letters_of_credit
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No LCs found in letters_of_credit table!');
      console.log('\nChecking if table exists...');
      
      const tables = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE '%lc%' OR table_name LIKE '%letter%'
      `);
      
      console.log('\nTables with "lc" or "letter":', tables.rows.map(r => r.table_name));
    } else {
      console.log(`✅ Found ${result.rows.length} LCs:\n`);
      
      const byStatus = {};
      result.rows.forEach(lc => {
        if (!byStatus[lc.status]) byStatus[lc.status] = [];
        byStatus[lc.status].push(lc);
      });
      
      Object.keys(byStatus).forEach(status => {
        console.log(`\n${status}: ${byStatus[status].length} LCs`);
        byStatus[status].forEach(lc => {
          console.log(`  - ${lc.lc_id}: $${lc.amount} ${lc.currency} (${lc.doc_count} docs)`);
        });
      });
      
      // Check for UTILIZED status
      const utilized = result.rows.filter(lc => lc.status === 'UTILIZED');
      if (utilized.length === 0) {
        console.log('\n⚠️  No LCs with UTILIZED status - Tab 3 will show "No data"');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
