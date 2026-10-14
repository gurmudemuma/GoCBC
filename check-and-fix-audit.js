#!/usr/bin/env node
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs_db',
  user: 'cecbs_user',
  password: 'cecbs2024!secure',
});

async function checkAndFix() {
  try {
    console.log('🔍 Checking audit_trail table structure...\n');
    
    // Get all current columns
    const allColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      ORDER BY ordinal_position
    `);
    
    console.log(`Found ${allColumns.rows.length} total columns in audit_trail table\n`);
    
    // Check which required columns are missing
    const requiredColumns = ['performed_by', 'performed_by_org', 'organization'];
    const existingColumns = allColumns.rows.map(r => r.column_name);
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    const existingRequired = requiredColumns.filter(col => existingColumns.includes(col));
    
    if (existingRequired.length > 0) {
      console.log('✅ Already exists:');
      existingRequired.forEach(col => console.log(`   - ${col}`));
      console.log('');
    }
    
    if (missingColumns.length === 0) {
      console.log('✅ ALL REQUIRED COLUMNS EXIST!');
      console.log('🎉 No fix needed. Your audit trail should work.\n');
      await pool.end();
      return;
    }
    
    console.log('❌ Missing columns:');
    missingColumns.forEach(col => console.log(`   - ${col}`));
    console.log('\n🔧 Adding missing columns...\n');
    
    // Add only missing columns
    for (const col of missingColumns) {
      console.log(`Adding ${col}...`);
      await pool.query(`ALTER TABLE audit_trail ADD COLUMN ${col} VARCHAR(255)`);
      console.log(`✅ ${col} added`);
      
      // Create index
      const indexName = `idx_audit_trail_${col}`;
      await pool.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON audit_trail(${col})`);
      console.log(`✅ Index ${indexName} created\n`);
    }
    
    console.log('✅ FIX COMPLETE!');
    console.log('🔄 Refresh your browser - audit trail is now working!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAndFix();
