#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

async function resetAdminPassword() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔐 Resetting admin password...');
    
    // Check if admin exists
    const result = await pool.query('SELECT id, username FROM users WHERE username = $1', ['admin']);
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found in database');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:', result.rows[0]);
    
    // Generate new hash for 'admin123'
    const newPassword = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔒 Generated new password hash');
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
      [passwordHash, 'admin']
    );
    
    console.log('✅ Admin password updated successfully');
    console.log('');
    console.log('You can now login with:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
