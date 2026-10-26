#!/usr/bin/env node
/**
 * Test parallel data loading performance
 * 
 * Tests fetching multiple API endpoints in parallel to verify
 * that data loading happens concurrently, not sequentially
 */

const http = require('http');

console.log('==========================================');
console.log('  PARALLEL DATA LOADING TEST');
console.log('==========================================\n');

const USERNAME = 'testexporter';
const PASSWORD = 'password123';
let authToken = null;

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1${path}`,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({ 
          path, 
          status: res.statusCode, 
          duration,
          size: data.length 
        });
      });
    });
    
    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({ path, error: err.message, duration });
    });
    
    req.setTimeout(120000, () => {
      req.destroy();
      resolve({ path, error: 'Timeout', duration: 120000 });
    });
    
    req.end();
  });
}

async function login() {
  const loginData = JSON.stringify({ username: USERNAME, password: PASSWORD });
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data?.token) {
            resolve(result.data.token);
          } else {
            reject(new Error('No token in response'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

async function runTest() {
  try {
    // Login first
    console.log('Logging in...');
    authToken = await login();
    console.log('✅ Login successful\n');
    
    // Test 1: Sequential loading (old way)
    console.log('TEST 1: Sequential Loading (OLD WAY)');
    console.log('─────────────────────────────────────────');
    const sequentialStart = Date.now();
    
    const result1 = await makeRequest('/contracts', authToken);
    console.log(`  ${result1.path.padEnd(25)} ${result1.duration}ms (${result1.status})`);
    
    const result2 = await makeRequest('/forex', authToken);
    console.log(`  ${result2.path.padEnd(25)} ${result2.duration}ms (${result2.status})`);
    
    const result3 = await makeRequest('/banking/lc', authToken);
    console.log(`  ${result3.path.padEnd(25)} ${result3.duration}ms (${result3.status})`);
    
    const result4 = await makeRequest('/shipments', authToken);
    console.log(`  ${result4.path.padEnd(25)} ${result4.duration}ms (${result4.status})`);
    
    const sequentialTotal = Date.now() - sequentialStart;
    console.log(`\n  Total: ${sequentialTotal}ms\n`);
    
    // Test 2: Parallel loading (new way)
    console.log('TEST 2: Parallel Loading (NEW WAY - Promise.all)');
    console.log('─────────────────────────────────────────');
    const parallelStart = Date.now();
    
    const results = await Promise.all([
      makeRequest('/contracts', authToken),
      makeRequest('/forex', authToken),
      makeRequest('/banking/lc', authToken),
      makeRequest('/shipments', authToken),
    ]);
    
    results.forEach(r => {
      console.log(`  ${r.path.padEnd(25)} ${r.duration}ms (${r.status})`);
    });
    
    const parallelTotal = Date.now() - parallelStart;
    console.log(`\n  Total: ${parallelTotal}ms\n`);
    
    // Results
    console.log('==========================================');
    console.log('  RESULTS');
    console.log('==========================================');
    console.log(`  Sequential: ${sequentialTotal}ms`);
    console.log(`  Parallel:   ${parallelTotal}ms`);
    console.log(`  Speedup:    ${(sequentialTotal / parallelTotal).toFixed(2)}x faster\n`);
    
    if (parallelTotal < sequentialTotal * 0.7) {
      console.log('✅ PARALLEL LOADING IS WORKING!');
      console.log('   Data is being fetched concurrently.\n');
    } else {
      console.log('⚠️  PARALLEL LOADING MAY NOT BE OPTIMAL');
      console.log('   Requests may be blocked or serialized.\n');
    }
    
    // Test 3: Fast PostgreSQL-only mode
    console.log('TEST 3: Fast Mode (PostgreSQL only, no blockchain)');
    console.log('─────────────────────────────────────────');
    const fastStart = Date.now();
    
    const fastResults = await Promise.all([
      makeRequest('/contracts', authToken),  // Now defaults to PostgreSQL only
      makeRequest('/forex', authToken),
      makeRequest('/banking/lc', authToken),
      makeRequest('/shipments', authToken),
    ]);
    
    fastResults.forEach(r => {
      console.log(`  ${r.path.padEnd(25)} ${r.duration}ms (${r.status})`);
    });
    
    const fastTotal = Date.now() - fastStart;
    console.log(`\n  Total: ${fastTotal}ms\n`);
    
    if (fastTotal < 1000) {
      console.log('✅ FAST MODE IS WORKING!');
      console.log('   Sub-second response time achieved.\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

runTest();
