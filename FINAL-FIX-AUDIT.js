#!/usr/bin/env node
const { Pool } = require('pg');

// Connect via localhost (port mapped from Docker)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs_db',
  user: 'cecbs_user',
  password: 'cecbs2024!secure',
});

async function fix() {
  console.log('🔧 FIXING AUDIT TRAIL COLUMNS...\n');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database\n');
    
    // Add columns one by one
    console.log('Adding performed_by...');
    await pool.query('ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255)');
    console.log('✅ Done');
    
    console.log('Adding performed_by_org...');
    await pool.query('ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255)');
    console.log('✅ Done');
    
    console.log('Adding organization...');
    await pool.query('ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255)');
    console.log('✅ Done\n');
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization)');
    console.log('✅ Done\n');
    
    // Verify
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      AND column_name IN ('performed_by', 'performed_by_org', 'organization')
      ORDER BY column_name
    `);
    
    console.log(`Found ${result.rows.length}/3 required columns:`);
    result.rows.forEach(r => console.log(`  ✅ ${r.column_name}`));
    
    if (result.rows.length === 3) {
      console.log('\n🎉 SUCCESS! All columns added.');
      console.log('🔄 Refresh your browser - the error is fixed!\n');
    } else {
      console.log('\n⚠️  Warning: Not all columns were added');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fix();
