#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });

async function applyFixAndVerify() {
  console.log('='.repeat(60));
  console.log('User Management 500 Error - Applying Fix');
  console.log('='.repeat(60));
  console.log('');

  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  const pool = new Pool({ connectionString });

  try {
    // Step 1: Connect to database
    console.log('Step 1: Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected successfully\n');

    // Step 2: Check current schema
    console.log('Step 2: Checking current users table schema...');
    const beforeColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' 
      ORDER BY ordinal_position;
    `);
    console.log(`Current columns (${beforeColumns.rows.length}):`);
    beforeColumns.rows.forEach(row => console.log(`  - ${row.column_name}`));
    console.log('');

    // Step 3: Apply migration
    console.log('Step 3: Applying schema migration...');
    const migrationPath = path.join(__dirname, 'api', 'src', 'migrations', '018_update_users_table_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Migration applied successfully\n');

    // Step 4: Verify updated schema
    console.log('Step 4: Verifying updated schema...');
    const afterColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name='users' 
      ORDER BY ordinal_position;
    `);
    console.log(`Updated columns (${afterColumns.rows.length}):`);
    afterColumns.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${row.column_name.padEnd(25)} ${row.data_type.padEnd(30)} ${nullable}`);
    });
    console.log('');

    // Step 5: Test the problematic query
    console.log('Step 5: Testing the API query...');
    const testQuery = `
      SELECT id, username, email, full_name, role, organization, 
             exporter_id, status, created_at, last_login 
      FROM users 
      LIMIT 3;
    `;
    
    const testResult = await client.query(testQuery);
    console.log(`✅ Query successful! Found ${testResult.rows.length} users:`);
    testResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) - ${user.full_name || 'No name'} - ${user.email}`);
    });
    console.log('');

    // Step 6: Verify all required columns exist
    console.log('Step 6: Checking for all required columns...');
    const requiredColumns = [
      'id', 'username', 'password_hash', 'email', 'full_name', 
      'role', 'organization', 'exporter_id', 'ecta_license', 
      'phone', 'permissions', 'status', 'last_login', 'created_at', 'updated_at'
    ];

    const existingColumns = afterColumns.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('⚠️  WARNING: Some required columns are still missing:');
      missingColumns.forEach(col => console.log(`  ❌ ${col}`));
      console.log('');
    } else {
      console.log('✅ All required columns are present!\n');
    }

    client.release();

    // Step 7: Restart API
    console.log('Step 7: Attempting to restart API service...');
    try {
      // Try docker-compose restart
      try {
        execSync('docker-compose restart api', { 
          cwd: __dirname,
          stdio: 'pipe',
          timeout: 30000
        });
        console.log('✅ API service restarted via docker-compose\n');
      } catch (e1) {
        // Try docker restart
        try {
          execSync('docker restart cecbs-api', { 
            stdio: 'pipe',
            timeout: 30000
          });
          console.log('✅ API service restarted via docker\n');
        } catch (e2) {
          console.log('⚠️  Could not automatically restart API service');
          console.log('   Please manually restart with:');
          console.log('   - docker-compose restart api');
          console.log('   - OR: docker restart cecbs-api');
          console.log('   - OR: cd api && npm run dev\n');
        }
      }
    } catch (error) {
      console.log('⚠️  API restart skipped (please restart manually)\n');
    }

    console.log('='.repeat(60));
    console.log('✅ FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Ensure API server is running');
    console.log('2. Navigate to User Management page');
    console.log('3. The page should now load without 500 errors');
    console.log('');
    console.log('If issues persist, check API logs:');
    console.log('  docker logs cecbs-api --tail=50');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR OCCURRED:');
    console.error('='.repeat(60));
    console.error('Message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('Cannot connect to PostgreSQL database.');
      console.error('Please check:');
      console.error('1. PostgreSQL is running: docker ps | grep postgres');
      console.error('2. DATABASE_URL in api/.env is correct');
      console.error('3. Database credentials are valid');
    } else if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('');
      console.error('A column is missing from the database.');
      console.error('The migration may not have been fully applied.');
      console.error('Try running the migration manually:');
      console.error('  docker exec -i cecbs-postgres psql -U cecbs -d cecbs < api/src/migrations/018_update_users_table_schema.sql');
    }
    
    console.error('');
    console.error('Full error:');
    console.error(error);
    console.error('');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyFixAndVerify().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
