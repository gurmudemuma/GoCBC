const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkAllExporters() {
  try {
    // Get all exporters
    const exporters = await pool.query("SELECT * FROM users WHERE role = 'EXPORTER' ORDER BY username");
    console.log(`\n=== ${exporters.rows.length} Exporters Found ===\n`);
    
    for (const exp of exporters.rows) {
      const exporterId = exp.username;
      
      // Check contracts (using contract_number as identifier)
      const contracts = await pool.query('SELECT * FROM export_contracts WHERE exporter_id = $1', [exporterId]);
      
      // Check shipments (by contract_id referencing export_contracts.id)
      const shipments = await pool.query(`
        SELECT s.* FROM shipments s 
        JOIN export_contracts ec ON s.contract_id = ec.id 
        WHERE ec.exporter_id = $1
      `, [exporterId]);
      
      // Count delivered
      const delivered = shipments.rows.filter(s => s.status === 'DELIVERED').length;
      
      console.log(`${exp.username} (${exp.email})`);
      console.log(`  Contracts: ${contracts.rows.length}`);
      console.log(`  Shipments: ${shipments.rows.length} (${delivered} delivered)`);
      
      if (delivered > 0) {
        console.log(`  ✅ HAS DELIVERED SHIPMENTS - Good for testing!`);
      }
      console.log();
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAllExporters();
