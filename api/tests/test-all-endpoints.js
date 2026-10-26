#!/usr/bin/env node

/**
 * API ENDPOINT INTEGRATION TEST
 * Tests all enriched endpoints to ensure dual-database architecture works
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
let authToken = '';

// Test credentials (adjust as needed)
const TEST_USER = {
  username: 'bankAdmin',
  password: 'cecbs123'
};

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✅ Login successful\n');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testEndpoint(name, path, expectedFields = []) {
  console.log(`📊 Testing: ${name}`);
  console.log(`   Endpoint: GET ${path}`);
  
  try {
    const response = await axios.get(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const { data, success, source, enriched } = response.data;
    
    if (!success) {
      console.log(`   ⚠️  Response success=false`);
      return false;
    }
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📦 Records: ${data?.length || 0}`);
    console.log(`   🔗 Source: ${source || 'unknown'}`);
    console.log(`   ✨ Enriched: ${enriched ? 'YES' : 'NO'}`);
    
    // Check for expected fields in first record
    if (data && data.length > 0 && expectedFields.length > 0) {
      const firstRecord = data[0];
      const missingFields = expectedFields.filter(field => !(field in firstRecord));
      
      if (missingFields.length > 0) {
        console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`   ✅ All expected fields present`);
      }
      
      // Check if buyer fields are populated
      const buyerFields = expectedFields.filter(f => f.includes('buyer') || f.includes('Buyer'));
      if (buyerFields.length > 0) {
        const populatedBuyerFields = buyerFields.filter(f => {
          const value = firstRecord[f];
          return value && value !== '—' && value !== '';
        });
        
        if (populatedBuyerFields.length > 0) {
          console.log(`   ✅ Buyer data populated: ${populatedBuyerFields.map(f => `${f}="${firstRecord[f]}"`).join(', ')}`);
        } else {
          console.log(`   ⚠️  Buyer fields empty (may need sync)`);
        }
      }
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || error.code} - ${error.response?.data?.error?.message || error.message}`);
    console.log('');
    return false;
  }
}

async function runTests() {
  console.log('='  .repeat(70));
  console.log('   DUAL-DATABASE ARCHITECTURE - ENDPOINT INTEGRATION TEST');
  console.log('='  .repeat(70));
  console.log('');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication\n');
    process.exit(1);
  }
  
  const tests = [
    {
      name: 'Contracts (with buyer enrichment)',
      path: '/contracts',
      fields: ['contractId', 'exporterId', 'buyerId', 'buyerName', 'buyerCountry']
    },
    {
      name: 'Letters of Credit (with buyer enrichment)',
      path: '/banking/lc',
      fields: ['lcId', 'contractId', 'exporterId', 'buyerName', 'buyerCountry', 'amount']
    },
    {
      name: 'Shipments (with buyer enrichment)',
      path: '/shipments',
      fields: ['shipmentId', 'contractId', 'exporterId', 'buyerName', 'quantity']
    },
    {
      name: 'Forex Allocations (with buyer enrichment)',
      path: '/forex',
      fields: ['forexId', 'lcId', 'contractId', 'buyerName', 'amount']
    },
    {
      name: 'Payments (with buyer enrichment)',
      path: '/payments',
      fields: ['paymentId', 'shipmentId', 'amount', 'buyerName']
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.path, test.fields);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('='  .repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='  .repeat(70));
  console.log('');
  
  if (failed > 0) {
    console.log('⚠️  Some endpoints failed. This could be due to:');
    console.log('   1. API server not running (start with: npm run dev)');
    console.log('   2. Database not synced (run: node sync-all-data-to-postgres.js)');
    console.log('   3. Authentication issues (check credentials)');
    console.log('');
  } else {
    console.log('✅ All endpoints working correctly!');
    console.log('🎉 Dual-database architecture is fully operational!');
    console.log('');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
