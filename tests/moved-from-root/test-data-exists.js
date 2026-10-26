#!/usr/bin/env node
// Quick test to check if data exists in PostgreSQL or CouchDB

const { Pool } = require('pg');

async function checkPostgreSQL() {
  const connectionString = 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('=== CHECKING POSTGRESQL ===');
    
    const tables = [
      'letters_of_credit',
      'sales_contracts', 
      'shipments',
      'forex_allocations',
      'advance_payments',
      'consignment_payments',
      'documentary_collections',
      'customs_declarations',
      'ecx_lots',
      'exporters'
    ];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  ${table}: TABLE NOT FOUND or ERROR`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.log('\n💡 This is why your dashboard shows zeros!');
    console.log('   Either:');
    console.log('   1. PostgreSQL is not running');
    console.log('   2. Database "cecbs" does not exist');
    console.log('   3. No data has been inserted yet');
  }
}

checkPostgreSQL();
