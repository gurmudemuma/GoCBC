// Test PostgreSQL Data Persistence
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function testPersistence() {
  try {
    console.log('\n=== Testing PostgreSQL Data Persistence ===\n');
    
    // Create a test user
    const testUsername = `test_user_${Date.now()}`;
    const testEmail = `${testUsername}@test.com`;
    
    console.log(`1. Creating test user: ${testUsername}`);
    const insertResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, organization, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email
    `, [testUsername, testEmail, 'test_hash', 'Test User', 'EXPORTER', 'Exporters', 'active']);
    
    console.log(`✅ User created with ID: ${insertResult.rows[0].id}`);
    
    // Count total users
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n2. Total users in database: ${countResult.rows[0].count}`);
    
    // List all users
    const usersResult = await pool.query(`
      SELECT id, username, email, role, organization, status 
      FROM users 
      ORDER BY id
    `);
    
    console.log('\n3. All users in database:');
    console.log('─'.repeat(100));
    usersResult.rows.forEach(user => {
      console.log(`ID: ${user.id} | ${user.username.padEnd(25)} | ${user.role.padEnd(15)} | ${user.organization || 'N/A'}`);
    });
    console.log('─'.repeat(100));
    
    console.log(`\n✅ Test complete! Created user ID ${insertResult.rows[0].id}`);
    console.log('   This user should persist even after system restart.');
    console.log('   Run this script again after restart to verify.\n');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  PostgreSQL is not running or connection refused.');
      console.error('   Please start PostgreSQL service.');
    }
  } finally {
    await pool.end();
  }
}

testPersistence();
