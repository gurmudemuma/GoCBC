// Reset all portal admin passwords to password123
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs' });

async function resetAllPasswords() {
  console.log('🔄 Resetting all portal admin passwords...\n');

  try {
    const password123 = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Update ADMIN
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE role = $2',
      [adminPassword, 'ADMIN']
    );
    console.log('✅ ADMIN password reset to: admin123');

    // Update all other portals
    const roles = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'];
    for (const role of roles) {
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE role = $2',
        [password123, role]
      );
      console.log(`✅ ${role} password reset to: password123`);
    }

    console.log('\n📋 All passwords reset successfully!\n');
    
    const users = await pool.query(
      'SELECT id, username, role, organization FROM users ORDER BY id'
    );
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Username              | Role      | Password');
    console.log('───────────────────────────────────────────────────────────────────');
    users.rows.forEach(user => {
      const pwd = user.role === 'ADMIN' ? 'admin123' : 'password123';
      console.log(`${user.username.padEnd(21)} | ${user.role.padEnd(9)} | ${pwd}`);
    });
    console.log('═══════════════════════════════════════════════════════════════════\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

resetAllPasswords();
