const { DatabaseService } = require('./dist/services/databaseService');

async function checkClearanceAmounts() {
  try {
    const db = DatabaseService.getInstance();
    
    console.log('Checking customs clearance amounts...\n');
    
    const result = await db.query(
      `SELECT 
        shipment_id, 
        clearance_number, 
        cleared_date,
        cleared_by,
        duty_amount, 
        tax_amount,
        status,
        remarks
      FROM customs_clearances 
      ORDER BY cleared_date DESC 
      LIMIT 10`
    );
    
    const clearances = result.rows || result;
    
    console.log(`Found ${clearances.length} customs clearances:\n`);
    
    clearances.forEach((clearance, idx) => {
      console.log(`${idx + 1}. Shipment: ${clearance.shipment_id}`);
      console.log(`   Clearance #: ${clearance.clearance_number}`);
      console.log(`   Cleared By: ${clearance.cleared_by}`);
      console.log(`   Cleared Date: ${clearance.cleared_date}`);
      console.log(`   Duty Amount: ${clearance.duty_amount} ETB`);
      console.log(`   Tax Amount: ${clearance.tax_amount} ETB`);
      console.log(`   Status: ${clearance.status}`);
      if (clearance.remarks) {
        console.log(`   Remarks: ${clearance.remarks}`);
      }
      console.log('');
    });
    
    // Check if duty_amount and tax_amount columns exist and their types
    const tableResult = await db.query(`PRAGMA table_info(customs_clearances)`);
    const tableInfo = tableResult.rows || tableResult;
    console.log('\nTable schema for duty_amount and tax_amount:');
    tableInfo
      .filter(col => col.name === 'duty_amount' || col.name === 'tax_amount')
      .forEach(col => {
        console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0 ? 'yes' : 'no'})`);
      });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkClearanceAmounts();
