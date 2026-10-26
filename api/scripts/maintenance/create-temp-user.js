// Create temporary user for applicant_wabe626_26
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');

(async () => {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Generate password hash
    const password = 'TempPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert or update user
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, organization, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      ON CONFLICT (username) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name
    `, [
      'applicant_wabe626_26',
      'wabe626@gmail.com',
      hashedPassword,
      'Jimma Buna exporter',
      'EXPORTER',
      'EXPORTER',
      'inactive'
    ]);
    
    console.log('✅ User created successfully!');
    console.log('');
    console.log('Login Credentials:');
    console.log('==================');
    console.log('Username: applicant_wabe626_26');
    console.log('Password: TempPassword123');
    console.log('');
    console.log('You can now login at http://localhost:3000/login');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
