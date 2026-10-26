#!/usr/bin/env node
/**
 * Check Admin Role - PostgreSQL Version
 * Run: node scripts/check-admin-role-pg.js
 */

const db = require('./db-helper');

async function checkAdmin() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CECBS Admin User Checker (PostgreSQL)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test connection
    console.log('🔌 Connecting to database...');
    const connTest = await db.testConnection();
    if (!connTest.success) {
      console.error('❌ Connection failed:', connTest.error);
      process.exit(1);
    }
    console.log('✅ Connected\n');

    // Find admin user
    console.log('🔍 Searching for admin user...\n');
    const admin = await db.get(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (!admin) {
      console.log('❌ No admin user found!\n');
      console.log('💡 To create one, run:');
      console.log('   node scripts/add-admin-user-pg.js\n');
      await db.close();
      return;
    }

    // Display admin details
    console.log('✅ Admin user found!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('USER DETAILS');
    console.log('═══════════════════════════════════════════════════');
    console.log('   ID:', admin.id);
    console.log('   Username:', admin.username);
    console.log('   Full Name:', admin.full_name);
    console.log('   Email:', admin.email);
    console.log('   Phone:', admin.phone);
    console.log('   Role:', admin.role);
    console.log('   Organization:', admin.organization);
    console.log('   Status:', admin.is_active ? '🟢 Active' : '🔴 Inactive');
    console.log('   Blockchain Identity:', admin.blockchain_identity || 'Not set');
    console.log('   Created:', admin.created_at);
    console.log('   Updated:', admin.updated_at);
    console.log('═══════════════════════════════════════════════════\n');

    // Check audit trail activity
    console.log('📊 Checking activity...');
    const auditCount = await db.get(
      `SELECT COUNT(*) as count 
       FROM audit_trail 
       WHERE performed_by = $1`,
      [admin.username]
    );

    console.log('═══════════════════════════════════════════════════');
    console.log('ACTIVITY SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log('   Audit Trail Entries:', auditCount.count || 0);
    console.log('═══════════════════════════════════════════════════\n');

    // Check recent audit entries
    if (auditCount.count > 0) {
      const recentAudit = await db.all(
        `SELECT entity_type, entity_id, action, performed_at 
         FROM audit_trail 
         WHERE performed_by = $1 
         ORDER BY performed_at DESC 
         LIMIT 5`,
        [admin.username]
      );

      console.log('📋 Recent Activities (Last 5):');
      console.log('═══════════════════════════════════════════════════');
      recentAudit.forEach((entry, i) => {
        console.log(`   ${i + 1}. ${entry.action} on ${entry.entity_type}`);
        console.log(`      Entity: ${entry.entity_id}`);
        console.log(`      Time: ${entry.performed_at}`);
        console.log('');
      });
    }

    // List all admin users
    const allAdmins = await db.all(
      `SELECT id, username, full_name, email, is_active 
       FROM users 
       WHERE role = 'ADMIN' 
       ORDER BY created_at`
    );

    console.log('═══════════════════════════════════════════════════');
    console.log(`ALL ADMIN USERS (${allAdmins.length})`);
    console.log('═══════════════════════════════════════════════════');
    allAdmins.forEach(u => {
      const status = u.is_active ? '🟢' : '🔴';
      console.log(`   ${status} ${u.username} - ${u.full_name}`);
      console.log(`      Email: ${u.email}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await db.close();
    console.log('🔌 Database connection closed\n');
  }
}

checkAdmin().catch(console.error);
