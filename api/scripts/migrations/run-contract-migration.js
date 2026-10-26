#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'cbc-database.db');
const MIGRATION_FILE = path.join(__dirname, 'src/migrations/023_add_missing_contract_fields.sql');

console.log('🔧 Running contract schema migration...');
console.log('📂 Database:', DB_PATH);
console.log('📄 Migration:', MIGRATION_FILE);

try {
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH);
    process.exit(1);
  }

  // Read migration SQL
  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
  
  // Open database
  const db = new Database(DB_PATH);
  
  // For SQLite, we need to convert PostgreSQL syntax to SQLite
  // SQLite doesn't support DO blocks, so we'll run each ALTER TABLE individually
  console.log('\n📊 Checking and adding missing columns...\n');
  
  const columns = [
    { name: 'buyer_name', type: 'TEXT' },
    { name: 'organic_certified', type: 'INTEGER DEFAULT 0' },
    { name: 'fair_trade_certified', type: 'INTEGER DEFAULT 0' },
    { name: 'port_of_loading', type: 'TEXT' },
    { name: 'port_of_destination', type: 'TEXT' },
    { name: 'delivery_date', type: 'TEXT' },
    { name: 'incoterm', type: 'TEXT' },
    { name: 'special_instructions', type: 'TEXT' }
  ];
  
  // Get existing columns
  const existingColumns = db.prepare("PRAGMA table_info(contracts)").all();
  const existingColumnNames = existingColumns.map(col => col.name);
  
  console.log('✅ Existing columns:', existingColumnNames.join(', '));
  console.log('');
  
  let addedCount = 0;
  
  for (const column of columns) {
    if (!existingColumnNames.includes(column.name)) {
      try {
        const sql = `ALTER TABLE contracts ADD COLUMN ${column.name} ${column.type}`;
        console.log(`  Adding column: ${column.name}...`);
        db.exec(sql);
        console.log(`  ✅ Added ${column.name}`);
        addedCount++;
      } catch (error) {
        console.error(`  ❌ Failed to add ${column.name}:`, error.message);
      }
    } else {
      console.log(`  ⏭️  Column ${column.name} already exists`);
    }
  }
  
  // Create indexes (if they don't exist)
  console.log('\n📊 Creating indexes...\n');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_contracts_buyer_name ON contracts(buyer_name)',
    'CREATE INDEX IF NOT EXISTS idx_contracts_delivery_date ON contracts(delivery_date)'
  ];
  
  for (const indexSQL of indexes) {
    try {
      db.exec(indexSQL);
      console.log(`  ✅ ${indexSQL.substring(0, 60)}...`);
    } catch (error) {
      console.log(`  ⏭️  Index already exists or failed:`, error.message);
    }
  }
  
  // Verify final schema
  const finalColumns = db.prepare("PRAGMA table_info(contracts)").all();
  
  console.log('\n📊 Final schema:');
  console.log('================');
  finalColumns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  db.close();
  
  console.log('\n✅ Migration complete!');
  console.log(`📊 Added ${addedCount} new columns`);
  
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}
