#!/usr/bin/env node
/**
 * Create Contract Documents Table
 * Fixes: relation "contract_documents" does not exist
 */

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

async function createTable() {
  try {
    console.log('🔍 Checking if contract_documents table exists...');
    
    // Check if table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'contract_documents'
      );
    `);
    
    const tableExists = checkResult.rows[0].exists;
    
    if (tableExists) {
      console.log('✅ Table contract_documents already exists');
      await pool.end();
      return;
    }
    
    console.log('📝 Table does not exist. Creating contract_documents table...');
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, 'src', 'migrations', '041_create_contract_documents_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Successfully created contract_documents table');
    
    // Verify table was created
    const verifyResult = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contract_documents'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Table structure:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    await pool.end();
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTable();
