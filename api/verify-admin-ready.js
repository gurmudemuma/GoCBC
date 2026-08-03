// Verification Script - Check if Admin User is Ready
// Run this from the api directory: node ../verify-admin-ready.js

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'cecbs.db');
const db = new sqlite3.Database(dbPath);

console.log('\n🔍 CECBS Admin User Verification\n');
console.log('='.repeat(60));

db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, user) => {
  if (err) {
    console.error('❌ Database error:', err);
    db.close();
    return;
  }

  if (!user) {
    console.error('❌ PROBLEM: Admin user does not exist!');
    console.log('\n💡 Solution: Run the following command:');
    console.log('   cd api && node scripts/add-admin-user.js');
    db.close();
    return;
  }

  console.log('✅ Admin user found in database\n');
  console.log('User Details:');
  console.log(`  • ID: ${user.id}`);
  console.log(`  • Username: ${user.username}`);
  console.log(`  • Email: ${user.email}`);
  console.log(`  • Full Name: ${user.full_name}`);
  console.log(`  • Role: ${user.role}`);
  console.log(`  • Organization: ${user.organization}`);
  console.log(`  • Status: ${user.status}`);
  console.log(`  • Created: ${user.created_at}`);

  // Verify password
  const testPassword = 'admin123';
  const passwordMatches = await bcrypt.compare(testPassword, user.password_hash);
  
  console.log('\n🔐 Password Verification:');
  if (passwordMatches) {
    console.log(`  ✅ Password "admin123" is CORRECT`);
  } else {
    console.log(`  ❌ Password "admin123" does NOT match`);
    console.log('  💡 You may need to reset the password');
  }

  // Check role
  console.log('\n👤 Role Verification:');
  if (user.role === 'ADMIN') {
    console.log('  ✅ Role is correctly set to "ADMIN"');
  } else {
    console.log(`  ❌ Role is "${user.role}" (should be "ADMIN")`);
  }

  // Check status
  console.log('\n🚦 Status Verification:');
  if (user.status === 'active') {
    console.log('  ✅ Status is "active"');
  } else {
    console.log(`  ⚠️  Status is "${user.status}" (should be "active")`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 SUMMARY:\n');
  
  if (passwordMatches && user.role === 'ADMIN' && user.status === 'active') {
    console.log('✅ Everything looks good! Admin user is ready to login.\n');
    console.log('Next Steps:');
    console.log('  1. Clear browser localStorage (visit: http://localhost:3001/clear-storage.html)');
    console.log('  2. Go to login page: http://localhost:3001/login');
    console.log('  3. Login with: admin / admin123');
    console.log('  4. You should be redirected to: http://localhost:3001/admin\n');
  } else {
    console.log('⚠️  Some issues found. Please review the details above.\n');
  }

  db.close();
});
