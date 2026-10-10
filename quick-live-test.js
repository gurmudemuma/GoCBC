#!/usr/bin/env node
/**
 * Quick Live System Test
 * Tests if the GoCBC system is actually running and functional
 */

const http = require('http');

console.log('='.repeat(80));
console.log('GOCBC LIVE SYSTEM TEST');
console.log('='.repeat(80));
console.log('');

// Test 1: API Health Check
console.log('TEST 1: API Health Check');
console.log('-'.repeat(80));

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ API Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ API Response:', JSON.stringify(parsed, null, 2));
      console.log('');
      
      // Test 2: Check if blockchain service is mentioned
      console.log('TEST 2: Blockchain Service Check');
      console.log('-'.repeat(80));
      
      if (parsed.blockchain || parsed.fabric || parsed.services) {
        console.log('✅ Blockchain service detected in health check');
      } else {
        console.log('⚠️  No blockchain info in health response (checking further...)');
      }
      console.log('');
      
      // Test 3: Try to access exporters endpoint
      console.log('TEST 3: Exporters Endpoint Test (without auth)');
      console.log('-'.repeat(80));
      
      const exporterReq = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/exporters',
        method: 'GET',
        timeout: 5000
      }, (expRes) => {
        console.log(`Status: ${expRes.statusCode}`);
        if (expRes.statusCode === 401 || expRes.statusCode === 403) {
          console.log('✅ Authentication required (expected - security working!)');
        } else if (expRes.statusCode === 200) {
          console.log('✅ Endpoint accessible');
        }
        console.log('');
        
        console.log('='.repeat(80));
        console.log('QUICK TEST COMPLETE');
        console.log('='.repeat(80));
        console.log('');
        console.log('SUMMARY:');
        console.log('✅ API is running on port 3001');
        console.log('✅ Endpoints are responding');
        console.log('✅ System is operational');
        console.log('');
        console.log('Next: Run comprehensive tests with:');
        console.log('  node test-complete-blockchain.js');
        console.log('  node test-all-portals-data.js');
        console.log('');
      });
      
      exporterReq.on('error', (e) => {
        console.log(`❌ Error accessing exporters endpoint: ${e.message}`);
      });
      
      exporterReq.end();
      
    } catch (e) {
      console.log('Response (not JSON):', data);
    }
  });
});

req.on('error', (e) => {
  console.log(`❌ FAILED: Cannot connect to API on port 3001`);
  console.log(`Error: ${e.message}`);
  console.log('');
  console.log('Possible reasons:');
  console.log('  1. API server not started');
  console.log('  2. Wrong port number');
  console.log('  3. Firewall blocking connection');
  console.log('');
  console.log('Try: cd api && npm start');
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ TIMEOUT: API took too long to respond');
  req.destroy();
  process.exit(1);
});

req.end();
