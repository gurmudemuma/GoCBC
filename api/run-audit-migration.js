const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function runMigration() {
  try {
    console.log('Running audit trail migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'src', 'migrations', '005_update_audit_trail_table.sql'),
      'utf8'
    );
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nAudit trail table updated with:');
    console.log('  - performed_by_org column');
    console.log('  - old_value column');
    console.log('  - new_value column');
    console.log('  - reason column');
    console.log('  - metadata JSONB column');
    console.log('  - ip_address column');
    console.log('  - Additional indexes for performance');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Current audit_trail table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
