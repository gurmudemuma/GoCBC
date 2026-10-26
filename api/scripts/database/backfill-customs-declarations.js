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
    console.log('\n🔍 Checking customs_declarations for missing data...\n');

    // Get all declarations with missing clearance_date or quantity
    const declarations = await pool.query(`
      SELECT 
        cd.id,
        cd.declaration_number,
        cd.shipment_id,
        cd.clearance_date,
        cd.quantity,
        cd.created_at,
        cd.contract_id,
        cc.cleared_date
      FROM customs_declarations cd
      LEFT JOIN customs_clearances cc ON cd.shipment_id = cc.shipment_id
      WHERE cd.clearance_date IS NULL OR cd.quantity IS NULL
    `);

    console.log(`Found ${declarations.rows.length} declarations with missing data:\n`);
    console.table(declarations.rows.map(d => ({
      id: d.id,
      declaration_number: d.declaration_number,
      clearance_date: d.clearance_date ? 'OK' : 'NULL',
      quantity: d.quantity ? 'OK' : 'NULL',
      contract_id: d.contract_id
    })));

    if (declarations.rows.length === 0) {
      console.log('✅ All declarations already have complete data!');
      await pool.end();
      return;
    }

    // Get contract quantities for declarations that need them
    const contractQuantities = new Map();
    const contractIds = [...new Set(declarations.rows.map(d => d.contract_id).filter(id => id))];
    
    if (contractIds.length > 0) {
      const contracts = await pool.query(`
        SELECT id, quantity FROM contracts WHERE id = ANY($1)
      `, [contractIds]);
      
      contracts.rows.forEach(c => {
        contractQuantities.set(c.id, c.quantity);
      });
    }

    console.log('\n📝 Backfilling missing data...\n');

    for (const decl of declarations.rows) {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Set clearance_date from cleared_date or created_at - 1 day
      if (!decl.clearance_date) {
        const clearanceDate = decl.cleared_date || new Date(new Date(decl.created_at).getTime() - 24 * 60 * 60 * 1000);
        updates.push(`clearance_date = $${paramIndex++}`);
        values.push(clearanceDate);
      }

      // Set quantity from contract
      if (!decl.quantity && decl.contract_id) {
        const contractQty = contractQuantities.get(decl.contract_id);
        if (contractQty) {
          updates.push(`quantity = $${paramIndex++}`);
          values.push(contractQty);
        }
      }

      if (updates.length > 0) {
        values.push(decl.id);
        const updateQuery = `
          UPDATE customs_declarations 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `;
        
        await pool.query(updateQuery, values);
        console.log(`✅ Updated declaration ${decl.declaration_number}`);
      }
    }

    console.log('\n📊 Verifying updates...\n');
    
    const verification = await pool.query(`
      SELECT 
        id,
        declaration_number,
        clearance_date,
        quantity,
        created_at
      FROM customs_declarations
      WHERE id IN (${declarations.rows.map(d => d.id).join(',')})
    `);

    console.table(verification.rows);

    console.log('\n✅ Backfill complete!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
})();
