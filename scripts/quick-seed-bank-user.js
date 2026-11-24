#!/usr/bin/env node
// Quick seed for bank_admin user with correct password

const path = require('path');
const { Client } = require(path.join(__dirname, '../api/node_modules/pg'));
const bcrypt = require(path.join(__dirname, '../api/node_modules/bcrypt'));

// Use the same connection config from docker-compose
const connectionConfig = {
  host: 'localhost',
  port: 5432,
  database: 'cecbs_db',
  user: 'cecbs_user',
  password: 'cecbs2024secure',
};

async function seedBankUser() {
  const client = new Client(connectionConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Generate password hash for "password123"
    console.log('🔐 Generating password hash...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    console.log('👤 Creating/updating bank_admin user...');

    // Create or update bank_admin
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash,
          active = true
    `, ['bank_admin', passwordHash, 'admin@cbe.com.et', 'CBE Administrator', 'BANKS', 'BANKS', true]);
    
    console.log('✅ Created/Updated: bank_admin / password123');

    // Also create ecta_admin if needed
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash,
          active = true
    `, ['ecta_admin', passwordHash, 'admin@ecta.gov.et', 'ECTA Administrator', 'ECTA', 'ECTA', true]);
    
    console.log('✅ Created/Updated: ecta_admin / password123');

    // Verify
    const result = await client.query(`
      SELECT username, role, organization, active 
      FROM users 
      WHERE username IN ('bank_admin', 'ecta_admin')
      ORDER BY username
    `);
    
    console.log('\n📋 Users:');
    console.table(result.rows);

    console.log('\n✅ User seeding complete!');
    console.log('\n🔑 Login Credentials:');
    console.log('   Bank:   bank_admin / password123');
    console.log('   ECTA:   ecta_admin / password123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

seedBankUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
