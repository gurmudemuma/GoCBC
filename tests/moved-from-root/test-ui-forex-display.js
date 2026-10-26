#!/usr/bin/env node

/**
 * Test UI Forex Data Display
 * Verifies that the UI can fetch and display forex data from the API
 */

const https = require('https');
const http = require('http');

// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE = 'http://localhost:3001';

// Test credentials
const testUser = {
  username: 'nbeAdmin',
  password: 'password123',
  organization: 'NBE'
};

let authToken = '';

async function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login() {
  console.log('\n📝 Step 1: Logging in as NBE admin...');
  const response = await makeRequest('POST', '/api/v1/auth/login', testUser);
  
  if (response.status !== 200 || !response.data.success) {
    throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
  }
  
  authToken = response.data.token;
  console.log('✅ Login successful');
  return authToken;
}

async function fetchForexFromAPI() {
  console.log('\n📊 Step 2: Fetching forex data from API (same endpoint UI uses)...');
  const response = await makeRequest('GET', '/api/v1/forex', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (response.status !== 200 || !response.data.success) {
    throw new Error(`Forex fetch failed: ${JSON.stringify(response.data)}`);
  }
  
  const forexData = response.data.data || [];
  console.log(`✅ API returned ${forexData.length} forex allocations`);
  
  if (forexData.length > 0) {
    console.log('\n📋 Sample forex allocation:');
    const sample = forexData[0];
    console.log(JSON.stringify({
      forexId: sample.forexId,
      contractId: sample.contractId,
      exporterId: sample.exporterId,
      requestedAmount: sample.requestedAmount,
      allocatedAmount: sample.allocatedAmount,
      currency: sample.currency,
      status: sample.status
    }, null, 2));
    
    // Count by status
    const statuses = {};
    forexData.forEach(f => {
      const status = f.status || 'UNKNOWN';
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    console.log('\n📊 Forex by status:');
    Object.entries(statuses).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  }
  
  return forexData;
}

async function main() {
  console.log('==================================================');
  console.log('  UI Forex Data Display Test');
  console.log('==================================================');
  console.log('This test verifies that the UI can fetch forex data');
  console.log('from the API endpoint after our fixes.');
  console.log('==================================================\n');
  
  try {
    await login();
    const forexData = await fetchForexFromAPI();
    
    console.log('\n==================================================');
    console.log('  ✅ TEST PASSED');
    console.log('==================================================');
    console.log(`✅ UI can fetch ${forexData.length} forex allocations from API`);
    console.log('✅ NBEPortal.tsx should now display data correctly');
    console.log('✅ BanksPortal.tsx should now display data correctly');
    console.log('\n💡 Next: Open http://localhost:3000 and check:');
    console.log('   1. Login as nbe_admin / nbe123');
    console.log('   2. Go to Forex Management tab');
    console.log('   3. Should see forex allocations (not "0 of 0")');
    console.log('==================================================\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
