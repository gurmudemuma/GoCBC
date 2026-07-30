/**
 * Migration: Add 'rejected' status to users table CHECK constraint
 * This migration handles existing columns gracefully
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cecbs.db');

console.log('🔄 Migrating users table to add "rejected" status...\n');

// First, get the current schema
db.all("PRAGMA table_info(users)", [], (err, columns) => {
  if (err) {
    console.error('❌ Failed to read table schema:', err);
    process.exit(1);
  }
  
  const columnNames = columns.map(col => col.name);
  console.log('Current columns:', columnNames.join(', '));
  
  // Build the SELECT query based on available columns
  const columnsToSelect = [
    'id', 'username', 'email', 'password_hash', 'full_name', 'role', 
    'organization', 'exporter_id', 'ecta_license', 'phone'
  ];
  
  // Add optional columns if they exist
  if (columnNames.includes('bank_name')) columnsToSelect.push('bank_name');
  if (columnNames.includes('bank_account_number')) columnsToSelect.push('bank_account_number');
  if (columnNames.includes('bank_branch')) columnsToSelect.push('bank_branch');
  if (columnNames.includes('bank_branch_name')) columnsToSelect.push('bank_branch_name');
  if (columnNames.includes('bank_branch_code')) columnsToSelect.push('bank_branch_code');
  if (columnNames.includes('permissions')) columnsToSelect.push('permissions');
  if (columnNames.includes('status')) columnsToSelect.push('status');
  if (columnNames.includes('created_at')) columnsToSelect.push('created_at');
  if (columnNames.includes('updated_at')) columnsToSelect.push('updated_at');
  if (columnNames.includes('last_login')) columnsToSelect.push('last_login');
  
  const selectClause = columnsToSelect.join(', ');
  
  const migration = `
BEGIN TRANSACTION;

-- Drop the table if it already exists from a failed migration
DROP TABLE IF EXISTS users_new;

-- Create new table with updated CHECK constraint
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ECTA', 'EXPORTER', 'BANK', 'BANKS', 'NBE', 'CUSTOMS', 'ECX', 'SHIPPING', 'ADMIN')),
  organization TEXT NOT NULL,
  exporter_id TEXT,
  ecta_license TEXT,
  phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  bank_branch_name TEXT,
  bank_branch_code TEXT,
  permissions TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'inactive', 'rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);

-- Copy data
INSERT INTO users_new (${selectClause})
SELECT ${selectClause}
FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_exporter_id ON users(exporter_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMIT;
`;

  console.log('\n📝 Executing migration...\n');
  
  db.exec(migration, (err) => {
    if (err) {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('Users table now supports "rejected" status.\n');
    db.close();
  });
});
