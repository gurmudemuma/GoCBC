require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const username = 'EXP7191337';
  const newPassword = 'password123';
  
  console.log(`Resetting password for: ${username}`);
  console.log(`New password: ${newPassword}\n`);
  
  // Check current password hash
  const checkResult = await client.query(
    'SELECT username, password_hash FROM users WHERE username = $1',
    [username]
  );
  
  if (checkResult.rows.length === 0) {
    console.log('❌ User not found');
    await client.end();
    return;
  }
  
  const hasPasswordHash = !!checkResult.rows[0].password_hash;
  console.log(`Current password hash exists: ${hasPasswordHash}`);
  
  if (!hasPasswordHash) {
    console.log('⚠️  No password hash found - user cannot login\n');
  }
  
  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update password
  await client.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
    [hashedPassword, username]
  );
  
  console.log('✅ Password reset successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login Credentials:');
  console.log(`Username: ${username}`);
  console.log(`Password: ${newPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await client.end();
})();
