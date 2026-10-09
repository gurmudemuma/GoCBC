#!/usr/bin/env node
/**
 * Fix Audit Trail Columns
 * Adds missing performed_by and performed_by_org columns to audit_trail table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'cecbs_db',
  user: process.env.POSTGRES_USER || 'cecbs_user',
  password: process.env.POSTGRES_PASSWORD || 'cecbs2024!secure',
});

async function fixAuditColumns() {
  console.log('🔧 Fixing Audit Trail Table Columns...\n');
  
  const client = await pool.connect();
  
  try {
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'fix-audit-trail-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...');
    const result = await client.query(sql);
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Show the notices (column addition messages)
    if (result && result.length > 0) {
      result.forEach((r, i) => {
        if (r.rows && r.rows.length > 0) {
          console.log(`Result ${i + 1}:`);
          console.table(r.rows);
        }
      });
    }
    
    // Verify the columns exist now
    console.log('\n🔍 Verifying audit_trail table structure:');
    const verify = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      ORDER BY ordinal_position
    `);
    
    console.table(verify.rows);
    
    // Check if performed_by exists
    const hasPerformedBy = verify.rows.some(row => row.column_name === 'performed_by');
    const hasPerformedByOrg = verify.rows.some(row => row.column_name === 'performed_by_org');
    
    if (hasPerformedBy && hasPerformedByOrg) {
      console.log('\n✅ All required columns exist!');
      console.log('✅ Audit Trail API should now work correctly.');
    } else {
      console.log('\n⚠️  Some columns are still missing:');
      if (!hasPerformedBy) console.log('   - performed_by');
      if (!hasPerformedByOrg) console.log('   - performed_by_org');
    }
    
  } catch (error) {
    console.error('\n❌ Error fixing audit columns:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixAuditColumns().then(() => {
  console.log('\n✅ Done! Restart the API server to apply changes:');
  console.log('   cd /home/guda/GoCBC && ./restart-api.sh');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
