#!/usr/bin/env node
/**
 * Test ALL API endpoints to verify data fetching
 * Run this to check if all data sources are accessible
 */

const axios = require('axios');
const API_BASE = 'http://localhost:3001/api/v1';

// Test user credentials (adjust if needed)
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    if (response.data.success && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Login successful\n');
      return true;
    }
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    return false;
  }
}

async function testEndpoint(name, url, expectArray = true) {
  try {
    const response = await axios.get(`${API_BASE}${url}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000
    });

    if (response.data.success) {
      const data = response.data.data;
      const count = Array.isArray(data) ? data.length : (typeof data === 'object' ? 1 : 0);
      const icon = count > 0 ? '✅' : '⚪';
      console.log(`${icon} ${name.padEnd(30)} ${count} records`);
      return { success: true, count };
    } else {
      console.log(`❌ ${name.padEnd(30)} API returned error: ${response.data.error?.message || 'Unknown'}`);
      return { success: false, count: 0 };
    }
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`⚠️  ${name.padEnd(30)} Endpoint not found`);
    } else if (err.code === 'ECONNREFUSED') {
      console.log(`❌ ${name.padEnd(30)} API server not running`);
    } else {
      console.log(`❌ ${name.padEnd(30)} Error: ${err.message}`);
    }
    return { success: false, count: 0 };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   CECBS API ENDPOINTS - COMPLETE DATA TEST       ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('POSTGRESQL DATA ENDPOINTS');
  console.log('═══════════════════════════════════════════════════\n');

  await testEndpoint('Users', '/users');
  await testEndpoint('Exporter Applications', '/exporters/exporter-applications');
  await testEndpoint('Payments', '/payments');

  console.log('\n═══════════════════════════════════════════════════');
  console.log('BLOCKCHAIN DATA ENDPOINTS');
  console.log('═══════════════════════════════════════════════════\n');

  await testEndpoint('Contracts', '/contracts');
  await testEndpoint('Shipments', '/shipments');
  await testEndpoint('SWIFT Messages', '/swift/messages');
  await testEndpoint('Letters of Credit', '/banking/lcs');
  await testEndpoint('Forex Allocations', '/forex');
  await testEndpoint('Exchange Rates', '/forex/rates');
  await testEndpoint('Audit Trail', '/audit/entity/CONTRACT/CONTRACT1786343272751');

  console.log('\n═══════════════════════════════════════════════════');
  console.log('STATISTICS ENDPOINTS');
  console.log('═══════════════════════════════════════════════════\n');

  await testEndpoint('Audit Statistics', '/audit/portal/stats', false);
  await testEndpoint('SWIFT Statistics', '/swift/statistics', false);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('✅ = Data available and fetched successfully');
  console.log('⚪ = Endpoint working but no data exists');
  console.log('⚠️  = Endpoint not found (might not be implemented)');
  console.log('❌ = Error accessing endpoint\n');

  console.log('💡 TIP: If you see ⚪ for SWIFT Messages, it means the');
  console.log('   blockchain is working but no SWIFT messages have been');
  console.log('   created yet. This is normal for a fresh system.\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
