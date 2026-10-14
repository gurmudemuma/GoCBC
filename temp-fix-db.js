const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs_db',
  user: 'cecbs_user',
  password: 'cecbs2024!secure',
});

async function fix() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Adding columns...');
    await client.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255)`);
    await client.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255)`);
    await client.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255)`);
    
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization)`);
    
    console.log('Verifying...');
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      AND column_name IN ('performed_by', 'performed_by_org', 'organization')
    `);
    
    console.log('Found columns:', result.rows.map(r => r.column_name).join(', '));
    
    client.release();
    console.log('\n✅ SUCCESS! Columns added.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fix();
