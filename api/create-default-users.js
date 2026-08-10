#!/usr/bin/env node
/**
 * Create Default Users for CECBS
 * Ensures consistent default users with known passwords
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

const DEFAULT_USERS = [
  {
    username: 'admin',
    email: 'admin@cecbs.et',
    password: 'admin123',
    full_name: 'System Administrator',
    role: 'ADMIN',
    organization: 'CECBS',
    permissions: JSON.stringify([
      'admin:system', 'users:create', 'users:read', 'users:update', 'users:delete',
      'users:manage-all', 'blockchain:enroll', 'blockchain:revoke', 'blockchain:renew',
      'analytics:view-all', 'settings:manage', 'audit:view-all', 'organizations:manage-all'
    ])
  },
  {
    username: 'ectaAdmin',
    email: 'ecta@cecbs.et',
    password: 'password123',
    full_name: 'ECTA Administrator',
    role: 'ECTA',
    organization: 'ECTA',
    permissions: JSON.stringify([
      'users:create-org', 'users:read-org', 'users:update-org', 'users:delete-org',
      'blockchain:enroll-org', 'quality:manage', 'permits:manage', 'phytosanitary:manage',
      'licenses:manage', 'analytics:view-org', 'exporters:approve', 'exporters:verify'
    ])
  },
  {
    username: 'ecxAdmin',
    email: 'ecx@cecbs.et',
    password: 'password123',
    full_name: 'ECX Administrator',
    role: 'ECX',
    organization: 'ECX',
    permissions: JSON.stringify([
      'users:create-org', 'users:read-org', 'users:update-org', 'users:delete-org',
      'blockchain:enroll-org', 'contracts:manage', 'grading:manage', 'warehouse:manage',
      'release:manage', 'analytics:view-org'
    ])
  },
  {
    username: 'nbeAdmin',
    email: 'nbe@cecbs.et',
    password: 'password123',
    full_name: 'NBE Administrator',
    role: 'NBE',
    organization: 'NBE',
    permissions: JSON.stringify([
      'users:create-org', 'users:read-org', 'users:update-org', 'users:delete-org',
      'blockchain:enroll-org', 'forex:manage', 'forex:allocate', 'forex:approve',
      'compliance:verify', 'analytics:view-org', 'payments:monitor'
    ])
  },
  {
    username: 'bankAdmin',
    email: 'bank@cecbs.et',
    password: 'password123',
    full_name: 'Bank Administrator',
    role: 'BANKS',
    organization: 'BANKS',
    permissions: JSON.stringify([
      'users:create-org', 'users:read-org', 'users:update-org', 'users:delete-org',
      'blockchain:enroll-org', 'lc:issue', 'lc:manage', 'payments:process',
      'advance:manage', 'collections:manage', 'analytics:view-org'
    ])
  },
  {
    username: 'customsAdmin',
    email: 'customs@cecbs.et',
    password: 'password123',
    full_name: 'Customs Administrator',
    role: 'CUSTOMS',
    organization: 'CUSTOMS',
    permissions: JSON.stringify([
      'users:create-org', 'users:read-org', 'users:update-org', 'users:delete-org',
      'blockchain:enroll-org', 'customs:declare', 'customs:inspect', 'customs:clear',
      'customs:assess-duty', 'analytics:view-org'
    ])
  },
  {
    username: 'shippingAdmin',
    email: 'shipping@cecbs.et',
    password: 'password123',
    full_name: 'Shipping Administrator',
    role: 'SHIPPING',
    organization: 'SHIPPING',
    permissions: JSON.stringify([
      'users:create-org', 'users:read-org', 'users:update-org', 'users:delete-org',
      'blockchain:enroll-org', 'shipments:create', 'shipments:update', 'shipments:track',
      'logistics:manage', 'analytics:view-org'
    ])
  },
  {
    username: 'testexporter',
    email: 'testexporter@cecbs.et',
    password: 'password123',
    full_name: 'Test Exporter',
    role: 'EXPORTER',
    organization: 'Test Export Company',
    exporter_id: 'EXP0000001',
    permissions: JSON.stringify([
      'contracts:create', 'contracts:view-own', 'shipments:create-own',
      'shipments:view-own', 'documents:upload-own', 'documents:view-own',
      'permits:apply', 'lc:view-own', 'payments:view-own', 'analytics:view-own'
    ])
  }
];

async function createDefaultUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating/Updating Default Users...\n');
    
    for (const user of DEFAULT_USERS) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Check if user exists
      const existing = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      
      if (existing.rows.length > 0) {
        // Update existing user
        await client.query(
          `UPDATE users 
           SET password_hash = $1, email = $2, full_name = $3, role = $4, 
               organization = $5, permissions = $6, status = 'active',
               exporter_id = $7, updated_at = NOW()
           WHERE username = $8`,
          [
            hashedPassword,
            user.email,
            user.full_name,
            user.role,
            user.organization,
            user.permissions,
            user.exporter_id || null,
            user.username
          ]
        );
        console.log(`✅ Updated: ${user.username} (${user.role}) - password: ${user.password}`);
      } else {
        // Create new user
        await client.query(
          `INSERT INTO users (username, email, password_hash, full_name, role, organization, 
                              permissions, status, exporter_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())`,
          [
            user.username,
            user.email,
            hashedPassword,
            user.full_name,
            user.role,
            user.organization,
            user.permissions,
            user.exporter_id || null
          ]
        );
        console.log(`✅ Created: ${user.username} (${user.role}) - password: ${user.password}`);
      }
    }
    
    console.log('\n✅ All default users created/updated successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    DEFAULT_USERS.forEach(u => {
      console.log(`  ${u.username.padEnd(20)} → ${u.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createDefaultUsers().catch(console.error);
