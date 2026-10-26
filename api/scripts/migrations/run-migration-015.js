#!/usr/bin/env node
/**
 * Run Migration 015: Audit Logs and Notifications
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

const pool = new Pool({ connectionString });

async function runMigration() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Running Migration 015: Audit Logs & Notifications');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = await pool.connect();

  try {
    const migrationFile = path.join(__dirname, 'src', 'migrations', '015_add_audit_logs_and_notifications.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...\n');

    const result = await client.query(sql);
    
    console.log('✅ Migration 015 completed successfully!\n');
    console.log('Created:');
    console.log('  ✓ audit_logs table');
    console.log('  ✓ notifications table');
    console.log('  ✓ notification_templates table');
    console.log('  ✓ 4 views');
    console.log('  ✓ 4 default notification templates\n');

    // Verify tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('audit_logs', 'notifications', 'notification_templates')
      ORDER BY table_name
    `);

    console.log('Verification:');
    tablesCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

runMigration();
