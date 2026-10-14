#!/usr/bin/env node
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs_db',
  user: 'cecbs_user',
  password: 'cecbs2024!secure',
});

async function fixColumns() {
  console.log('🔧 Adding missing columns to audit_trail table...\n');
  
  try {
    // Add performed_by column
    console.log('Adding performed_by column...');
    await pool.query(`
      ALTER TABLE audit_trail 
      ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
    `);
    
    // Add performed_by_org column
    console.log('Adding performed_by_org column...');
    await pool.query(`
      ALTER TABLE audit_trail 
      ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
    `);
    
    // Add organization column
    console.log('Adding organization column...');
    await pool.query(`
      ALTER TABLE audit_trail 
      ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by 
      ON audit_trail(performed_by);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org 
      ON audit_trail(performed_by_org);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_trail_organization 
      ON audit_trail(organization);
    `);
    
    // Verify
    console.log('\n✅ Columns added successfully!\n');
    console.log('Verifying...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      AND column_name IN ('performed_by', 'performed_by_org', 'organization')
      ORDER BY column_name;
    `);
    
    console.table(result.rows);
    
    console.log('\n✅ All done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixColumns();
