// Create Admin User in PostgreSQL
// Run from api directory: node create-admin-postgres.js

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

const pool = new Pool({ connectionString });

async function createAdminUser() {
  console.log('🔄 Connecting to PostgreSQL...\n');

  try {
    // Admin users to create
    const adminUsers = [
      {
        username: 'admin',
        email: 'admin@cecbs.et',
        password: 'admin123',
        full_name: 'System Administrator',
        role: 'ADMIN',
        organization: 'Admin',
        permissions: JSON.stringify(['*'])
      },
      {
        username: 'ecta_admin',
        email: 'ecta@cecbs.et',
        password: 'password123',
        full_name: 'ECTA Administrator',
        role: 'ECTA',
        organization: 'ECTA',
        permissions: JSON.stringify(['quality', 'inspection', 'permits'])
      },
      {
        username: 'ecx_admin',
        email: 'ecx@cecbs.et',
        password: 'password123',
        full_name: 'ECX Administrator',
        role: 'ECX',
        organization: 'ECX',
        permissions: JSON.stringify(['contracts', 'trading'])
      },
      {
        username: 'nbe_admin',
        email: 'nbe@cecbs.et',
        password: 'password123',
        full_name: 'NBE Administrator',
        role: 'NBE',
        organization: 'NBE',
        permissions: JSON.stringify(['forex', 'compliance'])
      },
      {
        username: 'bank_admin',
        email: 'bank@cecbs.et',
        password: 'password123',
        full_name: 'Bank Administrator',
        role: 'BANKS',
        organization: 'Banks',
        permissions: JSON.stringify(['lc', 'payments', 'banking'])
      },
      {
        username: 'customs_admin',
        email: 'customs@cecbs.et',
        password: 'password123',
        full_name: 'Customs Administrator',
        role: 'CUSTOMS',
        organization: 'Customs',
        permissions: JSON.stringify(['customs', 'clearance'])
      },
      {
        username: 'shipping_admin',
        email: 'shipping@cecbs.et',
        password: 'password123',
        full_name: 'Shipping Administrator',
        role: 'SHIPPING',
        organization: 'Shipping',
        permissions: JSON.stringify(['shipping', 'logistics'])
      },
      {
        username: 'testexporter',
        email: 'exporter@cecbs.et',
        password: 'password123',
        full_name: 'Test Exporter',
        role: 'EXPORTER',
        organization: 'Exporters',
        exporter_id: 'EXP001',
        ecta_license: 'ECTA-LIC-001',
        permissions: JSON.stringify(['export', 'contracts', 'shipments'])
      }
    ];

    for (const user of adminUsers) {
      const hash = await bcrypt.hash(user.password, 10);

      // Check if user exists
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [user.username]
      );

      if (result.rows.length > 0) {
        // Update existing user
        await pool.query(
          `UPDATE users 
           SET password_hash = $1,
               email = $2,
               full_name = $3,
               role = $4,
               organization = $5,
               permissions = $6,
               exporter_id = $7,
               ecta_license = $8,
               status = 'active',
               updated_at = CURRENT_TIMESTAMP
           WHERE username = $9`,
          [hash, user.email, user.full_name, user.role, user.organization, 
           user.permissions, user.exporter_id || null, user.ecta_license || null, user.username]
        );
        console.log(`✅ Updated user: ${user.username}`);
      } else {
        // Create new user
        await pool.query(
          `INSERT INTO users (
            username, email, password_hash, full_name, role, organization,
            permissions, exporter_id, ecta_license, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            user.username,
            user.email,
            hash,
            user.full_name,
            user.role,
            user.organization,
            user.permissions,
            user.exporter_id || null,
            user.ecta_license || null
          ]
        );
        console.log(`✅ Created user: ${user.username}`);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('   ALL USERS CREATED/UPDATED');
    console.log('═══════════════════════════════════════');
    console.log('   Super Admin:  admin / admin123');
    console.log('   ECTA Admin:   ecta_admin / password123');
    console.log('   ECX Admin:    ecx_admin / password123');
    console.log('   NBE Admin:    nbe_admin / password123');
    console.log('   Bank Admin:   bank_admin / password123');
    console.log('   Customs:      customs_admin / password123');
    console.log('   Shipping:     shipping_admin / password123');
    console.log('   Exporter:     testexporter / password123');
    console.log('═══════════════════════════════════════\n');

    // List all users
    const users = await pool.query(
      'SELECT id, username, email, role, organization, status FROM users ORDER BY id'
    );

    console.log('📋 Current Users in PostgreSQL Database:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('ID | Username          | Role      | Organization              | Status');
    console.log('───────────────────────────────────────────────────────────────────');
    users.rows.forEach(user => {
      console.log(
        `${user.id.toString().padEnd(2)} | ${user.username.padEnd(17)} | ${user.role.padEnd(9)} | ${user.organization.padEnd(25)} | ${user.status}`
      );
    });
    console.log('═══════════════════════════════════════════════════════════════════\n');

    await pool.end();
    console.log('✅ Done! You can now login with admin / admin123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  PostgreSQL is not running or not accessible.');
      console.log('💡 Solution: Either start PostgreSQL or disable it in .env:');
      console.log('   Comment out the DATABASE_URL line in api/.env\n');
    }
    await pool.end();
    process.exit(1);
  }
}

createAdminUser();
