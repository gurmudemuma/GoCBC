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
    const result = await pool.query('SELECT contract_id, exporter_id, buyer_id, coffee_type, status, created_at FROM contracts ORDER BY created_at DESC LIMIT 10');
    console.log('\n=== Contracts in Database ===');
    console.log('Total:', result.rows.length);
    result.rows.forEach((row, i) => {
      console.log(`\n${i+1}. ${row.contract_id}`);
      console.log(`   Exporter: ${row.exporter_id}`);
      console.log(`   Buyer: ${row.buyer_id}`);
      console.log(`   Coffee: ${row.coffee_type}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Created: ${row.created_at}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
