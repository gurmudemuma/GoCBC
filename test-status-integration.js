#!/usr/bin/env node

/**
 * Complete Status Integration Test
 * Tests that every status transition works across all portals
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

let tokens = {};
let testData = {};

// Step 1: Login as all users
async function loginAll() {
  log('\n=== STEP 1: Authentication ===', 'cyan');
  
  const users = [
    { role: 'exporter', username: 'EXP4342570', password: 'password123' },
    { role: 'ecta', username: 'ecta_admin', password: 'password123' },
    { role: 'bank', username: 'bank_admin', password: 'password123' },
    { role: 'nbe', username: 'nbe_admin', password: 'password123' },
    { role: 'customs', username: 'customs_admin', password: 'password123' },
    { role: 'shipping', username: 'shipping_admin', password: 'password123' },
  ];
  
  for (const user of users) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: user.username,
        password: user.password,
      });
      
      if (response.data.token) {
        tokens[user.role] = response.data.token;
        log(`✓ Logged in as ${user.role}`, 'green');
      }
    } catch (error) {
      log(`✗ Failed to login as ${user.role}: ${error.response?.data?.error || error.message}`, 'red');
    }
  }
}

// Step 2: Register Contract (Exporter)
async function registerContract() {
  log('\n=== STEP 2: Register Contract (Exporter Portal) ===', 'cyan');
  
  const contractId = `CONTRACT${Date.now()}`;
  testData.contractId = contractId;
  
  const contractData = {
    contractId,
    exporterId: 'EXP4342570',
    buyerName: 'Global Coffee Importers Inc',
    buyerCountry: 'United States',
    buyerBank: 'Bank of America',
    exporterBank: 'Commercial Bank of Ethiopia',
    coffeeType: 'Arabica Grade 1',
    quantity: 25000,
    pricePerKg: 6.50,
    currency: 'USD',
    paymentMethod: 'LC',
    eudrRequired: true,
  };
  
  try {
    const response = await axios.post(`${API_BASE}/contracts`, contractData, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    log(`✓ Contract registered: ${contractId}`, 'green');
    log(`  Status should be: REGISTERED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/contracts/${contractId}`, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    log(`  Actual status: ${check.data.contract?.contractStatus || check.data.contractStatus}`, check.data.contract?.contractStatus === 'REGISTERED' ? 'green' : 'red');
    
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 3: Approve Contract (ECTA)
async function approveContract() {
  log('\n=== STEP 3: Approve Contract (ECTA Portal) ===', 'cyan');
  
  try {
    const response = await axios.post(
      `${API_BASE}/contracts/${testData.contractId}/approve`,
      { 
        approvalNotes: 'Contract meets all export compliance requirements',
        nbeReferenceNumber: `NBE${Date.now()}`
      },
      { headers: { Authorization: `Bearer ${tokens.ecta}` } }
    );
    
    log(`✓ Contract approved`, 'green');
    log(`  Status should be: APPROVED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/contracts/${testData.contractId}`, {
      headers: { Authorization: `Bearer ${tokens.ecta}` }
    });
    
    const status = check.data.contract?.contractStatus || check.data.contractStatus;
    log(`  Actual status: ${status}`, status === 'APPROVED' ? 'green' : 'red');
    
    return status === 'APPROVED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 4: Request LC (Exporter)
async function requestLC() {
  log('\n=== STEP 4: Request Letter of Credit (Exporter Portal) ===', 'cyan');
  
  const lcId = `LC${Date.now()}`;
  testData.lcId = lcId;
  
  try {
    const response = await axios.post(`${API_BASE}/banking/lc/request`, {
      lcId,
      contractId: testData.contractId,
      bankName: 'Commercial Bank of Ethiopia',
      amount: 162500,
      currency: 'USD',
      expiryDate: '2027-03-22',
    }, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    log(`✓ LC requested: ${lcId}`, 'green');
    log(`  Status should be: REQUESTED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/banking/lc/${lcId}`, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    const status = check.data.lc?.status || check.data.status;
    log(`  Actual status: ${status}`, status === 'REQUESTED' ? 'green' : 'red');
    
    return status === 'REQUESTED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 5: Approve LC (Bank)
async function approveLC() {
  log('\n=== STEP 5: Approve LC (Banks Portal) ===', 'cyan');
  
  try {
    const response = await axios.post(`${API_BASE}/banking/lc/${testData.lcId}/approve`, {
      reviewNotes: 'LC documentation verified and approved',
    }, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    log(`✓ LC approved`, 'green');
    log(`  Status should be: APPROVED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/banking/lc/${testData.lcId}`, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    const status = check.data.lc?.status || check.data.status;
    log(`  Actual status: ${status}`, status === 'APPROVED' ? 'green' : 'red');
    
    return status === 'APPROVED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 6: Issue LC (Bank)
async function issueLC() {
  log('\n=== STEP 6: Issue LC (Banks Portal) ===', 'cyan');
  
  try {
    const response = await axios.post(`${API_BASE}/banking/lc/${testData.lcId}/issue`, {
      issuanceDate: new Date().toISOString().split('T')[0],
      swiftReference: `SWIFT${Date.now()}`,
    }, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    log(`✓ LC issued`, 'green');
    log(`  Status should be: ISSUED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/banking/lc/${testData.lcId}`, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    const status = check.data.lc?.status || check.data.status;
    log(`  Actual status: ${status}`, status === 'ISSUED' ? 'green' : 'red');
    
    return status === 'ISSUED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 7: Allocate Forex (NBE)
async function allocateForex() {
  log('\n=== STEP 7: Allocate Forex (NBE Portal) ===', 'cyan');
  
  const forexId = `FOREX${Date.now()}`;
  testData.forexId = forexId;
  
  try {
    // First request forex
    await axios.post(`${API_BASE}/forex/allocate`, {
      forexId,
      lcId: testData.lcId,
      contractId: testData.contractId,
      amountUSD: 162500,
      exchangeRate: 120.5,
      retentionRate: 30,
    }, {
      headers: { Authorization: `Bearer ${tokens.nbe}` }
    });
    
    log(`✓ Forex allocated: ${forexId}`, 'green');
    
    // Confirm forex
    const confirm = await axios.post(`${API_BASE}/forex/${forexId}/confirm`, {
      approvalNotes: 'Forex allocation confirmed by NBE',
    }, {
      headers: { Authorization: `Bearer ${tokens.nbe}` }
    });
    
    log(`✓ Forex confirmed`, 'green');
    log(`  LC status should be: FOREX_ALLOCATED`, 'yellow');
    
    // Verify LC status changed
    const check = await axios.get(`${API_BASE}/banking/lc/${testData.lcId}`, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    const status = check.data.lc?.status || check.data.status;
    log(`  Actual LC status: ${status}`, status === 'FOREX_ALLOCATED' ? 'green' : 'red');
    
    return status === 'FOREX_ALLOCATED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 8: Create Shipment (Exporter)
async function createShipment() {
  log('\n=== STEP 8: Create Shipment (Exporter Portal) ===', 'cyan');
  
  const shipmentId = `SHIP${Date.now()}`;
  testData.shipmentId = shipmentId;
  
  try {
    const response = await axios.post(`${API_BASE}/shipments`, {
      shipmentId,
      contractId: testData.contractId,
      origin: 'Addis Ababa',
      quantity: 25000,
      grade: 'Grade 1',
      icoNumber: `ICO${Date.now()}`,
      ecxLotNumber: `ECX${Date.now()}`,
      eudrCompliant: true,
    }, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    log(`✓ Shipment created: ${shipmentId}`, 'green');
    log(`  Status should be: CREATED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/shipments/${shipmentId}`, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    const status = check.data.shipment?.status || check.data.status;
    log(`  Actual status: ${status}`, status === 'CREATED' ? 'green' : 'red');
    
    return status === 'CREATED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 9: Submit Customs Declaration
async function submitCustoms() {
  log('\n=== STEP 9: Submit Customs Declaration (Exporter Portal) ===', 'cyan');
  
  try {
    const response = await axios.post(`${API_BASE}/customs/clearance`, {
      shipmentId: testData.shipmentId,
      declarationType: 'EXPORT',
      exitPoint: 'Addis Ababa Bole Airport',
      declaredValue: 162500,
      currency: 'USD',
    }, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    testData.declarationId = response.data.clearance?.id || response.data.id;
    
    log(`✓ Customs declaration submitted`, 'green');
    log(`  Status should be: SUBMITTED`, 'yellow');
    
    const status = response.data.clearance?.status || response.data.status;
    log(`  Actual status: ${status}`, status === 'SUBMITTED' ? 'green' : 'red');
    
    return status === 'SUBMITTED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Step 10: Clear Customs (Customs Authority)
async function clearCustoms() {
  log('\n=== STEP 10: Clear Customs (Customs Portal) ===', 'cyan');
  
  try {
    // Review declaration
    await axios.put(`${API_BASE}/customs/declarations/${testData.declarationId}/review`, {
      status: 'UNDER_REVIEW',
      reviewNotes: 'Documentation under review',
    }, {
      headers: { Authorization: `Bearer ${tokens.customs}` }
    });
    
    log(`✓ Declaration under review`, 'green');
    
    // Complete inspection
    await axios.put(`${API_BASE}/customs/declarations/${testData.declarationId}/inspect`, {
      status: 'UNDER_INSPECTION',
      inspectionNotes: 'Physical inspection completed',
    }, {
      headers: { Authorization: `Bearer ${tokens.customs}` }
    });
    
    log(`✓ Inspection completed`, 'green');
    
    // Clear declaration
    await axios.put(`${API_BASE}/customs/declarations/${testData.declarationId}/clear`, {
      status: 'CLEARED',
      clearanceNotes: 'Customs clearance approved',
    }, {
      headers: { Authorization: `Bearer ${tokens.customs}` }
    });
    
    log(`✓ Declaration cleared`, 'green');
    log(`  Status should be: CLEARED`, 'yellow');
    
    // Verify status
    const check = await axios.get(`${API_BASE}/customs/declarations/${testData.declarationId}`, {
      headers: { Authorization: `Bearer ${tokens.customs}` }
    });
    
    const status = check.data.declaration?.status || check.data.status;
    log(`  Actual status: ${status}`, status === 'CLEARED' ? 'green' : 'red');
    
    return status === 'CLEARED';
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

// Run all tests
async function runTests() {
  log('\n' + '='.repeat(70), 'bright');
  log('  COMPLETE STATUS INTEGRATION TEST', 'bright');
  log('  Testing all workflow status transitions across portals', 'bright');
  log('='.repeat(70), 'bright');
  
  const results = [];
  
  await loginAll();
  
  results.push({ step: 'Register Contract', passed: await registerContract() });
  results.push({ step: 'Approve Contract', passed: await approveContract() });
  results.push({ step: 'Request LC', passed: await requestLC() });
  results.push({ step: 'Approve LC', passed: await approveLC() });
  results.push({ step: 'Issue LC', passed: await issueLC() });
  results.push({ step: 'Allocate Forex', passed: await allocateForex() });
  results.push({ step: 'Create Shipment', passed: await createShipment() });
  results.push({ step: 'Submit Customs', passed: await submitCustoms() });
  results.push({ step: 'Clear Customs', passed: await clearCustoms() });
  
  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('  TEST SUMMARY', 'bright');
  log('='.repeat(70), 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    log(`  ${r.passed ? '✓' : '✗'} ${r.step}`, r.passed ? 'green' : 'red');
  });
  
  log('\n' + `Total: ${passed} passed, ${failed} failed`, passed === results.length ? 'green' : 'yellow');
  log('='.repeat(70), 'cyan');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\nFATAL ERROR: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
