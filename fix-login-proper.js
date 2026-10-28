#!/usr/bin/env node
/**
 * Comprehensive fix for ectaAdmin login issue
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function fixLogin() {
  console.log('🔧 Fixing ectaAdmin login issue...\n');

  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 5000 
  });

  const users = [
    {
      username: 'ectaAdmin',
      email: 'ecta@admin.et',
      password: 'admin123',
      role: 'ADMIN',
      organization: 'ECTA',
      full_name: 'ECTA Administrator',
      phone: '+251911000000'
    },
    {
      username: 'admin',
      email: 'admin@cecbs.et',
      password: 'admin123',
      role: 'ADMIN',
      organization: 'SYSTEM',
      full_name: 'System Administrator',
      phone: '+251911000001'
    }
  ];

  try {
    console.log('📊 Current users in database:');
    const existingUsers = await pool.query('SELECT id, username, email, role, status FROM users ORDER BY id');
    console.table(existingUsers.rows);
    console.log('');

    for (const userData of users) {
      console.log(`Processing user: ${userData.username}...`);
      
      // Generate password hash
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Check if user exists
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [userData.username]);
      
      if (existing.rows.length > 0) {
        // Update existing user
        await pool.query(`
          UPDATE users 
          SET password_hash = $1, 
              status = 'active',
              role = $2,
              email = $3,
              organization = $4,
              full_name = $5,
              phone = $6,
              updated_at = NOW()
          WHERE username = $7
        `, [
          passwordHash,
          userData.role,
          userData.email,
          userData.organization,
          userData.full_name,
          userData.phone,
          userData.username
        ]);
        console.log(`   ✅ Updated ${userData.username}`);
      } else {
        // Create new user
        await pool.query(`
          INSERT INTO users (
            username, email, password_hash, role, organization,
            status, full_name, phone, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, NOW(), NOW())
        `, [
          userData.username,
          userData.email,
          passwordHash,
          userData.role,
          userData.organization,
          userData.full_name,
          userData.phone
        ]);
        console.log(`   ✅ Created ${userData.username}`);
      }
      
      console.log(`   Username: ${userData.username}`);
      console.log(`   Password: ${userData.password}`);
      console.log('');
    }

    console.log('✅ Login fix complete!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    users.forEach(u => {
      console.log(`\n${u.full_name}:`);
      console.log(`   Username: ${u.username}`);
      console.log(`   Password: ${u.password}`);
      console.log(`   Role: ${u.role}`);
    });
    console.log('\n═══════════════════════════════════════\n');

    console.log('🔄 Next steps:');
    console.log('   1. Refresh the login page in your browser');
    console.log('   2. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   3. Login with: ectaAdmin / admin123');
    console.log('   4. Or login with: admin / admin123\n');

    // Verify the fix
    console.log('🧪 Testing password verification...');
    const testUser = await pool.query('SELECT username, password_hash FROM users WHERE username = $1', ['ectaAdmin']);
    if (testUser.rows.length > 0) {
      const isValid = await bcrypt.compare('admin123', testUser.rows[0].password_hash);
      console.log(`   Password verification test: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixLogin();
