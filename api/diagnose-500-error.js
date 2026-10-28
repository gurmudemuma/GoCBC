#!/usr/bin/env node
/**
 * Diagnostic script for 500 error on /api/v1/exporters/exporter-applications
 */

const { Pool } = require('pg');

async function diagnose() {
  console.log('🔍 Diagnosing 500 error on exporter-applications endpoint\n');

  // Step 1: Check PostgreSQL connection
  console.log('1️⃣ Testing PostgreSQL connection...');
  const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
  console.log(`   Connection string: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`   ✅ PostgreSQL connected! Server time: ${result.rows[0].current_time}`);
  } catch (error) {
    console.error(`   ❌ PostgreSQL connection FAILED:`, error.message);
    console.error(`\n🔧 Fix: Ensure PostgreSQL is running:`);
    console.error(`   sudo systemctl start postgresql`);
    console.error(`   or: docker-compose up -d postgres\n`);
    process.exit(1);
  }

  // Step 2: Check if exporter_applications table exists
  console.log('\n2️⃣ Checking if exporter_applications table exists...');
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'exporter_applications'
      ) as table_exists
    `);

    if (result.rows[0].table_exists) {
      console.log('   ✅ Table exporter_applications exists');
    } else {
      console.error('   ❌ Table exporter_applications DOES NOT EXIST');
      console.error('\n🔧 Fix: Run database migrations:');
      console.error('   cd /home/guda/GoCBC/api');
      console.error('   npm run migrate\n');
      process.exit(1);
    }
  } catch (error) {
    console.error(`   ❌ Error checking table:`, error.message);
    process.exit(1);
  }

  // Step 3: Check table schema
  console.log('\n3️⃣ Checking table schema...');
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exporter_applications'
      ORDER BY ordinal_position
    `);

    console.log('   Columns:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
    });
  } catch (error) {
    console.error(`   ⚠️ Could not read schema:`, error.message);
  }

  // Step 4: Test the actual query
  console.log('\n4️⃣ Testing the actual query from the endpoint...');
  try {
    const query = 'SELECT * FROM exporter_applications WHERE 1=1 ORDER BY submitted_date DESC';
    const result = await pool.query(query);
    console.log(`   ✅ Query succeeded! Found ${result.rows.length} applications`);
    
    if (result.rows.length > 0) {
      console.log(`\n   Sample application:`);
      const sample = result.rows[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Application ID: ${sample.application_id}`);
      console.log(`   - Company: ${sample.company_name}`);
      console.log(`   - Status: ${sample.status}`);
      console.log(`   - Submitted: ${sample.submitted_date}`);
    }
  } catch (error) {
    console.error(`   ❌ Query FAILED:`, error.message);
    console.error(`   Stack:`, error.stack);
    process.exit(1);
  }

  // Step 5: Check API server process
  console.log('\n5️⃣ Checking if API server is running...');
  const http = require('http');
  
  const checkEndpoint = (port) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/api/v1/health',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        resolve({ port, status: res.statusCode });
      });
      
      req.on('error', (err) => {
        reject({ port, error: err.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject({ port, error: 'timeout' });
      });
      
      req.end();
    });
  };

  try {
    const result = await checkEndpoint(3001);
    console.log(`   ✅ API server is running on port ${result.port} (HTTP ${result.status})`);
  } catch (error) {
    console.error(`   ❌ API server NOT responding on port 3001`);
    console.error(`\n🔧 Fix: Start the API server:`);
    console.error(`   cd /home/guda/GoCBC/api`);
    console.error(`   npm start\n`);
  }

  await pool.end();
  
  console.log('\n✅ Diagnosis complete! If all checks passed, the 500 error may be:');
  console.log('   - Authentication middleware issue (check if token is valid)');
  console.log('   - Different database being used by the API server');
  console.log('   - API server not restarted after code changes');
}

diagnose().catch(error => {
  console.error('\n💥 Diagnostic script failed:', error);
  process.exit(1);
});
