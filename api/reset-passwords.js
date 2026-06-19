// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Password Reset Script - Development/Testing Tool
// 
// This script resets all user passwords to "password123" for easy access during
// development and testing. DO NOT use in production!

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'cecbs.db');
const DEFAULT_PASSWORD = 'password123';

async function resetPasswords() {
  console.log('🔐 CECBS Password Reset Tool');
  console.log('================================\n');
  console.log(`📂 Database: ${DB_PATH}`);
  console.log(`🔑 New Password: ${DEFAULT_PASSWORD}\n`);

  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error connecting to database:', err.message);
      process.exit(1);
    }
  });

  try {
    // Hash the default password
    console.log('⏳ Hashing password...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log('✅ Password hashed successfully\n');

    // Get all active users
    console.log('⏳ Fetching users...');
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, email, role, organization FROM users WHERE status = "active"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`✅ Found ${users.length} active users\n`);

    // Update all passwords
    console.log('⏳ Resetting passwords...');
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE status = "active"',
        [hashedPassword],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✅ All passwords reset successfully!\n');

    // Display user credentials
    console.log('📋 User Credentials:');
    console.log('=' .repeat(80));
    console.log(`${'Username'.padEnd(20)} | ${'Email'.padEnd(30)} | ${'Role'.padEnd(10)} | Organization`);
    console.log('-'.repeat(80));
    
    users.forEach(user => {
      console.log(
        `${user.username.padEnd(20)} | ${user.email.padEnd(30)} | ${user.role.padEnd(10)} | ${user.organization}`
      );
    });
    
    console.log('=' .repeat(80));
    console.log(`\n🔑 All passwords: ${DEFAULT_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - This is for DEVELOPMENT/TESTING only');
    console.log('   - Users should change passwords after login');
    console.log('   - DO NOT use in production environment\n');

  } catch (error) {
    console.error('❌ Error resetting passwords:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  }
}

// Run the script
resetPasswords();
