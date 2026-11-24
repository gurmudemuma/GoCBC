#!/usr/bin/env node
const { Client } = require('./api/node_modules/pg');
const bcrypt = require('./api/node_modules/bcrypt');

async function testAndFix() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123'
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Get bank_admin user
    const result = await client.query(
      'SELECT username, password_hash, role, status FROM users WHERE username = $1',
      ['bank_admin']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ bank_admin user not found!');
      return;
    }
    
    const user = result.rows[0];
    console.log('User found:', user.username);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Hash exists:', user.password_hash ? 'YES' : 'NO');
    console.log();
    
    // Test if current password is password123
    console.log('Testing password: password123...');
    const matches = await bcrypt.compare('password123', user.password_hash);
    
    if (matches) {
      console.log('✅ Current password IS "password123"');
      console.log('\n🎉 You can login with:');
      console.log('   Username: bank_admin');
      console.log('   Password: password123\n');
    } else {
      console.log('❌ Current password is NOT "password123"');
      console.log('\n🔧 Resetting password to "password123"...');
      
      const newHash = await bcrypt.hash('password123', 10);
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [newHash, 'bank_admin']
      );
      
      console.log('✅ Password reset complete!');
      console.log('\n🎉 You can now login with:');
      console.log('   Username: bank_admin');
      console.log('   Password: password123\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testAndFix();
