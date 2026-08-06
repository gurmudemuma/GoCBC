// Create a test user for login testing
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cecbs_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function createTestUser() {
  try {
    // Get role from command line argument
    const args = process.argv.slice(2);
    const role = args[0] || 'Quality Inspector';
    
    console.log(`\n=== Creating Test User with Role: ${role} ===\n`);
    
    // Define user details based on role
    const userMappings = {
      'Quality Inspector': { username: 'quality', email: 'quality@cecbs.com', org: 'ECTA', fullName: 'Quality Inspector Test' },
      'Lab Analyst': { username: 'lab', email: 'lab@cecbs.com', org: 'ECTA', fullName: 'Lab Analyst Test' },
      'License Officer': { username: 'license', email: 'license@cecbs.com', org: 'ECTA', fullName: 'License Officer Test' },
      'Forex Officer': { username: 'forex', email: 'forex@cecbs.com', org: 'NBE', fullName: 'Forex Officer Test' },
      'Grading Officer': { username: 'grading', email: 'grading@cecbs.com', org: 'ECX', fullName: 'Grading Officer Test' },
      'LC Officer': { username: 'lc', email: 'lc@cecbs.com', org: 'BANKS', fullName: 'LC Officer Test' },
      'Customs Officer': { username: 'customs', email: 'customs@cecbs.com', org: 'CUSTOMS', fullName: 'Customs Officer Test' },
      'Logistics Officer': { username: 'logistics', email: 'logistics@cecbs.com', org: 'SHIPPING', fullName: 'Logistics Officer Test' },
      'ADMIN': { username: 'admin', email: 'admin@cecbs.com', org: 'CECBS', fullName: 'Super Administrator' },
    };
    
    const userDetails = userMappings[role] || userMappings['Quality Inspector'];
    
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id, username, status FROM users WHERE username = $1',
      [userDetails.username]
    );
    
    if (existing.rows.length > 0) {
      console.log(`⚠️  User "${userDetails.username}" already exists (status: ${existing.rows[0].status})`);
      console.log(`\nTo reset password, run: node api/reset-password.js ${userDetails.username}\n`);
      return;
    }
    
    // Hash password
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await pool.query(`
      INSERT INTO users (
        username, 
        email, 
        password_hash, 
        full_name, 
        role, 
        organization, 
        status,
        permissions,
        phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username, email, role, organization, status
    `, [
      userDetails.username,
      userDetails.email,
      passwordHash,
      userDetails.fullName,
      role,
      userDetails.org,
      'active',
      JSON.stringify([]),
      '+251-911-000-000'
    ]);
    
    const user = result.rows[0];
    
    console.log('✅ Test user created successfully!\n');
    console.log('User Details:');
    console.log('─'.repeat(60));
    console.log(`Username:     ${user.username}`);
    console.log(`Password:     ${password}`);
    console.log(`Email:        ${user.email}`);
    console.log(`Role:         ${user.role}`);
    console.log(`Organization: ${user.organization}`);
    console.log(`Status:       ${user.status}`);
    console.log(`ID:           ${user.id}`);
    console.log('─'.repeat(60));
    
    console.log('\n✅ You can now login at: http://localhost:3000/login');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${password}\n`);
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    
    if (error.code === '23505') {
      console.error('\n⚠️  User already exists. Use reset-password.js to reset password.\n');
    }
  } finally {
    await pool.end();
  }
}

// Show usage if no arguments
if (process.argv.length < 3) {
  console.log('\nUsage: node api/create-test-user.js <role>\n');
  console.log('Available roles:');
  console.log('  - "Quality Inspector"');
  console.log('  - "Lab Analyst"');
  console.log('  - "License Officer"');
  console.log('  - "Forex Officer"');
  console.log('  - "Grading Officer"');
  console.log('  - "LC Officer"');
  console.log('  - "Customs Officer"');
  console.log('  - "Logistics Officer"');
  console.log('  - "ADMIN"\n');
  console.log('Example: node api/create-test-user.js "Quality Inspector"\n');
}

createTestUser();
