#!/usr/bin/env node
// Seed test users for CECBS

const path = require('path');
const { Client } = require(path.join(__dirname, '../api/node_modules/pg'));
const bcrypt = require(path.join(__dirname, '../api/node_modules/bcrypt'));

const connectionConfig = {
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123',
};

async function seedUsers() {
  const client = new Client(connectionConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Generate password hashes
    console.log('🔐 Generating password hashes...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const passwordHash = await bcrypt.hash('password123', 10);
    
    console.log('👤 Creating users...');

    // 1. System Admin (password: admin123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash,
          email = EXCLUDED.email,
          organization = EXCLUDED.organization,
          role = EXCLUDED.role,
          status = EXCLUDED.status
    `, ['admin', adminHash, 'admin@cecbs.et', 'System Administrator', 'ADMIN', 'ADMIN', 'active']);
    console.log('✅ Created: admin / admin123');

    // 2. ECTA Admin (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['ecta_admin', passwordHash, 'admin@ecta.gov.et', 'ECTA Administrator', 'ECTA', 'ECTA', 'active']);
    console.log('✅ Created: ecta_admin / password123');

    // 3. ECX Admin (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['ecx_admin', passwordHash, 'admin@ecx.com.et', 'ECX Administrator', 'ECX', 'ECX', 'active']);
    console.log('✅ Created: ecx_admin / password123');

    // 4. NBE Admin (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['nbe_admin', passwordHash, 'admin@nbe.gov.et', 'NBE Administrator', 'NBE', 'NBE', 'active']);
    console.log('✅ Created: nbe_admin / password123');

    // 5. Bank Admin (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['bank_admin', passwordHash, 'admin@cbe.com.et', 'CBE Administrator', 'BANKS', 'BANKS', 'active']);
    console.log('✅ Created: bank_admin / password123');

    // 6. Customs Admin (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['customs_admin', passwordHash, 'admin@customs.gov.et', 'Customs Administrator', 'CUSTOMS', 'CUSTOMS', 'active']);
    console.log('✅ Created: customs_admin / password123');

    // 7. Shipping Admin (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['shipping_admin', passwordHash, 'admin@shipping.com.et', 'Shipping Administrator', 'SHIPPING', 'SHIPPING', 'active']);
    console.log('✅ Created: shipping_admin / password123');

    // 8. Test Exporter (password: password123)
    await client.query(`
      INSERT INTO users (username, password_hash, email, full_name, phone, organization, role, exporter_id, ecta_license, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash
    `, ['exporter1', passwordHash, 'exporter@test.com', 'Test Exporter Company', '+251911234567', 'EXPORTER', 'EXPORTER', 'EXP001', 'LIC001', 'active']);
    console.log('✅ Created: exporter1 / password123');

    // Verify users created
    const result = await client.query('SELECT username, role, organization, status FROM users ORDER BY username');
    console.log('\n📋 All Users:');
    console.table(result.rows);

    console.log('\n✅ User seeding complete!');
    console.log('\n🔑 Login Credentials:');
    console.log('   System Admin:  admin / admin123');
    console.log('   ECTA:          ecta_admin / password123');
    console.log('   ECX:           ecx_admin / password123');
    console.log('   NBE:           nbe_admin / password123');
    console.log('   Bank:          bank_admin / password123');
    console.log('   Customs:       customs_admin / password123');
    console.log('   Shipping:      shipping_admin / password123');
    console.log('   Exporter:      exporter1 / password123');

  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

seedUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
