// Create Admin User in PostgreSQL
// Run from api directory: node create-admin-postgres.js

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

const pool = new Pool({ connectionString });

async function createAdminUser() {
  console.log('🔄 Connecting to PostgreSQL...\n');

  try {
    // Hash the password
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);

    // Check if admin user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (result.rows.length > 0) {
      console.log('👤 Admin user exists. Updating password...');
      
      // Update existing admin user
      await pool.query(
        `UPDATE users 
         SET password_hash = $1,
             email = 'admin@cecbs.et',
             full_name = 'System Administrator',
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE username = 'admin'`,
        [hash]
      );

      console.log('✅ Admin user updated successfully!\n');
    } else {
      console.log('👤 Admin user does not exist. Creating...');
      
      // Create new admin user
      await pool.query(
        `INSERT INTO users (
          username, email, password_hash, full_name, role, organization,
          permissions, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          'admin',
          'admin@cecbs.et',
          hash,
          'System Administrator',
          'ADMIN',
          'CECBS System',
          JSON.stringify(['*']),
          'active'
        ]
      );

      console.log('✅ Admin user created successfully!\n');
    }

    console.log('═══════════════════════════════════════');
    console.log('   LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Portal:   http://localhost:3001/admin');
    console.log('═══════════════════════════════════════\n');

    // List all users
    const users = await pool.query(
      'SELECT id, username, email, role, organization, status FROM users ORDER BY id'
    );

    console.log('📋 Current Users in PostgreSQL Database:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('ID | Username          | Role      | Organization              | Status');
    console.log('───────────────────────────────────────────────────────────────────');
    users.rows.forEach(user => {
      console.log(
        `${user.id.toString().padEnd(2)} | ${user.username.padEnd(17)} | ${user.role.padEnd(9)} | ${user.organization.padEnd(25)} | ${user.status}`
      );
    });
    console.log('═══════════════════════════════════════════════════════════════════\n');

    await pool.end();
    console.log('✅ Done! You can now login with admin / admin123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  PostgreSQL is not running or not accessible.');
      console.log('💡 Solution: Either start PostgreSQL or disable it in .env:');
      console.log('   Comment out the DATABASE_URL line in api/.env\n');
    }
    await pool.end();
    process.exit(1);
  }
}

createAdminUser();
