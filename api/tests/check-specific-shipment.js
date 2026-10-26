const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkShipment() {
  try {
    // Check if SHIP1787204371672 has a declaration
    const result = await pool.query(`
      SELECT declaration_number, shipment_id, clearance_status, created_at 
      FROM customs_declarations 
      WHERE shipment_id = $1
    `, ['SHIP1787204371672']);
    
    console.log('=== Checking Shipment: SHIP1787204371672 ===');
    if (result.rows.length > 0) {
      console.log('✓ Declaration found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('✗ No declaration found for this shipment');
    }
    
    // Show all declarations
    console.log('\n=== All Declarations in Database ===');
    const allDeclarations = await pool.query(`
      SELECT declaration_number, shipment_id, clearance_status, created_at 
      FROM customs_declarations 
      ORDER BY created_at DESC
    `);
    
    if (allDeclarations.rows.length === 0) {
      console.log('No declarations in database');
    } else {
      allDeclarations.rows.forEach(row => {
        console.log(`- ${row.shipment_id || 'NULL'} → ${row.declaration_number} (${row.clearance_status})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkShipment();
