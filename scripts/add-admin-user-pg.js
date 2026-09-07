#!/usr/bin/env node
/**
 * Add Admin User - PostgreSQL Version
 * Run: node scripts/add-admin-user-pg.js
 */

const bcrypt = require('bcrypt');
const db = require('./db-helper');

async function addAdminUser() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CECBS Admin User Creator (PostgreSQL)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test connection first
    console.log('🔌 Testing database connection...');
    const connTest = await db.testConnection();
    if (!connTest.success) {
      console.error('❌ Database connection failed:', connTest.error);
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   docker-compose up -d postgres');
      process.exit(1);
    }
    console.log('✅ Connected to PostgreSQL');
    console.log('   Time:', connTest.time);
    console.log('   Version:', connTest.version.split('\n')[0]);
    console.log('');

    // Check if admin already exists
    console.log('🔍 Checking for existing admin user...');
    const existing = await db.get(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (existing) {
      console.log('⚠️  Admin user already exists!\n');
      console.log('📋 Current admin details:');
      console.log('   ID:', existing.id);
      console.log('   Username:', existing.username);
      console.log('   Full Name:', existing.full_name);
      console.log('   Email:', existing.email);
      console.log('   Role:', existing.role);
      console.log('   Organization:', existing.organization);
      console.log('   Status:', existing.is_active ? '🟢 Active' : '🔴 Inactive');
      console.log('   Created:', existing.created_at);
      console.log('\n💡 To reset, delete this user first or use a different username.\n');
      await db.close();
      return;
    }

    console.log('✅ No existing admin found\n');

    // Create new admin
    console.log('🔨 Creating new admin user...');
    const password = 'admin123'; // Default password
    const passwordHash = await bcrypt.hash(password, 10);

    await db.run(`
      INSERT INTO users (
        username, password_hash, full_name, email, phone,
        role, organization, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      'admin',
      passwordHash,
      'System Administrator',
      'admin@cecbs.et',
      '+251-911-000-000',
      'ADMIN',
      'CECBS',
      true
    ]);

    console.log('✅ Admin user created successfully!\n');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('⚠️  SECURITY WARNING:');
    console.log('   Change the password immediately after first login!\n');

    // List all users
    const users = await db.all(
      `SELECT 
        id, username, full_name, email, role, 
        organization, is_active, created_at 
      FROM users 
      ORDER BY id`
    );

    console.log('📊 All users in database:');
    console.log('═══════════════════════════════════════════════════');
    users.forEach(u => {
      console.log(`   ${u.is_active ? '🟢' : '🔴'} ${u.username} (${u.role})`);
      console.log(`      Name: ${u.full_name}`);
      console.log(`      Email: ${u.email}`);
      console.log(`      Org: ${u.organization}`);
      console.log(`      Created: ${u.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  } finally {
    await db.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the function
addAdminUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
