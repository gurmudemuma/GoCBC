#!/usr/bin/env node
/**
 * Check if ectaAdmin user exists and verify credentials
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function checkUser() {
  console.log('🔍 Checking ectaAdmin user in database...\n');

  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ connectionString });

  try {
    // Check if user exists
    const userResult = await pool.query(`
      SELECT id, username, email, password_hash, role, organization, status, full_name
      FROM users 
      WHERE username = $1 OR username = $2
    `, ['ectaAdmin', 'admin']);

    if (userResult.rows.length === 0) {
      console.log('❌ No user found with username "ectaAdmin" or "admin"');
      console.log('\n📋 All users in database:');
      
      const allUsers = await pool.query('SELECT id, username, email, role, status FROM users ORDER BY id');
      console.table(allUsers.rows);
      
      console.log('\n🔧 Fix: Create the ectaAdmin user:');
      console.log('   Run: node /home/guda/GoCBC/create-ecta-admin.js');
    } else {
      console.log('✅ User found!\n');
      const user = userResult.rows[0];
      
      console.log('User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Organization: ${user.organization}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Full Name: ${user.full_name}`);
      console.log(`   Password Hash: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL'}`);
      
      // Test password
      console.log('\n🔐 Testing password...');
      
      if (!user.password_hash) {
        console.log('❌ No password hash found! User cannot login.');
        console.log('\n🔧 Fix: Reset the password:');
        console.log('   Run: node /home/guda/GoCBC/reset-ecta-password.js');
      } else {
        // Test common passwords
        const testPasswords = ['admin123', 'password', 'admin', 'ectaAdmin123', '123456'];
        
        for (const testPass of testPasswords) {
          const isValid = await bcrypt.compare(testPass, user.password_hash);
          if (isValid) {
            console.log(`✅ Password "${testPass}" works!`);
            console.log(`\n✅ You can login with:`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Password: ${testPass}`);
            await pool.end();
            return;
          }
        }
        
        console.log('⚠️  None of the common passwords match.');
        console.log('\n🔧 Fix: Reset the password:');
        console.log('   Run: node /home/guda/GoCBC/reset-ecta-password.js');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser();
