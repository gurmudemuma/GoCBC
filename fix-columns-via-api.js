#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');

// Try to load from .env first
const envPath = '/home/guda/GoCBC/.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
    }
  });
  
  Object.keys(envVars).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = envVars[key];
    }
  });
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'cecbs_db',
  user: process.env.POSTGRES_USER || 'cecbs_user',
  password: process.env.POSTGRES_PASSWORD || 'cecbs2024!secure',
});

async function fixColumns() {
  console.log('🔧 Fixing audit_trail columns...\n');
  console.log('Connection config:');
  console.log(`  Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.POSTGRES_PORT || '5432'}`);
  console.log(`  Database: ${process.env.POSTGRES_DB || 'cecbs_db'}`);
  console.log(`  User: ${process.env.POSTGRES_USER || 'cecbs_user'}`);
  console.log('');
  
  try {
    // Test connection
    console.log('Testing connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected!\n');
    
    // Add performed_by column
    console.log('1. Adding performed_by column...');
    await pool.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);`);
    console.log('   ✅ Done');
    
    // Add performed_by_org column
    console.log('2. Adding performed_by_org column...');
    await pool.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);`);
    console.log('   ✅ Done');
    
    // Add organization column
    console.log('3. Adding organization column...');
    await pool.query(`ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255);`);
    console.log('   ✅ Done');
    
    // Create indexes
    console.log('4. Creating indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization);`);
    console.log('   ✅ Done\n');
    
    // Verify
    console.log('5. Verifying columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      AND column_name IN ('performed_by', 'performed_by_org', 'organization')
      ORDER BY column_name;
    `);
    
    console.table(result.rows);
    
    if (result.rows.length === 3) {
      console.log('\n✅ SUCCESS! All columns added successfully!');
      console.log('\n📝 You can now refresh your browser - the audit trail error is fixed!');
    } else {
      console.log('\n⚠️  Warning: Expected 3 columns, found', result.rows.length);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixColumns();
