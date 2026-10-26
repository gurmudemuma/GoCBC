#!/usr/bin/env node
/**
 * Database Migration Runner - PostgreSQL Version
 * Run: node scripts/migrate-db-pg.js
 */

const fs = require('fs');
const path = require('path');
const db = require('./db-helper');

async function runMigrations() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CECBS Database Migration Runner (PostgreSQL)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    console.log('🔌 Testing database connection...');
    const connTest = await db.testConnection();
    if (!connTest.success) {
      console.error('❌ Connection failed:', connTest.error);
      process.exit(1);
    }
    console.log('✅ Connected to PostgreSQL\n');

    const migrationsDir = path.join(__dirname, '..', 'api', 'src', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      await db.close();
      return;
    }

    console.log(`📁 Found ${files.length} migration file(s)\n`);
    console.log('═══════════════════════════════════════════════════');

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`\n⚙️  Running: ${file}`);
      console.log('───────────────────────────────────────────────────');

      try {
        // Direct execution - apply entire SQL file at once
        console.log(`   🔄 Executing migration file directly...\n`);
        
        await db.query(sql);
        
        console.log(`   ✅ Migration completed: ${file}`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${files.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errorCount > 0) {
      console.log('⚠️  Some migrations failed. Please review errors above.\n');
    } else {
      console.log('✅ All migrations processed successfully!\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  } finally {
    await db.close();
    console.log('🔌 Database connection closed\n');
  }
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
