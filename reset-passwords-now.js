// Reset all portal admin passwords to password123
const { Pool } = require('./api/node_modules/pg');
const bcrypt = require('./api/node_modules/bcrypt');

// Use current database credentials
const pool = new Pool({ 
  connectionString: 'postgresql://cecbs_user:cecbs2024secure@localhost:5432/cecbs_db' 
});

async function resetAllPasswords() {
  console.log('🔄 Resetting all portal admin passwords...\n');

  try {
    const password123 = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Update ADMIN
    const adminResult = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE role = $2 RETURNING username',
      [adminPassword, 'ADMIN']
    );
    if (adminResult.rowCount > 0) {
      console.log(`✅ ADMIN password reset to: admin123 (${adminResult.rowCount} user(s))`);
    }

    // Update all other portals
    const roles = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'];
    for (const role of roles) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $1, active = true WHERE role = $2 RETURNING username',
        [password123, role]
      );
      if (result.rowCount > 0) {
        console.log(`✅ ${role} password reset to: password123 (${result.rowCount} user(s))`);
      } else {
        console.log(`⚠️  ${role} - no users found to update`);
      }
    }

    console.log('\n📋 Verifying users...\n');
    
    const users = await pool.query(
      'SELECT id, username, role, organization, active FROM users ORDER BY role, username'
    );
    
    if (users.rows.length === 0) {
      console.log('⚠️  No users found in database! Creating default users...\n');
      
      // Create default users
      await pool.query(`
        INSERT INTO users (username, password_hash, email, full_name, organization, role, active, created_at)
        VALUES 
          ('bank_admin', $1, 'admin@cbe.com.et', 'Bank Administrator', 'BANKS', 'BANKS', true, NOW()),
          ('ecta_admin', $1, 'admin@ecta.gov.et', 'ECTA Administrator', 'ECTA', 'ECTA', true, NOW())
        ON CONFLICT (username) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash, active = true
      `, [password123]);
      
      console.log('✅ Created default users: bank_admin, ecta_admin');
      
      const newUsers = await pool.query(
        'SELECT id, username, role, organization, active FROM users ORDER BY role, username'
      );
      users.rows = newUsers.rows;
    }
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Username              | Role      | Organization | Password');
    console.log('───────────────────────────────────────────────────────────────────');
    users.rows.forEach(user => {
      const pwd = user.role === 'ADMIN' ? 'admin123' : 'password123';
      const active = user.active ? '✓' : '✗';
      console.log(`${user.username.padEnd(21)} | ${user.role.padEnd(9)} | ${(user.organization || '').padEnd(12)} | ${pwd} ${active}`);
    });
    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log('🔑 You can now login with:');
    console.log('   bank_admin / password123');
    console.log('   ecta_admin / password123\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

resetAllPasswords();
