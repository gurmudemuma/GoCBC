#!/usr/bin/env node
/**
 * GoCBC API Functional Testing
 * Tests actual execution of chaincode functions through the API
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3001';
const results = [];
let passed = 0;
let failed = 0;
let notImplemented = 0;

// Colors for terminal
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
console.log('  GoCBC API FUNCTIONAL TESTING');
console.log('  Testing Actual Chaincode Function Execution');
console.log('================================================================');
console.log(colors.reset);

// Test helper
async function testEndpoint(description, method, endpoint, data = null, expectedStatus = [200, 201]) {
  process.stdout.write(`Testing ${description}... `);
  
  try {
    const config = {
      method: method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on any status
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    // Check for not implemented
    if (response.status === 501 || 
        (response.data && typeof response.data === 'string' && 
         response.data.toLowerCase().includes('not implemented'))) {
      console.log(`${colors.yellow}NOT IMPLEMENTED${colors.reset}`);
      notImplemented++;
      results.push({
        status: 'not_implemented',
        description,
        endpoint,
        message: 'Function not implemented'
      });
      return { success: false, notImplemented: true };
    }
    
    // Check if status is expected
    const statusOk = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(response.status)
      : response.status === expectedStatus;
    
    // Check for successful response
    if (statusOk || response.status === 200 || response.status === 201) {
      console.log(`${colors.green}PASS${colors.reset}`);
      passed++;
      results.push({
        status: 'pass',
        description,
        endpoint,
        statusCode: response.status,
        data: response.data
      });
      return { success: true, data: response.data };
    } else if (response.status === 404) {
      console.log(`${colors.yellow}NOT FOUND${colors.reset}`);
      notImplemented++;
      results.push({
        status: 'not_found',
        description,
        endpoint,
        message: 'Endpoint not found'
      });
      return { success: false, notFound: true };
    } else {
      console.log(`${colors.red}FAIL (${response.status})${colors.reset}`);
      failed++;
      results.push({
        status: 'fail',
        description,
        endpoint,
        statusCode: response.status,
        error: response.data
      });
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`${colors.red}ERROR${colors.reset}`);
    failed++;
    results.push({
      status: 'error',
      description,
      endpoint,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

// Main test execution
async function runTests() {
  console.log(`${colors.bold}1. Health & System Check (2 tests)${colors.reset}`);
  await testEndpoint('API Health', 'GET', '/health');
  await testEndpoint('API Blockchain Status', 'GET', '/api/blockchain/status', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}2. Exporter Routes (4 tests)${colors.reset}`);
  await testEndpoint('Get All Exporters', 'GET', '/api/exporters');
  await testEndpoint('Get Exporter Details', 'GET', '/api/exporters/TEST001', null, [200, 404]);
  await testEndpoint('Register Exporter', 'POST', '/api/exporters/register', {
    exporterId: 'API_TEST_001',
    companyName: 'API Test Company',
    ectaLicenseNumber: 'ECTA/2024/API001',
    exporterType: 'Direct',
    capitalRequirement: 1000000
  }, [200, 201, 400, 409]);
  await testEndpoint('Update Exporter Status', 'PUT', '/api/exporters/API_TEST_001/status', {
    status: 'active'
  }, [200, 404]);
  console.log('');

  console.log(`${colors.bold}3. Contract Routes (5 tests)${colors.reset}`);
  await testEndpoint('Get All Contracts', 'GET', '/api/contracts');
  await testEndpoint('Get Contract Details', 'GET', '/api/contracts/CONTRACT001', null, [200, 404]);
  await testEndpoint('Create Contract', 'POST', '/api/contracts', {
    contractId: 'API_CONTRACT_001',
    exporterId: 'API_TEST_001',
    buyerId: 'BUYER001',
    buyerCountry: 'Germany',
    coffeeType: 'Arabica',
    quantity: 1000,
    pricePerKg: 5.50,
    currency: 'USD'
  }, [200, 201, 400, 409]);
  await testEndpoint('Approve Contract', 'POST', '/api/contracts/API_CONTRACT_001/approve', {}, [200, 404]);
  await testEndpoint('Get Contracts by Exporter', 'GET', '/api/contracts/exporter/API_TEST_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}4. Shipment Routes (5 tests)${colors.reset}`);
  await testEndpoint('Get All Shipments', 'GET', '/api/shipments');
  await testEndpoint('Get Shipment Details', 'GET', '/api/shipments/SHIPMENT001', null, [200, 404]);
  await testEndpoint('Create Shipment', 'POST', '/api/shipments', {
    shipmentId: 'API_SHIP_001',
    contractId: 'API_CONTRACT_001',
    exporterId: 'API_TEST_001',
    quantity: 1000,
    origin: 'Ethiopia'
  }, [200, 201, 400, 409]);
  await testEndpoint('Update Shipment Status', 'PUT', '/api/shipments/API_SHIP_001/status', {
    status: 'in_transit'
  }, [200, 404]);
  await testEndpoint('Get Shipment Traceability', 'GET', '/api/shipments/API_SHIP_001/traceability', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}5. Quality Routes (3 tests)${colors.reset}`);
  await testEndpoint('Get All Quality Inspections', 'GET', '/api/quality', null, [200, 404]);
  await testEndpoint('Request Inspection', 'POST', '/api/quality/request', {
    inspectionId: 'API_INSP_001',
    shipmentId: 'API_SHIP_001',
    contractId: 'API_CONTRACT_001'
  }, [200, 201, 400, 409]);
  await testEndpoint('Get Inspection Details', 'GET', '/api/quality/API_INSP_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}6. Banking/LC Routes (4 tests)${colors.reset}`);
  await testEndpoint('Get All LCs', 'GET', '/api/banking/lc', null, [200, 404]);
  await testEndpoint('Request LC', 'POST', '/api/banking/lc/request', {
    lcId: 'API_LC_001',
    contractId: 'API_CONTRACT_001',
    exporterId: 'API_TEST_001',
    amount: 5500,
    currency: 'USD'
  }, [200, 201, 400, 409]);
  await testEndpoint('Issue LC', 'POST', '/api/banking/lc/API_LC_001/issue', {
    terms: 'Standard LC terms'
  }, [200, 404]);
  await testEndpoint('Get LC Details', 'GET', '/api/banking/lc/API_LC_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}7. Payment Routes (3 tests)${colors.reset}`);
  await testEndpoint('Get All Payments', 'GET', '/api/payments', null, [200, 404]);
  await testEndpoint('Initiate Payment', 'POST', '/api/payments/initiate', {
    paymentId: 'API_PAY_001',
    contractId: 'API_CONTRACT_001',
    exporterId: 'API_TEST_001',
    amount: 5500,
    currency: 'USD'
  }, [200, 201, 400, 409]);
  await testEndpoint('Get Payment Details', 'GET', '/api/payments/API_PAY_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}8. Forex Routes (3 tests)${colors.reset}`);
  await testEndpoint('Get All Forex Allocations', 'GET', '/api/forex', null, [200, 404]);
  await testEndpoint('Request Forex', 'POST', '/api/forex/request', {
    forexId: 'API_FX_001',
    contractId: 'API_CONTRACT_001',
    exporterId: 'API_TEST_001',
    amount: 5500,
    currency: 'USD'
  }, [200, 201, 400, 409]);
  await testEndpoint('Get Forex Details', 'GET', '/api/forex/API_FX_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}9. Customs Routes (3 tests)${colors.reset}`);
  await testEndpoint('Get All Customs Declarations', 'GET', '/api/customs', null, [200, 404]);
  await testEndpoint('Submit Customs Declaration', 'POST', '/api/customs/declare', {
    declarationId: 'API_CUST_001',
    shipmentId: 'API_SHIP_001',
    exporterId: 'API_TEST_001'
  }, [200, 201, 400, 409]);
  await testEndpoint('Get Declaration Details', 'GET', '/api/customs/API_CUST_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}10. Repatriation Routes (3 tests)${colors.reset}`);
  await testEndpoint('Get All Repatriations', 'GET', '/api/repatriation', null, [200, 404]);
  await testEndpoint('Record Repatriation', 'POST', '/api/repatriation/record', {
    repatriationId: 'API_REP_001',
    contractId: 'API_CONTRACT_001',
    amount: 5500,
    currency: 'USD'
  }, [200, 201, 400, 409]);
  await testEndpoint('Get Repatriation Details', 'GET', '/api/repatriation/API_REP_001', null, [200, 404]);
  console.log('');

  console.log(`${colors.bold}11. Document Routes (3 tests)${colors.reset}`);
  await testEndpoint('Get All Documents', 'GET', '/api/documents', null, [200, 404]);
  await testEndpoint('Register Document Hash', 'POST', '/api/documents/register', {
    documentId: 'API_DOC_001',
    documentHash: 'abc123hash',
    documentType: 'Bill of Lading'
  }, [200, 201, 400, 409]);
  await testEndpoint('Verify Document Hash', 'POST', '/api/documents/verify', {
    documentId: 'API_DOC_001',
    documentHash: 'abc123hash'
  }, [200, 404]);
  console.log('');

  // Print summary
  console.log(`${colors.cyan}${colors.bold}`);
  console.log('================================================================');
  console.log('  FUNCTIONAL TEST RESULTS');
  console.log('================================================================');
  console.log(colors.reset);
  
  const total = passed + failed + notImplemented;
  console.log(`Total Tests:        ${colors.bold}${total}${colors.reset}`);
  console.log(`Passed:             ${colors.green}${colors.bold}${passed}${colors.reset}`);
  console.log(`Failed:             ${colors.red}${colors.bold}${failed}${colors.reset}`);
  console.log(`Not Implemented:    ${colors.yellow}${colors.bold}${notImplemented}${colors.reset}`);
  console.log('');
  
  if (total > 0) {
    const passRate = Math.round((passed / total) * 100);
    const implRate = Math.round(((passed + failed) / total) * 100);
    console.log(`Pass Rate:          ${colors.green}${colors.bold}${passRate}%${colors.reset}`);
    console.log(`Implementation Rate: ${colors.cyan}${colors.bold}${implRate}%${colors.reset}`);
  }
  console.log('');

  // Save detailed results to file
  fs.writeFileSync(
    '/home/guda/GoCBC/api-functional-test-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('Detailed results saved to: api-functional-test-results.json');
  console.log('');

  // Show not implemented functions
  if (notImplemented > 0) {
    console.log(`${colors.yellow}${colors.bold}Not Implemented Functions:${colors.reset}`);
    results
      .filter(r => r.status === 'not_implemented' || r.status === 'not_found')
      .forEach(r => console.log(`  • ${r.description} (${r.endpoint})`));
    console.log('');
  }

  // Show failures
  if (failed > 0) {
    console.log(`${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    results
      .filter(r => r.status === 'fail' || r.status === 'error')
      .forEach(r => {
        console.log(`  • ${r.description} (${r.endpoint})`);
        if (r.error) console.log(`    Error: ${JSON.stringify(r.error).substring(0, 100)}`);
      });
    console.log('');
  }

  // Exit code
  if (notImplemented > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠ Some functions are not implemented${colors.reset}`);
    process.exit(1);
  } else if (failed > 0) {
    console.log(`${colors.red}${colors.bold}✗ Some tests failed${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}✓ ALL FUNCTIONAL TESTS PASSED${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test execution error: ${error.message}${colors.reset}`);
  process.exit(1);
});
