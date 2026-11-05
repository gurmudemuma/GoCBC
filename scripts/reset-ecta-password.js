#!/usr/bin/env node
/**
 * Reset ectaAdmin password to a known value
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function resetPassword() {
  console.log('🔐 Resetting ectaAdmin password...\n');

  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ connectionString });

  const newPassword = 'admin123';

  try {
    // Find user
    const userResult = await pool.query(`
      SELECT id, username, email, role, status
      FROM users 
      WHERE username = $1 OR username = $2
      ORDER BY CASE WHEN username = $1 THEN 1 ELSE 2 END
      LIMIT 1
    `, ['ectaAdmin', 'admin']);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found. Creating new ectaAdmin user...\n');
      
      // Create new user
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      await pool.query(`
        INSERT INTO users (
          username, email, password_hash, role, organization, 
          status, full_name, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW()
        )
      `, [
        'ectaAdmin',
        'ecta@admin.et',
        passwordHash,
        'ADMIN',
        'ECTA',
        'active',
        'ECTA Administrator'
      ]);
      
      console.log('✅ New ectaAdmin user created!\n');
      console.log('Login Credentials:');
      console.log(`   Username: ectaAdmin`);
      console.log(`   Password: ${newPassword}`);
      console.log(`   Role: ADMIN`);
      console.log(`   Status: active\n`);
      
    } else {
      // Update existing user
      const user = userResult.rows[0];
      console.log(`Found user: ${user.username} (${user.email})`);
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      await pool.query(`
        UPDATE users 
        SET password_hash = $1, status = 'active', updated_at = NOW()
        WHERE id = $2
      `, [passwordHash, user.id]);
      
      console.log('✅ Password reset successful!\n');
      console.log('Login Credentials:');
      console.log(`   Username: ${user.username}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: active\n`);
    }
    
    console.log('🔄 Next steps:');
    console.log('   1. Refresh the login page in your browser');
    console.log('   2. Login with the credentials above');
    console.log('   3. Change your password after first login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPassword();
