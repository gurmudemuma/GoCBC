// Check existing users in the database
const { Pool } = require('pg');
require('dotenv').config();

// Parse DATABASE_URL or use individual variables
let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cecbs_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  };
}

const pool = new Pool(poolConfig);

async function checkUsers() {
  try {
    console.log('\n=== Checking Existing Users ===\n');
    
    const result = await pool.query(`
      SELECT 
        id, 
        username, 
        email, 
        full_name, 
        role, 
        organization, 
        status,
        created_at
      FROM users
      ORDER BY role, username
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database!\n');
      console.log('Run the following script to create test users:');
      console.log('  node api/create-test-users.js\n');
    } else {
      console.log(`✅ Found ${result.rows.length} users:\n`);
      
      // Group by role
      const usersByRole = {};
      result.rows.forEach(user => {
        if (!usersByRole[user.role]) {
          usersByRole[user.role] = [];
        }
        usersByRole[user.role].push(user);
      });
      
      // Display by role
      Object.keys(usersByRole).sort().forEach(role => {
        console.log(`\n${role}:`);
        console.log('─'.repeat(80));
        usersByRole[role].forEach(user => {
          const statusIcon = user.status === 'active' ? '✅' : 
                            user.status === 'pending' ? '⏳' : 
                            user.status === 'rejected' ? '❌' : '❓';
          console.log(`${statusIcon} ${user.username.padEnd(25)} | ${user.email.padEnd(35)} | ${user.status}`);
          console.log(`   ${user.full_name} (ID: ${user.id})`);
        });
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('\nTo test login, use any username above with password: password123\n');
      console.log('If login fails, run: node api/reset-password.js <username>\n');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    console.error('\nMake sure:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database "cecbs_db" exists');
    console.error('3. .env file has correct DB credentials');
  } finally {
    await pool.end();
  }
}

checkUsers();
