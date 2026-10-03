#!/usr/bin/env node

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });

async function resetPassword() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ connectionString });

  try {
    console.log('Resetting bankAdmin password...\n');

    // Generate new password hash
    const newPassword = 'password123';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username, role, organization',
      [passwordHash, 'bankAdmin']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Password reset successfully!');
      console.log('');
      console.log('User Details:');
      console.log('  Username:', user.username);
      console.log('  Role:', user.role);
      console.log('  Organization:', user.organization);
      console.log('  New Password: password123');
      console.log('');
      console.log('You can now login with:');
      console.log('  Username: bankAdmin');
      console.log('  Password: password123');
      console.log('');
    } else {
      console.log('❌ User bankAdmin not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPassword();
