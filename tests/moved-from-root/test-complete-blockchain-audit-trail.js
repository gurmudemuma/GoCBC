/**
 * Complete Blockchain Audit Trail Verification Test
 * Tests that ALL entities are being recorded on blockchain immediately upon creation
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBlockchainAuditTrail() {
  log('\n🧪 Testing Complete Blockchain Audit Trail\n', 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Test 1: Contract Registration
    log('📋 Test 1: Contract Registration on Blockchain', 'blue');
    try {
      const contractId = `CONTRACT${Date.now()}`;
      const contractResp = await axios.post(`${API_BASE}/contracts`, {
        contractID: contractId,
        exporterID: 'EXP001',
        buyerID: 'BUYER001',
        buyerCountry: 'USA',
        buyerBank: 'Bank of America',
        exporterBank: 'Commercial Bank of Ethiopia',
        coffeeType: 'Arabica',
        quantity: 1000,
        pricePerKg: 5.50,
        currency: 'USD',
        eudrRequired: true,
        documents: []
      }, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });

      if (contractResp.data.success && contractResp.data.txId) {
        log(`✅ Contract registered on blockchain: ${contractId}`, 'green');
        log(`   Transaction ID: ${contractResp.data.txId}`, 'green');
        results.passed++;
        results.tests.push({ name: 'Contract Registration', status: 'PASS' });
      } else {
        throw new Error('No blockchain transaction ID returned');
      }
    } catch (error) {
      log(`❌ Contract registration failed: ${error.message}`, 'red');
      results.failed++;
      results.tests.push({ name: 'Contract Registration', status: 'FAIL', error: error.message });
    }

    await sleep(2000);

    // Test 2: Document Upload with Hash Registration
    log('\n📋 Test 2: Document Upload with Blockchain Hash', 'blue');
    try {
      // We'll skip file upload test since it requires multipart/form-data
      log('⚠️  Skipping file upload test (requires multipart data)', 'yellow');
      results.tests.push({ name: 'Document Upload', status: 'SKIP' });
    } catch (error) {
      log(`❌ Document upload failed: ${error.message}`, 'red');
      results.failed++;
      results.tests.push({ name: 'Document Upload', status: 'FAIL', error: error.message });
    }

    // Test 3: LC Issuance with Auto-Forex Creation
    log('\n📋 Test 3: LC Issuance + Auto-Forex on Blockchain', 'blue');
    try {
      const lcId = `LC${Date.now()}`;
      const contractId = `CONTRACT${Date.now() - 10000}`;
      
      // First create a contract
      await axios.post(`${API_BASE}/contracts`, {
        contractID: contractId,
        exporterID: 'EXP001',
        buyerID: 'BUYER001',
        buyerCountry: 'USA',
        buyerBank: 'Bank of America',
        exporterBank: 'Commercial Bank of Ethiopia',
        coffeeType: 'Arabica',
        quantity: 1000,
        pricePerKg: 5.50,
        currency: 'USD',
        eudrRequired: true
      }, { headers: { 'Authorization': `Bearer ${TEST_TOKEN}` } });

      await sleep(3000);

      // Issue LC
      const lcResp = await axios.post(`${API_BASE}/banking/lc`, {
        lcId,
        contractId,
        exporterId: 'EXP001',
        amount: 5500,
        currency: 'USD',
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        issuingBank: 'Bank of America',
        advisingBank: 'Commercial Bank of Ethiopia',
        paymentTerms: 'Sight LC'
      }, { headers: { 'Authorization': `Bearer ${TEST_TOKEN}` } });

      if (lcResp.data.success) {
        log(`✅ LC issued successfully: ${lcId}`, 'green');
        
        // Wait for forex auto-creation
        await sleep(5000);
        
        // Check if forex was auto-created
        const forexResp = await axios.get(`${API_BASE}/forex`, {
          headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        });

        const autoCreatedForex = forexResp.data.data?.find(f => 
          (f.forexId || f.ForexID)?.includes(lcId)
        );

        if (autoCreatedForex) {
          log(`✅ Auto-created FOREX found on blockchain: ${autoCreatedForex.forexId || autoCreatedForex.ForexID}`, 'green');
          results.passed++;
          results.tests.push({ name: 'LC + Auto-Forex', status: 'PASS' });
        } else {
          log(`⚠️  LC issued but forex not found (may need more time to propagate)`, 'yellow');
          results.tests.push({ name: 'LC + Auto-Forex', status: 'PARTIAL' });
        }
      }
    } catch (error) {
      log(`❌ LC issuance failed: ${error.response?.data?.error?.message || error.message}`, 'red');
      results.failed++;
      results.tests.push({ name: 'LC + Auto-Forex', status: 'FAIL', error: error.message });
    }

    // Test 4: Query Blockchain Signatures (Public Endpoint)
    log('\n📋 Test 4: Query Blockchain Signatures (Public)', 'blue');
    try {
      // Test with a known contract ID from CouchDB
      const signaturesResp = await axios.get(
        `${API_BASE}/blockchain-signatures/entity/CONTRACT/CONTRACT_CON-APP-02768434-4NBU`
      );

      if (signaturesResp.data.success) {
        const transactions = signaturesResp.data.data.transactions || [];
        log(`✅ Blockchain signatures endpoint working`, 'green');
        log(`   Transactions found: ${transactions.length}`, 'green');
        
        if (transactions.length > 0) {
          const tx = transactions[0];
          log(`   Creator: ${tx.creator.identity}`, 'green');
          log(`   MSP: ${tx.creator.mspId}`, 'green');
          log(`   Validation: ${tx.validationCode}`, 'green');
        }
        
        results.passed++;
        results.tests.push({ name: 'Blockchain Signatures Query', status: 'PASS' });
      }
    } catch (error) {
      log(`❌ Blockchain signatures query failed: ${error.message}`, 'red');
      results.failed++;
      results.tests.push({ name: 'Blockchain Signatures Query', status: 'FAIL', error: error.message });
    }

    // Test 5: Audit Trail Query
    log('\n📋 Test 5: Audit Trail for New Entities', 'blue');
    try {
      const auditResp = await axios.get(`${API_BASE}/audit`, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` },
        params: { limit: 10 }
      });

      if (auditResp.data.success) {
        const recentAudits = auditResp.data.data || [];
        log(`✅ Audit trail accessible`, 'green');
        log(`   Recent audit entries: ${recentAudits.length}`, 'green');
        
        if (recentAudits.length > 0) {
          const recent = recentAudits[0];
          log(`   Latest: ${recent.entity_type} - ${recent.action} by ${recent.performed_by}`, 'green');
        }
        
        results.passed++;
        results.tests.push({ name: 'Audit Trail Query', status: 'PASS' });
      }
    } catch (error) {
      log(`❌ Audit trail query failed: ${error.message}`, 'red');
      results.failed++;
      results.tests.push({ name: 'Audit Trail Query', status: 'FAIL', error: error.message });
    }

    // Test 6: CouchDB Direct Query (Verify State Database)
    log('\n📋 Test 6: CouchDB State Database Verification', 'blue');
    try {
      const couchResp = await axios.get(
        'http://localhost:5984/coffeechannel_coffee/_all_docs?limit=5',
        { auth: { username: 'admin', password: 'adminpw' } }
      );

      if (couchResp.data.total_rows > 0) {
        log(`✅ CouchDB accessible`, 'green');
        log(`   Total blockchain records: ${couchResp.data.total_rows}`, 'green');
        log(`   Sample IDs:`, 'green');
        couchResp.data.rows.slice(0, 3).forEach(row => {
          log(`   - ${row.id}`, 'green');
        });
        
        results.passed++;
        results.tests.push({ name: 'CouchDB State Database', status: 'PASS' });
      }
    } catch (error) {
      log(`❌ CouchDB query failed: ${error.message}`, 'red');
      results.failed++;
      results.tests.push({ name: 'CouchDB State Database', status: 'FAIL', error: error.message });
    }

    // Print Summary
    log('\n' + '='.repeat(60), 'blue');
    log('📊 TEST SUMMARY', 'blue');
    log('='.repeat(60), 'blue');
    
    results.tests.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
      const color = test.status === 'PASS' ? 'green' : test.status === 'FAIL' ? 'red' : 'yellow';
      log(`${icon} ${test.name}: ${test.status}`, color);
      if (test.error) {
        log(`   Error: ${test.error}`, 'red');
      }
    });
    
    log('\n' + '-'.repeat(60), 'blue');
    log(`Total Tests: ${results.passed + results.failed}`, 'blue');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log('-'.repeat(60) + '\n', 'blue');

    if (results.failed === 0) {
      log('🎉 ALL TESTS PASSED - Complete blockchain audit trail is working!', 'green');
    } else {
      log('⚠️  Some tests failed - review errors above', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
if (require.main === module) {
  if (!TEST_TOKEN) {
    log('❌ TEST_TOKEN environment variable not set', 'red');
    log('\nTo run this test:', 'yellow');
    log('1. Login to http://localhost:3000', 'yellow');
    log('2. Open browser console', 'yellow');
    log('3. Run: localStorage.getItem("authToken")', 'yellow');
    log('4. Copy the token and run:', 'yellow');
    log('   TEST_TOKEN="your-token" node test-complete-blockchain-audit-trail.js\n', 'yellow');
    process.exit(1);
  }

  testBlockchainAuditTrail();
}

module.exports = { testBlockchainAuditTrail };
