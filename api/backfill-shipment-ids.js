const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function backfillShipmentIds() {
  try {
    console.log('=== Backfilling shipment_id from declaration_number ===\n');
    
    // Get all declarations with NULL shipment_id
    const declarations = await pool.query(`
      SELECT id, declaration_number, shipment_id 
      FROM customs_declarations 
      WHERE shipment_id IS NULL
    `);
    
    if (declarations.rows.length === 0) {
      console.log('No declarations need backfilling');
      return;
    }
    
    console.log(`Found ${declarations.rows.length} declarations to backfill:\n`);
    
    for (const decl of declarations.rows) {
      // Extract shipment ID from declaration_number (format: CD-{shipmentId})
      const match = decl.declaration_number.match(/^CD-(.+)$/);
      
      if (match) {
        const shipmentId = match[1];
        console.log(`Updating ${decl.declaration_number} → shipment_id = ${shipmentId}`);
        
        await pool.query(`
          UPDATE customs_declarations 
          SET shipment_id = $1 
          WHERE id = $2
        `, [shipmentId, decl.id]);
        
        console.log('  ✓ Updated');
      } else {
        console.log(`  ✗ Could not extract shipment ID from ${decl.declaration_number}`);
      }
    }
    
    console.log('\n=== Backfill Complete ===');
    
    // Verify the results
    const updated = await pool.query(`
      SELECT declaration_number, shipment_id 
      FROM customs_declarations 
      ORDER BY created_at DESC
    `);
    
    console.log('\nAll declarations after backfill:');
    updated.rows.forEach(row => {
      console.log(`  - ${row.shipment_id || 'NULL'} → ${row.declaration_number}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

backfillShipmentIds();
