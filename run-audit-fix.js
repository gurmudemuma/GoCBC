#!/usr/bin/env node
const { Client } = require('pg');

async function fixAuditTrail() {
  console.log('🔧 Fixing Audit Trail Table...\n');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cecbs_db',
    user: 'cecbs_user',
    password: 'cecbs2024!secure',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Add columns
    console.log('Adding performed_by column...');
    await client.query(`
      ALTER TABLE audit_trail 
      ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
    `);

    console.log('Adding performed_by_org column...');
    await client.query(`
      ALTER TABLE audit_trail 
      ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
    `);

    console.log('Adding organization column...');
    await client.query(`
      ALTER TABLE audit_trail 
      ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by 
      ON audit_trail(performed_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org 
      ON audit_trail(performed_by_org);
    `);

    // Verify
    console.log('\n✅ Columns added successfully!\n');
    console.log('Verifying columns exist:');
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trail' 
      AND column_name IN ('performed_by', 'performed_by_org', 'organization')
      ORDER BY column_name;
    `);

    console.table(result.rows);

    if (result.rows.length === 3) {
      console.log('\n✅ All columns exist! Audit Trail is fixed.');
    } else {
      console.log('\n⚠️  Warning: Not all columns were added');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixAuditTrail().then(() => {
  console.log('\n✅ Done! Restart the API:');
  console.log('   cd /home/guda/GoCBC && ./restart-api.sh\n');
  process.exit(0);
});
