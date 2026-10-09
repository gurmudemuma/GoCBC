#!/usr/bin/env node
const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Testing PostgreSQL Connection...\n');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cecbs_db',
    user: 'cecbs_user',
    password: 'cecbs2024!secure',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Test audit_trail table
    console.log('📊 Checking audit_trail table...');
    const auditTest = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in audit_trail:');
    console.table(auditTest.rows);

    // Check if performed_by exists
    const hasPerformedBy = auditTest.rows.some(r => r.column_name === 'performed_by');
    console.log(`\nperformed_by column exists: ${hasPerformedBy ? '✅' : '❌'}`);

    // Count rows
    const count = await client.query('SELECT COUNT(*) as count FROM audit_trail');
    console.log(`\nTotal audit_trail rows: ${count.rows[0].count}`);

    // Test a simple analytics query
    console.log('\n📈 Testing analytics query...');
    const analyticsTest = await client.query(`
      SELECT COUNT(*) as total
      FROM audit_trail
      WHERE entity_type = 'CONTRACT'
    `);
    console.log(`Contract records: ${analyticsTest.rows[0].total}`);

    console.log('\n✅ All tests passed! Database is working.');

  } catch (error) {
    console.error('\n❌ Database Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();
