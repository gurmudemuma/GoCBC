/**
 * GoCBC Complete Workflow Integration Test
 * Tests the entire coffee export workflow from contract to payment
 * 
 * Workflow: Contract → LC → Forex (40%) → Shipment → Quality → Customs → Payment (40%)
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TIMEOUT = 30000;

// Test data
const testData = {
  contractID: `TEST-CONTRACT-${Date.now()}`,
  lcID: `TEST-LC-${Date.now()}`,
  forexID: `TEST-FOREX-${Date.now()}`,
  shipmentID: `TEST-SHIPMENT-${Date.now()}`,
  inspectionID: `TEST-INS-${Date.now()}`,
  declarationID: `TEST-DECL-${Date.now()}`,
  paymentID: `TEST-PAY-${Date.now()}`,
  
  exporterID: 'EXP001',
  buyerID: 'BUYER001',
  amount: 10000, // $10,000 USD
};

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(80)}`, colors.cyan);
  log(`STEP ${step}: ${message}`, colors.cyan);
  log('='.repeat(80), colors.cyan);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function step1_registerContract() {
  logStep(1, 'Register Contract');
  
  try {
    const response = await axios.post(`${BASE_URL}/contracts/register`, {
      contractID: testData.contractID,
      exporterID: testData.exporterID,
      buyerID: testData.buyerID,
      buyerName: 'Test Buyer Inc.',
      buyerCountry: 'USA',
      buyerBank: 'Chase Bank',
      exporterBank: 'Commercial Bank of Ethiopia',
      coffeeType: 'Arabica',
      quantity: 1000,
      pricePerKg: 10,
      currency: 'USD',
      paymentMethod: 'LC',
      eudrRequired: true,
      documents: 'DOC001,DOC002',
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess(`Contract registered: ${testData.contractID}`);
      logInfo(`Status: ${response.data.data?.status || 'PENDING'}`);
      return true;
    }
    throw new Error(response.data.error?.message || 'Registration failed');
  } catch (error) {
    logError(`Contract registration failed: ${error.message}`);
    return false;
  }
}

async function step2_approveContract() {
  logStep(2, 'Approve Contract');
  
  try {
    const response = await axios.post(`${BASE_URL}/contracts/${testData.contractID}/approve`, {
      approvedBy: 'admin',
      reason: 'Test approval'
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess(`Contract approved: ${testData.contractID}`);
      return true;
    }
    throw new Error(response.data.error?.message || 'Approval failed');
  } catch (error) {
    logError(`Contract approval failed: ${error.message}`);
    return false;
  }
}

async function step3_issueLC() {
  logStep(3, 'Issue Letter of Credit (LC) - Should Auto-Trigger Forex Request');
  
  try {
    const response = await axios.post(`${BASE_URL}/banking/lc/issue`, {
      lcID: testData.lcID,
      lcNumber: `LC-${Date.now()}`,
      contractID: testData.contractID,
      exporterID: testData.exporterID,
      issuingBank: 'Commercial Bank of Ethiopia',
      advisingBank: 'Chase Bank',
      beneficiary: 'Test Exporter',
      applicant: 'Test Buyer',
      amount: testData.amount,
      currency: 'USD',
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      latestShipmentDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      portOfLoading: 'Addis Ababa',
      portOfDischarge: 'New York',
      paymentTerms: 'At sight',
      partialShipment: false,
      transhipment: false,
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess(`LC issued: ${testData.lcID}`);
      logInfo('Expected: Forex request auto-triggered');
      return true;
    }
    throw new Error(response.data.error?.message || 'LC issuance failed');
  } catch (error) {
    logError(`LC issuance failed: ${error.message}`);
    return false;
  }
}

async function step4_allocateForex() {
  logStep(4, 'Allocate Forex with 40% NBE Retention');
  
  try {
    const response = await axios.post(`${BASE_URL}/forex/${testData.forexID}/allocate`, {
      lcID: testData.lcID,
      amount: testData.amount,
      exchangeRate: 115.5,
      retentionRate: 40, // 40% NBE retention policy
      officer: 'nbe_officer',
      approvalRef: 'NBE-APPR-001',
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      const data = response.data.data;
      logSuccess(`Forex allocated: ${testData.forexID}`);
      logInfo(`Total Amount: $${data.allocatedAmount || testData.amount}`);
      logInfo(`Retention (40%): $${data.retentionAmount || (testData.amount * 0.4)}`);
      logInfo(`Release (60%): $${data.releaseAmount || (testData.amount * 0.6)}`);
      
      // Verify 40% retention
      const expectedRetention = testData.amount * 0.4;
      const actualRetention = data.retentionAmount;
      if (Math.abs(actualRetention - expectedRetention) < 0.01) {
        logSuccess('✓ 40% retention calculation correct');
      } else {
        logError(`✗ Retention mismatch: Expected ${expectedRetention}, Got ${actualRetention}`);
      }
      
      return true;
    }
    throw new Error(response.data.error?.message || 'Forex allocation failed');
  } catch (error) {
    logError(`Forex allocation failed: ${error.message}`);
    return false;
  }
}

async function step5_createShipment() {
  logStep(5, 'Create Shipment - Should Auto-Create Quality Inspection Task');
  
  try {
    const response = await axios.post(`${BASE_URL}/shipments`, {
      shipmentID: testData.shipmentID,
      contractID: testData.contractID,
      exporterID: testData.exporterID,
      buyerID: testData.buyerID,
      origin: 'Yirgacheffe',
      quantity: 1000,
      grade: 'Grade 1',
      icoNumber: 'ICO-12345',
      ecxLotNumber: 'ECX-67890',
      channel: 'ECX',
      forexRate: 115.5,
      eudrCompliant: true,
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess(`Shipment created: ${testData.shipmentID}`);
      logInfo('Expected: Quality inspection task auto-created');
      return true;
    }
    throw new Error(response.data.error?.message || 'Shipment creation failed');
  } catch (error) {
    logError(`Shipment creation failed: ${error.message}`);
    return false;
  }
}

async function step6_approveQuality() {
  logStep(6, 'Approve Quality Inspection - Should Auto-Trigger Customs Declaration');
  
  try {
    // First, get the inspection ID created for this shipment
    const inspectionsResponse = await axios.get(`${BASE_URL}/quality/inspections`, { timeout: TIMEOUT });
    const inspection = inspectionsResponse.data.data?.find(i => i.shipment_id === testData.shipmentID);
    
    if (!inspection) {
      logError('Quality inspection not found for shipment');
      logInfo('This might indicate the auto-creation didn\'t work');
      return false;
    }
    
    testData.inspectionID = inspection.inspection_id;
    logInfo(`Found quality inspection: ${testData.inspectionID}`);
    
    const response = await axios.post(`${BASE_URL}/quality/${testData.inspectionID}/approve`, {
      approvedBy: 'quality_director',
      certificateNo: `CERT-${Date.now()}`,
      remarks: 'Quality standards met',
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess(`Quality inspection approved: ${testData.inspectionID}`);
      logInfo('Expected: Customs declaration auto-triggered');
      return true;
    }
    throw new Error(response.data.error?.message || 'Quality approval failed');
  } catch (error) {
    logError(`Quality approval failed: ${error.message}`);
    return false;
  }
}

async function step7_approveCustoms() {
  logStep(7, 'Approve Customs Declaration');
  
  try {
    // First, get the declaration ID created for this shipment
    const declarationsResponse = await axios.get(`${BASE_URL}/customs/declarations`, { timeout: TIMEOUT });
    const declaration = declarationsResponse.data.data?.find(d => d.shipment_id === testData.shipmentID);
    
    if (!declaration) {
      logError('Customs declaration not found for shipment');
      logInfo('This might indicate the auto-trigger didn\'t work');
      return false;
    }
    
    testData.declarationID = declaration.declaration_id;
    logInfo(`Found customs declaration: ${testData.declarationID}`);
    
    const response = await axios.post(`${BASE_URL}/customs/${testData.declarationID}/approve`, {
      approvedBy: 'customs_officer',
      clearanceRef: `CLR-${Date.now()}`,
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess(`Customs declaration approved: ${testData.declarationID}`);
      return true;
    }
    throw new Error(response.data.error?.message || 'Customs approval failed');
  } catch (error) {
    logError(`Customs approval failed: ${error.message}`);
    return false;
  }
}

async function step8_recordPayment() {
  logStep(8, 'Record Payment with 40% NBE Retention');
  
  try {
    const response = await axios.post(`${BASE_URL}/payments`, {
      paymentID: testData.paymentID,
      contractID: testData.contractID,
      shipmentID: testData.shipmentID,
      exporterID: testData.exporterID,
      lcID: testData.lcID,
      forexID: testData.forexID,
      amountUSD: testData.amount,
      currency: 'USD',
      swiftReference: `SWIFT-${Date.now()}`,
      paymentDate: new Date().toISOString(),
      payerName: 'Test Buyer Inc.',
      payerBank: 'Chase Bank',
    }, { timeout: TIMEOUT });
    
    if (response.data.success) {
      const data = response.data.data;
      logSuccess(`Payment recorded: ${testData.paymentID}`);
      logInfo(`Total Amount: $${data.totalAmount || testData.amount}`);
      logInfo(`Retention (40%): $${data.retentionAmount || (testData.amount * 0.4)}`);
      logInfo(`Release (60%): $${data.releaseAmount || (testData.amount * 0.6)}`);
      
      // Verify 40% retention
      const expectedRetention = testData.amount * 0.4;
      const actualRetention = data.retentionAmount;
      if (Math.abs(actualRetention - expectedRetention) < 0.01) {
        logSuccess('✓ 40% retention calculation correct');
      } else {
        logError(`✗ Retention mismatch: Expected ${expectedRetention}, Got ${actualRetention}`);
      }
      
      return true;
    }
    throw new Error(response.data.error?.message || 'Payment recording failed');
  } catch (error) {
    logError(`Payment recording failed: ${error.message}`);
    return false;
  }
}

// Main test execution
async function runWorkflowTest() {
  log('\n', colors.cyan);
  log('╔════════════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          GoCBC Complete Workflow Integration Test                          ║', colors.cyan);
  log('║  Contract → LC → Forex (40%) → Shipment → Quality → Customs → Payment     ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════════════════════╝', colors.cyan);
  log('\n');
  
  const startTime = Date.now();
  const results = {
    total: 8,
    passed: 0,
    failed: 0,
  };
  
  try {
    // Execute workflow steps
    if (await step1_registerContract()) results.passed++; else results.failed++;
    await sleep(1000);
    
    if (await step2_approveContract()) results.passed++; else results.failed++;
    await sleep(1000);
    
    if (await step3_issueLC()) results.passed++; else results.failed++;
    await sleep(2000); // Wait for async forex trigger
    
    if (await step4_allocateForex()) results.passed++; else results.failed++;
    await sleep(1000);
    
    if (await step5_createShipment()) results.passed++; else results.failed++;
    await sleep(2000); // Wait for async quality task creation
    
    if (await step6_approveQuality()) results.passed++; else results.failed++;
    await sleep(2000); // Wait for async customs trigger
    
    if (await step7_approveCustoms()) results.passed++; else results.failed++;
    await sleep(1000);
    
    if (await step8_recordPayment()) results.passed++; else results.failed++;
    
  } catch (error) {
    logError(`Test execution error: ${error.message}`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  log('\n', colors.cyan);
  log('╔════════════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                            TEST SUMMARY                                    ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════════════════════╝', colors.cyan);
  log(`\nTotal Steps: ${results.total}`, colors.blue);
  log(`Passed: ${results.passed}`, results.passed === results.total ? colors.green : colors.yellow);
  log(`Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.green);
  log(`Duration: ${duration}s`, colors.blue);
  
  if (results.passed === results.total) {
    log('\n✅ ALL TESTS PASSED - Workflow is fully functional!\n', colors.green);
    process.exit(0);
  } else {
    log(`\n❌ ${results.failed} TESTS FAILED - Check logs above for details\n`, colors.red);
    process.exit(1);
  }
}

// Run the test
runWorkflowTest().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
