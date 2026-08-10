/**
 * Quick script to reset an exporter's password
 * Usage: node reset-exporter-password.js <exporter_id_or_email>
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetPassword(identifier) {
  const client = new Client({ 
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs' 
  });
  
  await client.connect();
  
  console.log(`\n🔍 Looking for user: ${identifier}\n`);
  
  // Find user
  const { rows } = await client.query(
    `SELECT id, username, email, exporter_id, full_name, organization 
     FROM users 
     WHERE email = $1 OR exporter_id = $1 OR username = $1`,
    [identifier]
  );
  
  if (rows.length === 0) {
    console.log('❌ User not found!');
    await client.end();
    return;
  }
  
  const user = rows[0];
  console.log('✅ User found:');
  console.table(user);
  
  // Reset password
  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await client.query(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [hashedPassword, user.id]
  );
  
  console.log('\n✅ Password reset successful!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Company: ${user.organization}`);
  console.log(`Username: ${user.username}`);
  console.log(`Email: ${user.email}`);
  console.log(`New Password: ${newPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Please inform the user to change this password immediately after login.\n');
  
  await client.end();
}

const identifier = process.argv[2];

if (!identifier) {
  console.log('Usage: node reset-exporter-password.js <exporter_id_or_email>');
  console.log('Example: node reset-exporter-password.js EXP4886039');
  console.log('Example: node reset-exporter-password.js gurmud5@gmail.com');
  process.exit(1);
}

resetPassword(identifier).catch(console.error);
