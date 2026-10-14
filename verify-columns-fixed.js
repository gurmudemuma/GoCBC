const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs_db',
  user: 'cecbs_user',
  password: 'cecbs2024!secure',
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      AND column_name IN ('performed_by', 'performed_by_org', 'organization')
      ORDER BY column_name
    `);
    
    console.log(`\nFound ${result.rows.length}/3 columns:`);
    result.rows.forEach(r => console.log(`✅ ${r.column_name}`));
    
    if (result.rows.length === 3) {
      console.log('\n✅ ALL COLUMNS EXIST! The error should be fixed.');
      console.log('🔄 Refresh your browser now.');
    } else {
      console.log('\n❌ Missing columns. Running fix...');
      
      await pool.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255)`);
      await pool.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255)`);
      await pool.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255)`);
      
      console.log('✅ Columns added. Refresh your browser.');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
