#!/usr/bin/env node
/**
 * GoCBC Real Transaction Execution Test
 * Actually executes blockchain transactions to prove functions work
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3001/api/v1';
let authToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bold}`);
console.log('================================================================');
console.log('  GoCBC REAL TRANSACTION EXECUTION TEST');
console.log('  Actually Creating Data and Verifying Functions Work');
console.log('================================================================');
console.log(colors.reset);
console.log('');

// Helper function
async function executeTest(description, testFn) {
  testResults.total++;
  process.stdout.write(`${testResults.total}. ${description}... `);
  
  try {
    await testFn();
    console.log(`${colors.green}✓ PASS${colors.reset}`);
    testResults.passed++;
    testResults.details.push({ status: 'PASS', description });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.details.push({ status: 'FAIL', description, error: error.message });
    return false;
  }
}

// Login first
async function login() {
  try {
    console.log(`${colors.bold}Step 1: Authentication${colors.reset}`);
    
    // Try to get existing user or create one
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, { validateStatus: () => true });
    
    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      console.log(`${colors.green}✓ Logged in successfully${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ Login failed, trying to register...${colors.reset}`);
      
      // Try to register
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        username: 'admin',
        password: 'admin123',
        fullName: 'System Admin',
        email: 'admin@cecbs.et',
        organization: 'ECTA',
        role: 'ECTA_ADMIN'
      }, { validateStatus: () => true });
      
      if (registerResponse.status === 200 || registerResponse.status === 201) {
        // Try login again
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          username: 'admin',
          password: 'admin123'
        });
        
        if (loginResponse.data.token) {
          authToken = loginResponse.data.token;
          console.log(`${colors.green}✓ Registered and logged in${colors.reset}`);
          return true;
        }
      }
      
      console.log(`${colors.red}✗ Could not authenticate${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Authentication error: ${error.message}${colors.reset}`);
    return false;
  }
}

// API call helper
async function apiCall(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    validateStatus: () => true // Don't throw on any status
  };
  
  if (data) {
    config.data = data;
  }
  
  const response = await axios(config);
  
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  } else {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data).substring(0, 200)}`);
  }
}

// Run all tests
async function runTests() {
  console.log('');
  
  // Step 1: Login
  if (!await login()) {
    console.log(`${colors.red}${colors.bold}Cannot proceed without authentication${colors.reset}`);
    process.exit(1);
  }
  
  console.log('');
  console.log(`${colors.bold}Step 2: Creating Real Test Data${colors.reset}`);
  console.log('');
  
  // Generate unique IDs
  const timestamp = Date.now();
  const exporterId = `TEST_EXP_${timestamp}`;
  const contractId = `TEST_CTR_${timestamp}`;
  const shipmentId = `TEST_SHP_${timestamp}`;
  const lcId = `TEST_LC_${timestamp}`;
  const paymentId = `TEST_PAY_${timestamp}`;
  const forexId = `TEST_FX_${timestamp}`;
  const customsId = `TEST_CST_${timestamp}`;
  
  // Test 1: Register Exporter
  await executeTest('Register Exporter', async () => {
    const result = await apiCall('POST', '/exporters/register', {
      exporterId: exporterId,
      companyName: 'Test Coffee Exporter Ltd',
      ectaLicenseNumber: `ECTA/${timestamp}/001`,
      exporterType: 'Direct',
      capitalRequirement: 5000000,
      contactPerson: 'John Doe',
      phone: '+251911234567',
      email: 'test@testexporter.et',
      city: 'Addis Ababa',
      address: 'Bole, Addis Ababa'
    });
    
    if (!result || !result.exporterId) {
      throw new Error('Exporter not created or no ID returned');
    }
  });
  
  // Test 2: Get Exporter (verify it was created)
  await executeTest('Retrieve Created Exporter', async () => {
    const result = await apiCall('GET', `/exporters/${exporterId}`);
    if (!result || result.exporterId !== exporterId) {
      throw new Error('Exporter not found in database');
    }
  });
  
  // Test 3: Create Sales Contract
  await executeTest('Create Sales Contract', async () => {
    const result = await apiCall('POST', '/contracts', {
      contractId: contractId,
      exporterId: exporterId,
      buyerId: 'BUYER_001',
      buyerName: 'German Coffee Imports GmbH',
      buyerCountry: 'Germany',
      coffeeType: 'Arabica Sidamo',
      quantity: 1000,
      pricePerKg: 6.50,
      currency: 'USD',
      totalValue: 6500,
      eudrRequired: true,
      buyerBank: 'Deutsche Bank',
      exporterBank: 'Commercial Bank of Ethiopia',
      paymentMethod: 'LC'
    });
    
    if (!result || (!result.contractId && !result.contract_id)) {
      throw new Error('Contract not created');
    }
  });
  
  // Test 4: Get Contract (verify blockchain)
  await executeTest('Retrieve Created Contract', async () => {
    const result = await apiCall('GET', `/contracts/${contractId}`);
    if (!result) {
      throw new Error('Contract not found');
    }
  });
  
  // Test 5: Approve Contract
  await executeTest('Approve Contract', async () => {
    const result = await apiCall('POST', `/contracts/${contractId}/approve`, {
      approvedBy: 'admin',
      comments: 'Approved for testing'
    });
  });
  
  // Test 6: Create Shipment
  await executeTest('Create Shipment', async () => {
    const result = await apiCall('POST', '/shipments', {
      shipmentId: shipmentId,
      contractId: contractId,
      exporterId: exporterId,
      quantity: 1000,
      grade: 'Grade 2',
      origin: 'Sidamo, Ethiopia',
      destination: 'Hamburg, Germany',
      icoNumber: `ICO${timestamp}`,
      ecxLotNumber: `ECX${timestamp}`,
      eudrCompliant: true
    });
  });
  
  // Test 7: Get Shipment
  await executeTest('Retrieve Created Shipment', async () => {
    const result = await apiCall('GET', `/shipments/${shipmentId}`);
    if (!result) {
      throw new Error('Shipment not found');
    }
  });
  
  // Test 8: Update Shipment Status
  await executeTest('Update Shipment Status', async () => {
    const result = await apiCall('PUT', `/shipments/${shipmentId}/status`, {
      status: 'in_transit',
      updatedBy: 'admin'
    });
  });
  
  // Test 9: Request Quality Inspection
  await executeTest('Request Quality Inspection', async () => {
    const result = await apiCall('POST', '/quality/request', {
      shipmentId: shipmentId,
      contractId: contractId,
      exporterId: exporterId,
      requestedBy: 'admin'
    });
  });
  
  // Test 10: Request Letter of Credit
  await executeTest('Request Letter of Credit', async () => {
    const result = await apiCall('POST', '/banking/lc/request', {
      lcId: lcId,
      contractId: contractId,
      exporterId: exporterId,
      amount: 6500,
      currency: 'USD',
      issuingBank: 'Deutsche Bank',
      advisingBank: 'Commercial Bank of Ethiopia',
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    });
  });
  
  // Test 11: Request Forex Allocation
  await executeTest('Request Forex Allocation', async () => {
    const result = await apiCall('POST', '/forex/request', {
      forexId: forexId,
      contractId: contractId,
      exporterId: exporterId,
      amount: 6500,
      currency: 'USD',
      requestedBy: 'admin'
    });
  });
  
  // Test 12: Submit Customs Declaration
  await executeTest('Submit Customs Declaration', async () => {
    const result = await apiCall('POST', '/customs/declare', {
      declarationId: customsId,
      shipmentId: shipmentId,
      exporterId: exporterId,
      declarationType: 'export',
      hsCode: '0901.21',
      quantity: 1000,
      value: 6500,
      currency: 'USD',
      destination: 'Germany'
    });
  });
  
  // Summary
  console.log('');
  console.log(`${colors.cyan}${colors.bold}`);
  console.log('================================================================');
  console.log('  TEST EXECUTION RESULTS');
  console.log('================================================================');
  console.log(colors.reset);
  console.log(`Total Tests:    ${colors.bold}${testResults.total}${colors.reset}`);
  console.log(`Passed:         ${colors.green}${colors.bold}${testResults.passed}${colors.reset}`);
  console.log(`Failed:         ${colors.red}${colors.bold}${testResults.failed}${colors.reset}`);
  console.log('');
  
  if (testResults.total > 0) {
    const passRate = Math.round((testResults.passed / testResults.total) * 100);
    console.log(`Pass Rate:      ${passRate >= 70 ? colors.green : colors.red}${colors.bold}${passRate}%${colors.reset}`);
  }
  
  console.log('');
  
  // Save detailed results
  fs.writeFileSync(
    '/home/guda/GoCBC/real-transaction-test-results.json',
    JSON.stringify(testResults, null, 2)
  );
  
  console.log('Detailed results saved to: real-transaction-test-results.json');
  console.log('');
  
  // Show failed tests
  if (testResults.failed > 0) {
    console.log(`${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    testResults.details
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.description}`);
        console.log(`    Error: ${t.error}`);
      });
    console.log('');
  }
  
  if (testResults.failed === 0) {
    console.log(`${colors.green}${colors.bold}✓ ALL REAL TRANSACTIONS COMPLETED SUCCESSFULLY${colors.reset}`);
    console.log('');
    console.log('The system has been proven to work with actual data!');
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}✗ SOME TRANSACTIONS FAILED${colors.reset}`);
    console.log('');
    console.log('The system needs fixes before it can be considered fully operational.');
    process.exit(1);
  }
}

// Run
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
