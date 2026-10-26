// Apply Professional Audit Trail Migration
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

async function applyMigration() {
  console.log('\n🔧 Applying Professional Audit Trail Migration...\n');
  
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrate-audit-trail-professional.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    await pool.query(sql);
    
    console.log('✅ Migration applied successfully\n');
    
    // Verify indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'audit_trail'
      ORDER BY indexname
    `);
    
    console.log('📊 Audit Trail Indexes:\n');
    indexes.rows.forEach(idx => {
      console.log(`✅ ${idx.indexname}`);
    });
    
    console.log(`\n✅ Total: ${indexes.rows.length} indexes\n`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration().then(() => {
  console.log('🎉 Professional audit trail migration complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
