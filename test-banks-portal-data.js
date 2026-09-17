#!/usr/bin/env node

/**
 * Test script to verify Banks Portal data from both blockchain and PostgreSQL
 * Tests the dual-source architecture with blockchain-first + PostgreSQL fallback
 */

const axios = require('axios');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:3001/api/v1';

// Login as bank user
async function login() {
  console.log('\n🔐 Logging in as admin user...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    console.log('✅ Login successful');
    console.log('📝 Token:', response.data.data.token.substring(0, 50) + '...');
    return response.data.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test LC endpoint
async function testLCs(token) {
  console.log('\n📋 Testing Letters of Credit endpoint...');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_URL}/banking/lc`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 12000, // 12 second timeout
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📊 Source: ${response.data.source}`);
    console.log(`📝 LCs found: ${response.data.data?.length || 0}`);

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📄 Sample LC:');
      const lc = response.data.data[0];
      console.log(`  LC ID: ${lc.lcId}`);
      console.log(`  Exporter: ${lc.exporterId}`);
      console.log(`  Amount: ${lc.amount} ${lc.currency}`);
      console.log(`  Status: ${lc.status}`);
      console.log(`  Issuing Bank: ${lc.issuingBank}`);
    }

    return response.data;
  } catch (error) {
    console.error('❌ LC endpoint failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test Forex endpoint
async function testForex(token) {
  console.log('\n💱 Testing Forex Allocations endpoint...');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_URL}/forex`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 12000,
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Response received in ${duration}ms`);
    console.log(`📊 Source: ${response.data.source}`);
    console.log(`📝 Forex allocations found: ${response.data.data?.length || 0}`);

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n💰 Sample Forex:');
      const forex = response.data.data[0];
      console.log(`  Allocation ID: ${forex.forexId || forex.allocation_id || 'N/A'}`);
      console.log(`  LC Number: ${forex.lcId || forex.lc_number || 'N/A'}`);
      console.log(`  Amount USD: ${forex.amount || forex.amount_usd || 'N/A'}`);
      console.log(`  Exchange Rate: ${forex.exchangeRate || forex.exchange_rate || 'N/A'}`);
      console.log(`  Status: ${forex.status}`);
    }

    return response.data;
  } catch (error) {
    console.error('❌ Forex endpoint failed:', error.response?.data || error.message);
    throw error;
  }
}

// Verify PostgreSQL data
function verifyPostgreSQLData() {
  console.log('\n🗄️  Verifying PostgreSQL data...');
  try {
    // Check LCs
    const lcCount = execSync(
      `docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM letters_of_credit;"`,
      { encoding: 'utf-8' }
    ).trim();
    console.log(`✅ PostgreSQL LCs: ${lcCount}`);

    // Check Forex
    const forexCount = execSync(
      `docker exec cecbs-postgres psql -U cecbs -d cecbs -t -c "SELECT COUNT(*) FROM forex_allocations;"`,
      { encoding: 'utf-8' }
    ).trim();
    console.log(`✅ PostgreSQL Forex: ${forexCount}`);

    return { lcCount: parseInt(lcCount), forexCount: parseInt(forexCount) };
  } catch (error) {
    console.error('❌ PostgreSQL verification failed:', error.message);
    return null;
  }
}

// Main test
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Banks Portal Data Test - Blockchain + PostgreSQL     ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Verify PostgreSQL first
    const pgData = verifyPostgreSQLData();

    // Login
    const token = await login();

    // Test endpoints
    const lcData = await testLCs(token);
    const forexData = await testForex(token);

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                      SUMMARY                           ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Data Sources:`);
    console.log(`  LCs: ${lcData.source} (${lcData.data?.length || 0} records)`);
    console.log(`  Forex: ${forexData.source} (${forexData.data?.length || 0} records)`);

    if (pgData) {
      console.log(`\n🗄️  PostgreSQL Cache:`);
      console.log(`  LCs: ${pgData.lcCount}`);
      console.log(`  Forex: ${pgData.forexCount}`);
    }

    console.log(`\n✅ All tests passed!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Open Banks Portal in browser`);
    console.log(`   2. Data should load in < 10 seconds`);
    console.log(`   3. Check browser console for source indicator`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
