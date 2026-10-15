#!/usr/bin/env node

// Direct test of API and database
const { Pool } = require('pg');

async function testDatabase() {
  console.log('=== Testing PostgreSQL Connection ===');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123',
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✓ Database connected');
    
    // Test contracts query
    const result = await client.query(
      `SELECT * FROM contracts WHERE UPPER(exporter_id) = UPPER($1) ORDER BY created_at DESC`,
      ['exp001']
    );
    
    console.log(`✓ Found ${result.rows.length} contracts for exp001`);
    
    if (result.rows.length > 0) {
      console.log('\nSample contract:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    client.release();
    await pool.end();
    
    console.log('\n=== Database test PASSED ===');
    return true;
  } catch (error) {
    console.error('✗ Database test FAILED:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    return false;
  }
}

async function testAPI() {
  console.log('\n=== Testing API Endpoints ===');
  
  const http = require('http');
  
  // Test 1: Health endpoint
  console.log('\n1. Testing /health...');
  try {
    const healthResponse = await new Promise((resolve, reject) => {
      http.get('http://localhost:3001/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    });
    
    console.log(`✓ Health endpoint: ${healthResponse.status}`);
    console.log(`  Response: ${healthResponse.data}`);
  } catch (error) {
    console.error('✗ Health endpoint failed:', error.message);
    return false;
  }
  
  // Test 2: Login to get token
  console.log('\n2. Testing /api/v1/auth/login...');
  let token;
  try {
    const loginResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        username: 'exp001',
        password: 'password123'
      });
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    console.log(`✓ Login status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.data);
      token = loginData.token;
      console.log(`  Got token: ${token.substring(0, 30)}...`);
    } else {
      console.log(`  Response: ${loginResponse.data}`);
    }
  } catch (error) {
    console.error('✗ Login failed:', error.message);
  }
  
  // Test 3: Contracts endpoint
  if (token) {
    console.log('\n3. Testing /api/v1/exporters/contracts...');
    try {
      const contractsResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/v1/exporters/contracts',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        
        req.on('error', reject);
        req.end();
      });
      
      console.log(`✓ Contracts endpoint status: ${contractsResponse.status}`);
      
      if (contractsResponse.status === 200) {
        const contractsData = JSON.parse(contractsResponse.data);
        console.log(`  Found ${contractsData.data?.length || 0} contracts`);
        console.log(`  Source: ${contractsData.source}`);
      } else {
        console.log(`  Response: ${contractsResponse.data}`);
      }
    } catch (error) {
      console.error('✗ Contracts endpoint failed:', error.message);
    }
  }
  
  console.log('\n=== API test complete ===');
  return true;
}

// Run tests
(async () => {
  await testDatabase();
  await testAPI();
  process.exit(0);
})();
