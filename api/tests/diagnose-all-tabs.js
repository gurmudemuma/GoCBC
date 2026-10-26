#!/usr/bin/env node

/**
 * COMPREHENSIVE DIAGNOSTICS - All BanksPortal Tabs
 * Checks why tabs are showing no data
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'cecbs-secret-key-change-in-production-use-at-least-32-characters';

// Generate a valid token
const token = jwt.sign(
  {
    sub: 'bank-diagnostics',
    username: 'bank_admin',
    role: 'BANKS',
    organization: 'BanksMSP',
    org: 'BanksMSP',
    permissions: ['banking:*', 'forex:*', 'swift:*', 'lc:*', 'payments:*']
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('🔍 BANKS PORTAL DIAGNOSTICS\n');
console.log('='.repeat(70));
console.log('JWT Token generated with secret:', JWT_SECRET.substring(0, 20) + '...');
console.log('='.repeat(70));
console.log('');

const endpoints = [
  { name: 'Payment Methods', url: '/banking/payment-methods', tab: 0 },
  { name: 'Forex Allocations', url: '/forex', tab: 1 },
  { name: 'SWIFT Messages', url: '/swift/messages', tab: 2 },
  { name: 'LCs for Examination', url: '/banking/lc', tab: 3 },
  { name: 'LCs for Payment Release', url: '/banking/lc', tab: 4 },
  { name: 'Analytics (Contracts)', url: '/contracts', tab: 5 },
  { name: 'Analytics (Shipments)', url: '/shipments', tab: 5 },
  { name: 'Analytics (Payments)', url: '/payments', tab: 5 },
  { name: 'Audit Trail', url: '/audit', tab: 6 },
  { name: 'LC Settlements', url: '/banking/lc/settlements', tab: 7 },
];

async function testEndpoint(endpoint) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint.url}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });

    const data = response.data;
    const count = data.count || data.data?.length || 0;
    const status = data.success ? '✅ OK' : '❌ FAIL';
    
    console.log(`${status} Tab ${endpoint.tab}: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Count: ${count}`);
    
    if (!data.success) {
      console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
    } else if (count === 0) {
      console.log(`   ⚠️  No data returned (check database/blockchain)`);
    }
    
    console.log('');
    
    return { endpoint: endpoint.name, success: data.success, count };
  } catch (error) {
    console.log(`❌ Tab ${endpoint.tab}: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error?.message || error.message}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`   Error: API server not running on ${API_BASE}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('');
    
    return { endpoint: endpoint.name, success: false, count: 0, error: error.message };
  }
}

async function checkDatabases() {
  console.log('\n' + '='.repeat(70));
  console.log('DATABASE CHECKS');
  console.log('='.repeat(70) + '\n');
  
  // Check CouchDB
  try {
    const couchResponse = await axios.get('http://admin:adminpw@localhost:5984/_all_dbs');
    console.log('✅ CouchDB: RUNNING');
    console.log(`   Databases: ${couchResponse.data.length}`);
    
    // Check SWIFT messages in CouchDB
    const swiftResponse = await axios.get('http://admin:adminpw@localhost:5984/coffeechannel_coffee/_all_docs', {
      params: { startkey: '"SWIFT_"', endkey: '"SWIFT_\ufff0"', limit: 1 }
    });
    console.log(`   SWIFT messages: ${swiftResponse.data.total_rows}`);
  } catch (error) {
    console.log('❌ CouchDB: NOT RUNNING or ERROR');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  
  // Check PostgreSQL
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'cecbs',
      user: 'cecbs',
      password: 'cecbs123',
    });
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL: RUNNING');
    console.log(`   Time: ${result.rows[0].now}`);
    
    // Check tables
    const tables = await pool.query(`
      SELECT 
        'sales_contracts' as table_name, COUNT(*) as count FROM sales_contracts
      UNION ALL
      SELECT 'letters_of_credit', COUNT(*) FROM letters_of_credit
      UNION ALL
      SELECT 'forex_allocations', COUNT(*) FROM forex_allocations
      UNION ALL
      SELECT 'shipments', COUNT(*) FROM shipments
      UNION ALL
      SELECT 'payments', COUNT(*) FROM payments
    `);
    
    console.log('   Data counts:');
    tables.rows.forEach(row => {
      console.log(`      ${row.table_name}: ${row.count}`);
    });
    
    await pool.end();
  } catch (error) {
    console.log('❌ PostgreSQL: NOT RUNNING or ERROR');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
}

async function runDiagnostics() {
  // Check databases first
  await checkDatabases();
  
  console.log('='.repeat(70));
  console.log('API ENDPOINT TESTS');
  console.log('='.repeat(70) + '\n');
  
  // Test all endpoints
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70) + '\n');
  
  const successful = results.filter(r => r.success);
  const withData = results.filter(r => r.success && r.count > 0);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`📊 With Data: ${withData.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n⚠️  Failed endpoints:');
    failed.forEach(r => console.log(`   - ${r.endpoint}: ${r.error || 'Unknown error'}`));
  }
  
  if (withData.length === 0 && successful.length > 0) {
    console.log('\n⚠️  All endpoints return successfully but NO DATA');
    console.log('   Possible causes:');
    console.log('   1. Blockchain network not running');
    console.log('   2. No data created yet in the system');
    console.log('   3. CouchDB empty or not synced');
    console.log('   4. PostgreSQL tables empty');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(70) + '\n');
  
  if (failed.length > 0) {
    console.log('1. Check if API server is running: netstat -ano | grep 3001');
    console.log('2. Check API logs: tail -f api/api.log');
    console.log('3. Verify JWT_SECRET matches between API and frontend');
    console.log('4. Check if user is properly authenticated in browser');
  }
  
  if (withData.length === 0) {
    console.log('5. Start blockchain network: cd blockchain && docker-compose up -d');
    console.log('6. Sync data: cd api && node sync-all-data-to-postgres.js');
    console.log('7. Check CouchDB has data: curl http://admin:adminpw@localhost:5984/coffeechannel_coffee/_all_docs?limit=10');
  }
  
  console.log('\n✅ Diagnostics complete!\n');
}

runDiagnostics()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  });
