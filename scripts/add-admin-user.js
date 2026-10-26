// Script to add or update admin user with correct credentials
// Run this to create admin user: admin / admin123

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'api', 'node_modules', 'sqlite3')).verbose();
const bcrypt = require(path.join(__dirname, '..', 'api', 'node_modules', 'bcrypt'));

const dbPath = path.join(__dirname, '..', 'api', 'cecbs.db');

console.log('📁 Database path:', dbPath);
console.log('🔄 Opening database...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('✅ Database connected\n');
});

async function createAdminUser() {
  try {
    // Hash the password
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);

    // Check if admin user exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, row) => {
      if (err) {
        console.error('❌ Error checking for admin user:', err);
        db.close();
        return;
      }

      if (row) {
        console.log('👤 Admin user exists. Updating password...');
        
        // Update existing admin user
        db.run(
          `UPDATE users 
           SET password_hash = ?,
               email = 'admin@cecbs.et',
               full_name = 'System Administrator',
               status = 'active',
               updated_at = datetime('now')
           WHERE username = 'admin'`,
          [hash],
          (err) => {
            if (err) {
              console.error('❌ Failed to update admin user:', err);
            } else {
              console.log('✅ Admin user updated successfully!\n');
              console.log('═══════════════════════════════════════');
              console.log('   LOGIN CREDENTIALS');
              console.log('═══════════════════════════════════════');
              console.log('   Username: admin');
              console.log('   Password: admin123');
              console.log('   Portal:   http://localhost:3000/admin');
              console.log('═══════════════════════════════════════\n');
            }
            db.close();
          }
        );
      } else {
        console.log('👤 Admin user does not exist. Creating...');
        
        // Create new admin user
        db.run(
          `INSERT INTO users (
            username, email, password_hash, full_name, role, organization,
            permissions, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            'admin',
            'admin@cecbs.et',
            hash,
            'System Administrator',
            'ADMIN',
            'CECBS System',
            JSON.stringify(['*']),
            'active'
          ],
          (err) => {
            if (err) {
              console.error('❌ Failed to create admin user:', err);
            } else {
              console.log('✅ Admin user created successfully!\n');
              console.log('═══════════════════════════════════════');
              console.log('   LOGIN CREDENTIALS');
              console.log('═══════════════════════════════════════');
              console.log('   Username: admin');
              console.log('   Password: admin123');
              console.log('   Portal:   http://localhost:3000/admin');
              console.log('═══════════════════════════════════════\n');
            }
            db.close();
          }
        );
      }
    });

    // Also list all current users
    setTimeout(() => {
      const db2 = new sqlite3.Database(dbPath);
      db2.all('SELECT id, username, email, role, organization, status FROM users', [], (err, rows) => {
        if (!err && rows) {
          console.log('\n📋 Current Users in Database:');
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log('ID | Username          | Role      | Organization              | Status');
          console.log('───────────────────────────────────────────────────────────────────');
          rows.forEach(user => {
            console.log(`${user.id.toString().padEnd(2)} | ${user.username.padEnd(17)} | ${user.role.padEnd(9)} | ${user.organization.padEnd(25)} | ${user.status}`);
          });
          console.log('═══════════════════════════════════════════════════════════════════\n');
        }
        db2.close();
      });
    }, 1000);

  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

createAdminUser();
