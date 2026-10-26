const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkDeclarations() {
  try {
    const result = await pool.query(`
      SELECT declaration_number, shipment_id, contract_id, status, created_at 
      FROM customs_declarations 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('=== Customs Declarations in Database ===');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log(`\nTotal declarations: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n=== Shipment IDs with Declarations ===');
      result.rows.forEach(row => {
        console.log(`- ${row.shipment_id} (Declaration: ${row.declaration_number}, Status: ${row.status})`);
      });
    }
  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await pool.end();
  }
}

checkDeclarations();
