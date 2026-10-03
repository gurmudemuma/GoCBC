#!/bin/bash
# Fix login issue by creating test users

set -e

echo "========================================="
echo "CECBS - Login Fix Script"
echo "========================================="
echo ""

echo "Step 1: Creating users with bcrypt hashes..."

# Use the API's bcrypt module to generate hashes and insert users
cd /home/guda/GoCBC/api

node << 'EOFNODE'
const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Generate hashes
    const adminHash = await bcrypt.hash('admin123', 10);
    const passHash = await bcrypt.hash('password123', 10);

    // Insert admin
    await client.query(`
      INSERT INTO users (username, password, email, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password = EXCLUDED.password, role = EXCLUDED.role, status = EXCLUDED.status
    `, ['admin', adminHash, 'admin@cecbs.et', 'ADMIN', 'ADMIN', 'active']);
    console.log('✅ Created user: admin / admin123');

    // Insert exporter
    await client.query(`
      INSERT INTO users (username, password, email, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password = EXCLUDED.password
    `, ['exporter1', passHash, 'exporter@test.com', 'EXPORTER', 'EXPORTER', 'active']);
    console.log('✅ Created user: exporter1 / password123');

    // Insert ECTA admin
    await client.query(`
      INSERT INTO users (username, password, email, organization, role, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password = EXCLUDED.password
    `, ['ecta_admin', passHash, 'admin@ecta.gov.et', 'ECTA', 'ECTA', 'active']);
    console.log('✅ Created user: ecta_admin / password123');

    // Verify
    const result = await client.query('SELECT username, role, organization, status FROM users ORDER BY username');
    console.log('\n📋 Total users created:', result.rows.length);
    result.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.role}/${row.organization}) [${row.status}]`);
    });

    await client.end();
    console.log('\n✅ Success! Users created.');
    console.log('\n🔑 Test Credentials:');
    console.log('   admin / admin123');
    console.log('   exporter1 / password123');
    console.log('   ecta_admin / password123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
EOFNODE

echo ""
echo "Step 2: Testing login endpoint..."
sleep 2

# Test login
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Login test PASSED!"
  echo "   Token received successfully"
else
  echo "❌ Login test FAILED"
  echo "   Response: $RESPONSE"
  exit 1
fi

echo ""
echo "========================================="
echo "✅ Login system is now operational!"
echo "========================================="
echo ""
echo "You can now log in to http://localhost:3000 with:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
