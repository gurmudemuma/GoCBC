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
    const migrationPath = path.join(__dirname, 'src', 'migrations', '002_add_shipment_id_to_customs_declarations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 002_add_shipment_id_to_customs_declarations.sql');
    console.log('SQL:', sql);
    
    await pool.query(sql);
    
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
