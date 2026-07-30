/**
 * Migration: Add 'rejected' status to users table CHECK constraint
 * 
 * SQLite doesn't support altering CHECK constraints directly,
 * so we need to recreate the table with the new constraint.
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cecbs.db');

console.log('🔄 Migrating users table to add "rejected" status...\n');

db.serialize(() => {
  // Step 1: Create new table with updated CHECK constraint
  db.run(`
    CREATE TABLE IF NOT EXISTS users_new (
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
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating new table:', err);
      process.exit(1);
    }
    console.log('✅ Created new users table with updated CHECK constraint');
    
    // Step 2: Copy data from old table to new table
    db.run(`
      INSERT INTO users_new SELECT * FROM users
    `, (err) => {
      if (err) {
        console.error('❌ Error copying data:', err);
        process.exit(1);
      }
      console.log('✅ Copied data from old table');
      
      // Step 3: Drop old table
      db.run(`DROP TABLE users`, (err) => {
        if (err) {
          console.error('❌ Error dropping old table:', err);
          process.exit(1);
        }
        console.log('✅ Dropped old table');
        
        // Step 4: Rename new table to original name
        db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
          if (err) {
            console.error('❌ Error renaming table:', err);
            process.exit(1);
          }
          console.log('✅ Renamed new table to "users"');
          
          // Step 5: Recreate indexes
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, (err) => {
            if (err) console.error('Warning: Could not create email index:', err);
          });
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`, (err) => {
            if (err) console.error('Warning: Could not create username index:', err);
          });
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_exporter_id ON users(exporter_id)`, (err) => {
            if (err) console.error('Warning: Could not create exporter_id index:', err);
          });
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`, (err) => {
            if (err) console.error('Warning: Could not create status index:', err);
            
            console.log('\n🎉 Migration completed successfully!');
            console.log('Users table now supports "rejected" status.\n');
            db.close();
          });
        });
      });
    });
  });
});
