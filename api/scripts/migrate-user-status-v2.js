/**
 * Migration: Add 'rejected' status to users table CHECK constraint
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cecbs.db');

console.log('🔄 Migrating users table to add "rejected" status...\n');

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
  role TEXT NOT NULL CHECK(role IN ('ECTA', 'EXPORTER', 'BANK', 'NBE', 'CUSTOMS', 'ECX', 'SHIPPING')),
  organization TEXT NOT NULL,
  exporter_id TEXT,
  ecta_license TEXT,
  phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_branch_name TEXT,
  bank_branch_code TEXT,
  permissions TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'inactive', 'rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);

-- Copy data
INSERT INTO users_new 
SELECT id, username, email, password_hash, full_name, role, organization, 
       exporter_id, ecta_license, phone, bank_name, bank_account_number, 
       bank_branch_name, bank_branch_code, permissions, status, created_at, 
       updated_at, last_login
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

db.exec(migration, (err) => {
  if (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
  
  console.log('✅ Migration completed successfully!');
  console.log('Users table now supports "rejected" status.\n');
  db.close();
});
