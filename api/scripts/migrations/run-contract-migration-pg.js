#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATION_FILE = path.join(__dirname, 'src/migrations/023_add_missing_contract_fields.sql');
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

console.log('🔧 Running contract schema migration...');
console.log('📂 Database:', CONNECTION_STRING.replace(/:[^:]*@/, ':****@'));
console.log('📄 Migration:', MIGRATION_FILE);

async function runMigration() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    
    // Execute migration
    console.log('📊 Running migration...\n');
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify the schema
    console.log('📊 Verifying schema...\n');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'contracts'
      AND column_name IN (
        'buyer_name', 
        'organic_certified', 
        'fair_trade_certified', 
        'port_of_loading', 
        'port_of_destination', 
        'delivery_date', 
        'incoterm', 
        'special_instructions'
      )
      ORDER BY column_name
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ New columns added:');
      console.log('==================');
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    } else {
      console.log('⚠️  No new columns found - they may have already existed');
    }
    
    // Get all columns
    const allColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'contracts'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Complete contracts table schema:');
    console.log('===================================');
    allColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('⚠️  PostgreSQL is not running or not accessible.');
      console.error('   Please ensure PostgreSQL is started:');
      console.error('   - Check if PostgreSQL service is running');
      console.error('   - Verify connection string:', CONNECTION_STRING.replace(/:[^:]*@/, ':****@'));
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
