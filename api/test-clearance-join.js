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
    console.log('Testing JOIN query for shipment SHIP1787204371672...\n');
    
    const result = await pool.query(`
      SELECT 
        cc.*,
        cd.declaration_number,
        cd.customs_value_usd,
        cd.quantity,
        cd.currency,
        cd.hs_code,
        cd.destination,
        cd.port_of_exit,
        cd.declaration_type,
        cd.eudr_compliant
      FROM customs_clearances cc
      LEFT JOIN customs_declarations cd ON cc.shipment_id = cd.shipment_id
      WHERE cc.shipment_id = 'SHIP1787204371672'
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No clearance found for this shipment');
      await pool.end();
      return;
    }
    
    const row = result.rows[0];
    
    console.log('✅ Joined Data Retrieved:');
    console.log('─────────────────────────────────────────');
    console.log('Clearance Info:');
    console.log('  Clearance Number:', row.clearance_number);
    console.log('  Cleared Date:', row.cleared_date);
    console.log('  Cleared By:', row.cleared_by);
    console.log('  Status:', row.status);
    console.log('\nDeclaration Info (from JOIN):');
    console.log('  Declaration Number:', row.declaration_number);
    console.log('  Customs Value USD: $' + (row.customs_value_usd || 0));
    console.log('  Quantity:', (row.quantity || 0) + ' kg');
    console.log('  Currency:', row.currency);
    console.log('  Destination:', row.destination);
    console.log('\nFees:');
    console.log('  Duty Amount:', (row.duty_amount || 0) + ' ETB');
    console.log('  Tax Amount:', (row.tax_amount || 0) + ' ETB');
    console.log('  Total:', ((parseFloat(row.duty_amount || 0) + parseFloat(row.tax_amount || 0))) + ' ETB');
    console.log('─────────────────────────────────────────');
    console.log('\n📊 Full Row (JSON):');
    console.log(JSON.stringify(row, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
})();
