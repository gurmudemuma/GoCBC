#!/usr/bin/env node
/**
 * Run Migration 016: Add missing application_id column
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔧 Running Migration 016: Add application_id column to exporter_applications\n');

  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ connectionString });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../src/migrations/016_add_application_id_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🔌 Connecting to database...');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exporter_applications'
      AND column_name = 'application_id'
    `);

    if (result.rows.length > 0) {
      const col = result.rows[0];
      console.log(`✅ Verified: application_id column exists`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
    } else {
      console.error('⚠️  Warning: Could not verify application_id column');
    }

    // Show sample data
    const sampleResult = await pool.query(`
      SELECT id, application_id, company_name, status, submitted_date
      FROM exporter_applications
      LIMIT 5
    `);

    console.log(`\n📊 Sample data (${sampleResult.rows.length} rows):`);
    sampleResult.rows.forEach(row => {
      console.log(`   - ID: ${row.id}, App ID: ${row.application_id}, Company: ${row.company_name}, Status: ${row.status}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
