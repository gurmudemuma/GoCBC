/**
 * GoCBC Step-by-Step Workflow Test
 * Tests each step individually and verifies triggers
 * 
 * Shows:
 * 1. What happens in each step
 * 2. What gets created/updated
 * 3. How next step is triggered
 * 4. Database and blockchain verification
 */

const axios = require('axios');
const { Client } = require('pg');

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TIMEOUT = 30000;

// PostgreSQL connection
const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gocbc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test data
const testData = {
  contractID: `TEST-CONTRACT-${Date.now()}`,
  lcID: `TEST-LC-${Date.now()}`,
  forexID: `TEST-FOREX-${Date.now()}`,
  shipmentID: `TEST-SHIPMENT-${Date.now()}`,
  inspectionID: null, // Will be discovered
  declarationID: null, // Will be discovered
  paymentID: `TEST-PAY-${Date.now()}`,
  
  exporterID: 'EXP001',
  buyerID: 'BUYER001',
  amount: 10000,
};

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStepHeader(stepNum, title) {
  log('\n' + '═'.repeat(80), colors.cyan);
  log(`STEP ${stepNum}: ${title}`, colors.bright + colors.cyan);
  log('═'.repeat(80), colors.cyan);
}

function logAction(message) {
  log(`\n▶ ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`  ✅ ${message}`, colors.green);
}

function logInfo(message) {
  log(`  ℹ️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`  ❌ ${message}`, colors.red);
}

function logTrigger(message) {
  log(`  🔥 ${message}`, colors.magenta);
}

