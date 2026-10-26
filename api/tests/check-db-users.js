// Check PostgreSQL Database Users
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function checkDatabase() {
  try {
    console.log('\n=== Checking PostgreSQL Database ===\n');
    
    // Count users
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total users in database: ${countResult.rows[0].count}\n`);
    
    // List all users
    const usersResult = await pool.query(`
      SELECT id, username, email, role, organization, status, created_at 
      FROM users 
      ORDER BY id
    `);
    
    console.log('All users:');
    console.log('─'.repeat(120));
    usersResult.rows.forEach(user => {
      console.log(`ID: ${user.id} | ${user.username.padEnd(20)} | ${user.email.padEnd(30)} | ${user.role.padEnd(15)} | ${user.organization || 'N/A'} | ${user.status}`);
    });
    console.log('─'.repeat(120));
    console.log('\n✅ Database check complete\n');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkDatabase();
