// Fix Exporter Applications Schema - Add Missing Columns
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function fixSchema() {
  try {
    console.log('\n=== Fixing Exporter Applications Schema ===\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'exporter_applications'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table exporter_applications does not exist!');
      console.log('   Please run the table creation script first.');
      return;
    }
    
    console.log('✅ Table exporter_applications exists');
    
    // Check existing columns
    const columnsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'exporter_applications'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n📋 Current columns (${columnsCheck.rows.length}):`);
    columnsCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    const existingColumns = columnsCheck.rows.map(r => r.column_name);
    
    // Columns that should exist
    const requiredColumns = [
      { name: 'bank_branch', type: 'VARCHAR(255)', default: null },
      { name: 'bank_branch_code', type: 'VARCHAR(50)', default: null },
      { name: 'documents', type: 'JSONB', default: "'[]'::jsonb" },
      { name: 'ecta_license_number', type: 'VARCHAR(100)', default: null },
      { name: 'license_expiry_date', type: 'DATE', default: null },
      { name: 'laboratory_certificate_number', type: 'VARCHAR(100)', default: null },
      { name: 'exporter_type', type: 'VARCHAR(50)', default: "'STANDARD'" },
    ];
    
    console.log('\n🔍 Checking required columns...\n');
    
    let addedCount = 0;
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adding column: ${col.name} (${col.type})`);
        
        const alterSQL = `
          ALTER TABLE exporter_applications 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''};
        `;
        
        await pool.query(alterSQL);
        addedCount++;
        console.log(`   ✅ Added ${col.name}`);
      } else {
        console.log(`✓ Column ${col.name} already exists`);
      }
    }
    
    if (addedCount > 0) {
      console.log(`\n✅ Added ${addedCount} missing column(s)`);
    } else {
      console.log('\n✅ All required columns already exist');
    }
    
    // Verify final schema
    const finalCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'exporter_applications'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n📋 Final schema (${finalCheck.rows.length} columns):`);
    finalCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Schema fix complete!\n');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixSchema();
