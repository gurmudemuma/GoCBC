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
    const result = await pool.query('SELECT * FROM contracts WHERE contract_id = \'CONTRACT_READY_FOR_APPROVAL\'');
    console.log('\n=== Detailed Contract Data ===');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
