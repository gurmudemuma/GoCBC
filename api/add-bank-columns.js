/**
 * Ethiopian Coffee Export Consortium Blockchain System (CECBS)
 * Database Migration: Add Bank Information Columns
 * 
 * This migration adds bank/branch columns to support cascading bank selection
 * for exporter registration and LC processing authority.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'cecbs.db');

console.log('📦 CECBS Database Migration - Add Bank Columns');
console.log('━'.repeat(60));
console.log(`Database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
});

// Migration SQL statements
const migrations = [
  {
    name: 'Add bank columns to users table',
    sql: `
      ALTER TABLE users ADD COLUMN bank_name TEXT;
    `,
  },
  {
    name: 'Add bank branch to users table',
    sql: `
      ALTER TABLE users ADD COLUMN bank_branch TEXT;
    `,
  },
  {
    name: 'Add bank branch code to users table',
    sql: `
      ALTER TABLE users ADD COLUMN bank_branch_code TEXT;
    `,
  },
  {
    name: 'Add bank branch name to exporter_applications table',
    sql: `
      ALTER TABLE exporter_applications ADD COLUMN bank_branch_name TEXT;
    `,
  },
  {
    name: 'Add bank branch code to exporter_applications table',
    sql: `
      ALTER TABLE exporter_applications ADD COLUMN bank_branch_code TEXT;
    `,
  },
];

// Run migrations sequentially
let successCount = 0;
let skipCount = 0;
let errorCount = 0;

const runMigration = (index) => {
  if (index >= migrations.length) {
    console.log('\n' + '━'.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped:    ${skipCount}`);
    console.log(`   ❌ Failed:     ${errorCount}`);
    console.log('━'.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n✨ All migrations completed successfully!\n');
      
      // Verify columns were added
      db.all(`PRAGMA table_info(users)`, [], (err, rows) => {
        if (!err) {
          const bankColumns = rows.filter(r => r.name.startsWith('bank_'));
          console.log('✅ Users table bank columns:');
          bankColumns.forEach(col => console.log(`   - ${col.name} (${col.type})`));
        }
        
        db.all(`PRAGMA table_info(exporter_applications)`, [], (err, rows) => {
          if (!err) {
            const bankColumns = rows.filter(r => r.name.startsWith('bank_'));
            console.log('\n✅ Exporter applications table bank columns:');
            bankColumns.forEach(col => console.log(`   - ${col.name} (${col.type})`));
          }
          
          db.close();
          process.exit(0);
        });
      });
    } else {
      console.log('\n⚠️  Some migrations failed. Please check the errors above.\n');
      db.close();
      process.exit(1);
    }
    return;
  }

  const migration = migrations[index];
  console.log(`[${index + 1}/${migrations.length}] ${migration.name}`);

  db.run(migration.sql, (err) => {
    if (err) {
      // Check if column already exists (SQLite error: duplicate column name)
      if (err.message.includes('duplicate column name')) {
        console.log(`   ⏭️  Column already exists, skipping...`);
        skipCount++;
      } else {
        console.error(`   ❌ Error: ${err.message}`);
        errorCount++;
      }
    } else {
      console.log(`   ✅ Success`);
      successCount++;
    }
    
    // Run next migration
    runMigration(index + 1);
  });
};

// Start migrations
console.log('🚀 Starting migrations...\n');
runMigration(0);
