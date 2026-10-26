// Script to check and fix admin user role in database

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'api', 'node_modules', 'sqlite3')).verbose();

const dbPath = path.join(__dirname, '..', 'api', 'cecbs.db');

console.log('📁 Database path:', dbPath);
console.log('🔄 Checking admin user...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
});

// Check admin user details
db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
  if (err) {
    console.error('❌ Error querying admin user:', err);
    db.close();
    return;
  }

  if (!row) {
    console.error('❌ Admin user not found!');
    db.close();
    return;
  }

  console.log('👤 Current Admin User Data:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ID:', row.id);
  console.log('Username:', row.username);
  console.log('Email:', row.email);
  console.log('Full Name:', row.full_name);
  console.log('Role:', row.role, row.role === 'ADMIN' ? '✅' : '❌ WRONG!');
  console.log('Organization:', row.organization);
  console.log('Status:', row.status);
  console.log('Permissions:', row.permissions);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Fix if role is not ADMIN
  if (row.role !== 'ADMIN') {
    console.log('⚠️  Role is not ADMIN! Fixing...');
    
    db.run(
      `UPDATE users SET role = 'ADMIN', organization = 'CECBS System' WHERE username = 'admin'`,
      (err) => {
        if (err) {
          console.error('❌ Failed to update admin role:', err);
        } else {
          console.log('✅ Admin role fixed to ADMIN\n');
        }
        db.close();
      }
    );
  } else {
    console.log('✅ Admin role is correct (ADMIN)\n');
    console.log('🔍 The issue must be in the frontend routing logic.');
    console.log('📝 Check these files:');
    console.log('   - ui/src/contexts/AuthContext.tsx (login function)');
    console.log('   - ui/src/pages/index.tsx (role routing)');
    db.close();
  }
});
