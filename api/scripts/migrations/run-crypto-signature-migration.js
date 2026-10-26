#!/usr/bin/env node
// Run Database Migration: Add crypto_signature_embedded column
// This migration adds support for tracking cryptographic signature embedding

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cecbs',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting crypto signature column migration...\n');
    
    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add-crypto-signature-column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration SQL...');
    
    // Run migration in a transaction
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify the changes
    console.log('🔍 Verifying migration...\n');
    
    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'document_signatures'
        AND column_name = 'crypto_signature_embedded'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Column crypto_signature_embedded exists');
      console.log(`   Type: ${columnCheck.rows[0].data_type}`);
      console.log(`   Default: ${columnCheck.rows[0].column_default}`);
    } else {
      console.log('❌ Column not found!');
    }
    
    // Check indexes
    const indexCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'document_signatures'
        AND indexname LIKE '%crypto%'
    `);
    
    console.log(`\n✅ Found ${indexCheck.rows.length} crypto-related indexes:`);
    indexCheck.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    // Check view
    const viewCheck = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name = 'v_crypto_signed_documents'
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log('\n✅ View v_crypto_signed_documents created');
      
      // Sample data from view
      const sampleData = await client.query(`
        SELECT document_id, total_signatures, crypto_signatures, all_signatures_cryptographic
        FROM v_crypto_signed_documents
        LIMIT 5
      `);
      
      if (sampleData.rows.length > 0) {
        console.log('\n📊 Sample data from view:');
        console.table(sampleData.rows);
      }
    } else {
      console.log('\n❌ View not created!');
    }
    
    // Statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_signatures,
        COUNT(CASE WHEN crypto_signature_embedded = TRUE THEN 1 END) as crypto_signed,
        COUNT(CASE WHEN crypto_signature_embedded = FALSE THEN 1 END) as legacy_signed
      FROM document_signatures
    `);
    
    console.log('\n📈 Signature Statistics:');
    console.log(`   Total signatures: ${stats.rows[0].total_signatures}`);
    console.log(`   Cryptographic: ${stats.rows[0].crypto_signed}`);
    console.log(`   Legacy: ${stats.rows[0].legacy_signed}`);
    
    console.log('\n🎉 Migration verification complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. New signatures will be cryptographically embedded');
    console.log('   2. Legacy signatures can be upgraded by re-signing');
    console.log('   3. Use v_crypto_signed_documents view for reporting');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