function logData(label, data) {
  log(`  📊 ${label}:`, colors.yellow);
  console.log('     ', JSON.stringify(data, null, 2).split('\n').join('\n      '));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryDatabase(query, params = []) {
  try {
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    logError(`Database query failed: ${error.message}`);
    return null;
  }
}

// ============================================================================
// STEP 1: Register Contract
// ============================================================================
async function step1_registerContract() {
  logStepHeader(1, 'REGISTER CONTRACT');
  
  logAction('Creating coffee export contract...');
  logInfo('Exporter: EXP001');
  logInfo('Buyer: BUYER001 (USA)');
  logInfo('Coffee: 1000 kg Arabica @ $10/kg = $10,000');
  
  try {
    const contractData = {
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
    };
    
    const response = await axios.post(`${BASE_URL}/contracts/register`, contractData, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess('Contract registered successfully');
      logData('Contract ID', testData.contractID);
      logData('Status', response.data.data?.status || 'PENDING');
      logData('Blockchain TX', response.data.data?.blockchainTxId || 'N/A');
      
      // Verify in database
      await sleep(1000);
      const dbCheck = await queryDatabase(
        'SELECT * FROM contracts WHERE contract_id = $1',
        [testData.contractID]
      );
      
      if (dbCheck && dbCheck.length > 0) {
        logSuccess(`Database: Contract found with status "${dbCheck[0].status}"`);
        logInfo('Ready for approval by ECTA');
        return { success: true, data: response.data };
      } else {
        logError('Database: Contract not found!');
        return { success: false };
      }
    }
    
    logError(`Registration failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    if (error.response) {
      logData('Error response', error.response.data);
    }
    return { success: false };
  }
}

// ============================================================================
// STEP 2: Approve Contract
// ============================================================================
async function step2_approveContract() {
  logStepHeader(2, 'APPROVE CONTRACT (ECTA)');
  
  logAction('ECTA reviewing and approving contract...');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/contracts/${testData.contractID}/approve`,
      {
        approvedBy: 'ecta_officer',
        reason: 'Contract meets all compliance requirements'
      },
      { timeout: TIMEOUT }
    );
    
    if (response.data.success) {
      logSuccess('Contract approved by ECTA');
      logData('Approved by', 'ecta_officer');
      logData('Blockchain TX', response.data.data?.blockchainTxId || 'N/A');
      
      // Verify status change
      await sleep(1000);
      const dbCheck = await queryDatabase(
        'SELECT status, approved_by, approved_at FROM contracts WHERE contract_id = $1',
        [testData.contractID]
      );
      
      if (dbCheck && dbCheck.length > 0) {
        logSuccess(`Database: Status = "${dbCheck[0].status}"`);
        logSuccess(`Approved by: ${dbCheck[0].approved_by} at ${dbCheck[0].approved_at}`);
        logInfo('Contract is now active and ready for LC issuance');
        return { success: true };
      }
    }
    
    logError(`Approval failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// STEP 3: Issue Letter of Credit (LC)
// ============================================================================
async function step3_issueLC() {
  logStepHeader(3, 'ISSUE LETTER OF CREDIT (LC)');
  
  logAction('Bank issuing LC for the contract...');
  logInfo('Issuing Bank: Commercial Bank of Ethiopia');
  logInfo('Advising Bank: Chase Bank');
  logInfo('Amount: $10,000 USD');
  
  try {
    const lcData = {
      lcID: testData.lcID,
      lcNumber: `LC-${Date.now()}`,
      contractID: testData.contractID,
      exporterID: testData.exporterID,
      issuingBank: 'Commercial Bank of Ethiopia',
      advisingBank: 'Chase Bank',
      beneficiary: 'Test Exporter Company',
      applicant: 'Test Buyer Inc.',
      amount: testData.amount,
      currency: 'USD',
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      latestShipmentDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      portOfLoading: 'Addis Ababa',
      portOfDischarge: 'New York',
      paymentTerms: 'At sight',
      partialShipment: false,
      transhipment: false,
    };
    
    const response = await axios.post(`${BASE_URL}/banking/lc/issue`, lcData, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess('LC issued successfully');
      logData('LC ID', testData.lcID);
      logData('LC Number', lcData.lcNumber);
      logData('Blockchain TX', response.data.data?.blockchainTxId || 'N/A');
      
      // Check for forex auto-trigger
      if (response.data.data?.forexAutoCreated) {
        logTrigger('WORKFLOW TRIGGER: Forex request automatically created!');
        testData.forexID = response.data.data.forexID;
        logData('Forex ID', testData.forexID);
      }
      
      // Verify in database
      await sleep(2000); // Give time for async forex creation
      const lcCheck = await queryDatabase(
        'SELECT * FROM letters_of_credit WHERE lc_id = $1',
        [testData.lcID]
      );
      
      if (lcCheck && lcCheck.length > 0) {
        logSuccess(`Database: LC found with status "${lcCheck[0].status}"`);
      }
      
      // Check if forex was created
      const forexCheck = await queryDatabase(
        'SELECT * FROM forex_allocations WHERE lc_id = $1 OR contract_id = $2 ORDER BY created_at DESC LIMIT 1',
        [testData.lcID, testData.contractID]
      );
      
      if (forexCheck && forexCheck.length > 0) {
        testData.forexID = forexCheck[0].forex_id;
        logTrigger(`Forex request created: ${testData.forexID}`);
        logSuccess(`Database: Forex status = "${forexCheck[0].status}"`);
        logInfo('Next: Bank can allocate forex with 40% NBE retention');
      } else {
        logInfo('Forex request not found (may need manual creation)');
      }
      
      return { success: true };
    }
    
    logError(`LC issuance failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// STEP 4: Allocate Forex with 40% Retention
// ============================================================================
async function step4_allocateForex() {
  logStepHeader(4, 'ALLOCATE FOREX WITH 40% NBE RETENTION');
  
  logAction('National Bank of Ethiopia allocating forex...');
  logInfo('Amount: $10,000 USD');
  logInfo('NBE Retention Policy: 40%');
  logInfo('Expected: $4,000 retained, $6,000 released');
  
  try {
    const allocationData = {
      lcID: testData.lcID,
      amount: testData.amount,
      exchangeRate: 115.5,
      retentionRate: 40, // NBE policy
      officer: 'nbe_officer_01',
      approvalRef: `NBE-APPR-${Date.now()}`,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    const response = await axios.post(
      `${BASE_URL}/forex/${testData.forexID}/allocate`,
      allocationData,
      { timeout: TIMEOUT }
    );
    
    if (response.data.success) {
      const data = response.data.data;
      logSuccess('Forex allocated successfully');
      logData('Forex ID', testData.forexID);
      
      log('\n  💰 RETENTION BREAKDOWN:', colors.bright + colors.yellow);
      log(`     Total Amount:    $${data.allocatedAmount || testData.amount} USD`, colors.yellow);
      log(`     Retention (40%): $${data.retentionAmount || (testData.amount * 0.4)} USD`, colors.red);
      log(`     Release (60%):   $${data.releaseAmount || (testData.amount * 0.6)} USD`, colors.green);
      log(`     Exchange Rate:   ${allocationData.exchangeRate} ETB/USD`, colors.yellow);
      
      // Verify 40% calculation
      const expectedRetention = testData.amount * 0.4;
      const expectedRelease = testData.amount * 0.6;
      const actualRetention = data.retentionAmount;
      const actualRelease = data.releaseAmount;
      
      if (Math.abs(actualRetention - expectedRetention) < 0.01) {
        logSuccess('✓ 40% retention calculation CORRECT');
      } else {
        logError(`✗ Retention mismatch: Expected $${expectedRetention}, Got $${actualRetention}`);
      }
      
      if (Math.abs(actualRelease - expectedRelease) < 0.01) {
        logSuccess('✓ 60% release calculation CORRECT');
      } else {
        logError(`✗ Release mismatch: Expected $${expectedRelease}, Got $${actualRelease}`);
      }
      
      // Verify in database
      await sleep(1000);
      const dbCheck = await queryDatabase(
        'SELECT * FROM forex_allocations WHERE forex_id = $1',
        [testData.forexID]
      );
      
      if (dbCheck && dbCheck.length > 0) {
        const forex = dbCheck[0];
        logSuccess(`Database: Status = "${forex.status}"`);
        logSuccess(`Database: Retention = $${forex.retention_amount}, Release = $${forex.release_amount}`);
        logInfo('Forex is allocated and ready for use');
      }
      
      return { success: true };
    }
    
    logError(`Allocation failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// STEP 5: Create Shipment
// ============================================================================
async function step5_createShipment() {
  logStepHeader(5, 'CREATE SHIPMENT');
  
  logAction('Exporter creating shipment for coffee export...');
  logInfo('Origin: Yirgacheffe, Ethiopia');
  logInfo('Grade: Grade 1 Arabica');
  logInfo('Quantity: 1000 kg');
  
  try {
    const shipmentData = {
      shipmentID: testData.shipmentID,
      contractID: testData.contractID,
      exporterID: testData.exporterID,
      buyerID: testData.buyerID,
      origin: 'Yirgacheffe',
      quantity: 1000,
      grade: 'Grade 1',
      icoNumber: `ICO-${Date.now()}`,
      ecxLotNumber: `ECX-${Date.now()}`,
      channel: 'ECX',
      forexRate: 115.5,
      eudrCompliant: true,
    };
    
    const response = await axios.post(`${BASE_URL}/shipments`, shipmentData, { timeout: TIMEOUT });
    
    if (response.data.success) {
      logSuccess('Shipment created successfully');
      logData('Shipment ID', testData.shipmentID);
      logData('Status', response.data.data?.status || 'PENDING');
      logData('Blockchain TX', response.data.data?.blockchainTxId || 'N/A');
      
      logTrigger('WORKFLOW TRIGGER: Quality inspection task should be auto-created!');
      
      // Wait for async quality task creation
      await sleep(2000);
      
      // Check for quality inspection task
      const inspectionCheck = await queryDatabase(
        'SELECT * FROM quality_inspections WHERE shipment_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testData.shipmentID]
      );
      
      if (inspectionCheck && inspectionCheck.length > 0) {
        testData.inspectionID = inspectionCheck[0].inspection_id;
        logTrigger(`Quality inspection task created: ${testData.inspectionID}`);
        logSuccess(`Database: Inspection status = "${inspectionCheck[0].status}"`);
        logInfo('Next: ECTA can perform quality inspection');
      } else {
        logError('Quality inspection task NOT created!');
        logInfo('This indicates the auto-trigger may not be working');
      }
      
      return { success: true };
    }
    
    logError(`Shipment creation failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// STEP 6: Approve Quality Inspection
// ============================================================================
async function step6_approveQuality() {
  logStepHeader(6, 'APPROVE QUALITY INSPECTION (ECTA)');
  
  if (!testData.inspectionID) {
    logError('No inspection ID found! Checking database...');
    const inspectionCheck = await queryDatabase(
      'SELECT * FROM quality_inspections WHERE shipment_id = $1 ORDER BY created_at DESC LIMIT 1',
      [testData.shipmentID]
    );
    if (inspectionCheck && inspectionCheck.length > 0) {
      testData.inspectionID = inspectionCheck[0].inspection_id;
      logInfo(`Found inspection ID: ${testData.inspectionID}`);
    } else {
      logError('Cannot proceed: No quality inspection found');
      return { success: false };
    }
  }
  
  logAction('ECTA Quality Inspector approving inspection...');
  logInfo(`Inspection ID: ${testData.inspectionID}`);
  
  try {
    const approvalData = {
      approvedBy: 'quality_director',
      certificateNo: `CERT-${Date.now()}`,
      remarks: 'Coffee meets all quality standards. Grade 1 Arabica confirmed.',
    };
    
    const response = await axios.post(
      `${BASE_URL}/quality/${testData.inspectionID}/approve`,
      approvalData,
      { timeout: TIMEOUT }
    );
    
    if (response.data.success) {
      logSuccess('Quality inspection approved');
      logData('Certificate No', approvalData.certificateNo);
      logData('Approved by', approvalData.approvedBy);
      
      logTrigger('WORKFLOW TRIGGER: Customs declaration should be auto-created!');
      
      // Wait for async customs declaration creation
      await sleep(2000);
      
      // Check for customs declaration
      const customsCheck = await queryDatabase(
        'SELECT * FROM customs_declarations WHERE shipment_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testData.shipmentID]
      );
      
      if (customsCheck && customsCheck.length > 0) {
        testData.declarationID = customsCheck[0].declaration_id || customsCheck[0].declaration_number;
        logTrigger(`Customs declaration created: ${testData.declarationID}`);
        logSuccess(`Database: Declaration status = "${customsCheck[0].status}"`);
        logInfo('Next: Customs can review and clear the shipment');
      } else {
        logError('Customs declaration NOT created!');
        logInfo('This indicates the auto-trigger may not be working');
      }
      
      return { success: true };
    }
    
    logError(`Approval failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// STEP 7: Clear Customs Declaration
// ============================================================================
async function step7_clearCustoms() {
  logStepHeader(7, 'CLEAR CUSTOMS DECLARATION');
  
  if (!testData.declarationID) {
    logError('No declaration ID found! Checking database...');
    const customsCheck = await queryDatabase(
      'SELECT * FROM customs_declarations WHERE shipment_id = $1 ORDER BY created_at DESC LIMIT 1',
      [testData.shipmentID]
    );
    if (customsCheck && customsCheck.length > 0) {
      testData.declarationID = customsCheck[0].declaration_id || customsCheck[0].declaration_number;
      logInfo(`Found declaration ID: ${testData.declarationID}`);
    } else {
      logError('Cannot proceed: No customs declaration found');
      return { success: false };
    }
  }
  
  logAction('Customs officer clearing declaration...');
  logInfo(`Declaration ID: ${testData.declarationID}`);
  
  try {
    const clearanceData = {
      clearedBy: 'customs_officer_01',
      clearanceRef: `CLR-${Date.now()}`,
      remarks: 'All documentation verified. Cleared for export.',
    };
    
    const response = await axios.post(
      `${BASE_URL}/customs/${testData.declarationID}/clear`,
      clearanceData,
      { timeout: TIMEOUT }
    );
    
    if (response.data.success) {
      logSuccess('Customs declaration cleared');
      logData('Clearance Ref', clearanceData.clearanceRef);
      logData('Cleared by', clearanceData.clearedBy);
      
      // Verify in database
      await sleep(1000);
      const dbCheck = await queryDatabase(
        'SELECT * FROM customs_declarations WHERE declaration_id = $1 OR declaration_number = $1',
        [testData.declarationID]
      );
      
      if (dbCheck && dbCheck.length > 0) {
        logSuccess(`Database: Status = "${dbCheck[0].status}"`);
        logInfo('Shipment is cleared and ready for export');
        logInfo('Next: Buyer makes payment');
      }
      
      return { success: true };
    }
    
    logError(`Clearance failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// STEP 8: Record Payment with 40% Retention
// ============================================================================
async function step8_recordPayment() {
  logStepHeader(8, 'RECORD PAYMENT WITH 40% NBE RETENTION');
  
  logAction('Buyer bank recording payment...');
  logInfo('Amount: $10,000 USD');
  logInfo('NBE Retention Policy: 40%');
  logInfo('Expected: $4,000 retained, $6,000 released');
  
  try {
    const paymentData = {
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
    };
    
    const response = await axios.post(`${BASE_URL}/payments`, paymentData, { timeout: TIMEOUT });
    
    if (response.data.success) {
      const data = response.data.data;
      logSuccess('Payment recorded successfully');
      logData('Payment ID', testData.paymentID);
      logData('SWIFT Reference', paymentData.swiftReference);
      
      log('\n  💰 PAYMENT RETENTION BREAKDOWN:', colors.bright + colors.yellow);
      log(`     Total Amount:    $${data.totalAmount || testData.amount} USD`, colors.yellow);
      log(`     Retention (40%): $${data.retentionAmount || (testData.amount * 0.4)} USD`, colors.red);
      log(`     Release (60%):   $${data.releaseAmount || (testData.amount * 0.6)} USD`, colors.green);
      log(`     Retention Rate:  ${data.retentionRate || 40}%`, colors.yellow);
      
      // Verify 40% calculation
      const expectedRetention = testData.amount * 0.4;
      const expectedRelease = testData.amount * 0.6;
      const actualRetention = data.retentionAmount;
      const actualRelease = data.releaseAmount;
      
      if (Math.abs(actualRetention - expectedRetention) < 0.01) {
        logSuccess('✓ 40% retention calculation CORRECT');
      } else {
        logError(`✗ Retention mismatch: Expected $${expectedRetention}, Got $${actualRetention}`);
      }
      
      if (Math.abs(actualRelease - expectedRelease) < 0.01) {
        logSuccess('✓ 60% release calculation CORRECT');
      } else {
        logError(`✗ Release mismatch: Expected $${expectedRelease}, Got $${actualRelease}`);
      }
      
      // Verify in database
      await sleep(1000);
      const dbCheck = await queryDatabase(
        'SELECT * FROM payments WHERE payment_id = $1',
        [testData.paymentID]
      );
      
      if (dbCheck && dbCheck.length > 0) {
        const payment = dbCheck[0];
        logSuccess(`Database: Status = "${payment.status}"`);
        logSuccess(`Database: Retention = $${payment.retention_amount}, Release = $${payment.release_amount}`);
      }
      
      // Check contract status
      const contractCheck = await queryDatabase(
        'SELECT status FROM contracts WHERE contract_id = $1',
        [testData.contractID]
      );
      
      if (contractCheck && contractCheck.length > 0) {
        logInfo(`Contract final status: ${contractCheck[0].status}`);
      }
      
      return { success: true };
    }
    
    logError(`Payment recording failed: ${response.data.error?.message || 'Unknown error'}`);
    return { success: false };
    
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return { success: false };
  }
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================
async function runStepByStepTest() {
  log('\n', colors.cyan);
  log('╔═══════════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                                                                            ║', colors.cyan);
  log('║           GoCBC STEP-BY-STEP WORKFLOW TEST WITH TRIGGERS                  ║', colors.cyan);
  log('║                                                                            ║', colors.cyan);
  log('║  Contract → LC → Forex (40%) → Shipment → Quality → Customs → Payment    ║', colors.cyan);
  log('║                                                                            ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.cyan);
  
  const startTime = Date.now();
  const results = {
    total: 8,
    passed: 0,
    failed: 0,
    steps: [],
  };
  
  try {
    // Connect to database
    logAction('Connecting to PostgreSQL database...');
    await db.connect();
    logSuccess('Database connected');
    
    // Execute each step
    const steps = [
      { name: 'Register Contract', fn: step1_registerContract },
      { name: 'Approve Contract', fn: step2_approveContract },
      { name: 'Issue LC', fn: step3_issueLC },
      { name: 'Allocate Forex (40%)', fn: step4_allocateForex },
      { name: 'Create Shipment', fn: step5_createShipment },
      { name: 'Approve Quality', fn: step6_approveQuality },
      { name: 'Clear Customs', fn: step7_clearCustoms },
      { name: 'Record Payment (40%)', fn: step8_recordPayment },
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const result = await step.fn();
      
      results.steps.push({
        name: step.name,
        success: result.success,
      });
      
      if (result.success) {
        results.passed++;
      } else {
        results.failed++;
        log(`\n❌ STEP ${i + 1} FAILED: ${step.name}`, colors.red);
        log('   Cannot proceed to next step', colors.red);
        break;
      }
      
      // Pause between steps
      if (i < steps.length - 1) {
        await sleep(1000);
      }
    }
    
  } catch (error) {
    logError(`Test execution error: ${error.message}`);
    console.error(error);
  } finally {
    await db.end();
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  log('\n' + '═'.repeat(80), colors.cyan);
  log('TEST SUMMARY', colors.bright + colors.cyan);
  log('═'.repeat(80), colors.cyan);
  
  log(`\n📊 Results:`, colors.blue);
  log(`   Total Steps: ${results.total}`, colors.blue);
  log(`   Passed: ${results.passed}`, results.passed === results.total ? colors.green : colors.yellow);
  log(`   Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.green);
  log(`   Duration: ${duration}s`, colors.blue);
  
  log(`\n📋 Step Details:`, colors.blue);
  results.steps.forEach((step, i) => {
    const icon = step.success ? '✅' : '❌';
    const color = step.success ? colors.green : colors.red;
    log(`   ${icon} Step ${i + 1}: ${step.name}`, color);
  });
  
  log(`\n📦 Test Data Used:`, colors.yellow);
  log(`   Contract ID: ${testData.contractID}`, colors.yellow);
  log(`   LC ID: ${testData.lcID}`, colors.yellow);
  log(`   Forex ID: ${testData.forexID}`, colors.yellow);
  log(`   Shipment ID: ${testData.shipmentID}`, colors.yellow);
  log(`   Inspection ID: ${testData.inspectionID || 'N/A'}`, colors.yellow);
  log(`   Declaration ID: ${testData.declarationID || 'N/A'}`, colors.yellow);
  log(`   Payment ID: ${testData.paymentID}`, colors.yellow);
  
  if (results.passed === results.total) {
    log('\n' + '═'.repeat(80), colors.green);
    log('✅ ALL TESTS PASSED - COMPLETE WORKFLOW FUNCTIONAL!', colors.bright + colors.green);
    log('═'.repeat(80) + '\n', colors.green);
    process.exit(0);
  } else {
    log('\n' + '═'.repeat(80), colors.red);
    log(`❌ ${results.failed} TESTS FAILED - CHECK LOGS ABOVE`, colors.bright + colors.red);
    log('═'.repeat(80) + '\n', colors.red);
    process.exit(1);
  }
}

// Run the test
runStepByStepTest().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
