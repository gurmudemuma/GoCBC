#!/usr/bin/env node
/**
 * CECBS Payment Methods Test Suite
 * Tests all 5 payment methods with their unique workflows
 * 
 * Payment Methods:
 * 1. LC - Letter of Credit (Documentary Credit with bank guarantee)
 * 2. CAD - Cash Against Documents (Documentary Collection, no guarantee)
 * 3. TT_ADVANCE - Telegraphic Transfer Advance (Payment before shipment)
 * 4. TT_POST - Telegraphic Transfer Post-shipment (Payment after shipment)
 * 5. ADVANCE - Advance Payment (Payment before production/sourcing)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_ID = Date.now().toString().slice(-6);

// Test data
const BASE_CONTRACT_ID = `CONTRACT_PM_${TEST_ID}`;
const BASE_EXPORTER_ID = 'EXP6896621';
const BASE_SHIPMENT_ID = `SHIP_PM_${TEST_ID}`;

let tokens = {};

// Color output
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(method, step, message) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`[${method}] STEP ${step}: ${message}`, 'bright');
  log('='.repeat(70), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'yellow');
}

function logMethod(method, description) {
  log(`\n${'█'.repeat(70)}`, 'magenta');
  log(`█  TESTING: ${method} - ${description}`, 'magenta');
  log('█'.repeat(70), 'magenta');
}

async function login(username, password, role) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username,
      password
    });
    tokens[role] = response.data.data?.token || response.data.token;
    return tokens[role];
  } catch (error) {
    logError(`Failed to login as ${username}: ${error.response?.data?.error?.message || error.message}`);
    throw error;
  }
}

// Helper: Create contract for payment test
async function createContract(contractID, value = 170000) {
  await login('ecta_admin', 'password123', 'ECTA');
  
  const contractData = {
    contractID: contractID,
    exporterID: BASE_EXPORTER_ID,
    exporterName: 'Premium Coffee Exporters PLC',
    buyerID: 'BUYER_USA_PM',
    buyerName: 'American Coffee Importers Inc',
    buyerCountry: 'USA',
    buyerBank: 'Bank of America',
    exporterBank: 'Commercial Bank of Ethiopia',
    coffeeType: 'Arabica Sidamo',
    quantity: 20000,
    pricePerKg: 8.50,
    totalValue: value,
    currency: 'USD',
    eudrRequired: true
  };
  
  await axios.post(`${API_BASE}/contracts`, contractData, {
    headers: { 'Authorization': `Bearer ${tokens.ECTA}` }
  });
  
  await login('nbe_admin', 'password123', 'NBE');
  await axios.post(`${API_BASE}/contracts/${contractID}/approve`, 
    { remarks: 'Approved for payment method testing' },
    { headers: { 'Authorization': `Bearer ${tokens.NBE}` } }
  );
  
  return contractID;
}

// Helper: Create shipment for payment test
async function createShipment(shipmentID, contractID) {
  await login('ecta_admin', 'password123', 'ECTA');
  
  const shipmentData = {
    shipmentID: shipmentID,
    contractID: contractID,
    exporterID: BASE_EXPORTER_ID,
    buyerID: 'BUYER_USA_PM',
    origin: 'Sidamo',
    quantity: '20000',
    grade: 'Grade 1',
    icoNumber: `ICO-PM-${TEST_ID}`,
    ecxLotNumber: `ECX-PM-${TEST_ID}`,
    channel: 'EXPORT',
    forexRate: '121.50',
    valueUSD: '170000',
    eudrCompliant: true,
    transportMode: 'SEA',
    shippingLine: 'Maersk Line',
    departurePort: 'Djibouti Port',
    destinationPort: 'Los Angeles Port',
    vesselName: 'MV Coffee Carrier',
    estimatedDeparture: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
  
  await axios.post(`${API_BASE}/shipments`, shipmentData, {
    headers: { 'Authorization': `Bearer ${tokens.ECTA}` }
  });
  
  return shipmentID;
}

// Helper: Create and issue LC for methods that require it
async function createAndIssueLC(lcID, contractID, amount = 170000) {
  await login('bank_admin', 'password123', 'BANKS');
  
  const lcRequestData = {
    lcID: lcID,
    contractID: contractID,
    exporterID: BASE_EXPORTER_ID,
    bankName: 'Commercial Bank of Ethiopia',
    amount: amount.toString(),
    currency: 'USD',
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
  
  await axios.post(`${API_BASE}/banking/lc/request`, lcRequestData, {
    headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
  });
  
  const lcApproveData = {
    issuingBank: 'Bank of America',
    beneficiaryBank: 'Commercial Bank of Ethiopia',
    beneficiary: BASE_EXPORTER_ID
  };
  
  await axios.post(`${API_BASE}/banking/lc/${lcID}/approve`, lcApproveData, {
    headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
  });
  
  await axios.post(`${API_BASE}/banking/lc/${lcID}/issue`, 
    { terms: 'Standard LC terms' },
    { headers: { 'Authorization': `Bearer ${tokens.BANKS}` } }
  );
  
  return lcID;
}

// ==================== TEST 1: LC - LETTER OF CREDIT ====================
async function testLC() {
  logMethod('LC', 'Letter of Credit (Documentary Credit with Bank Guarantee)');
  
  try {
    const contractID = `${BASE_CONTRACT_ID}_LC`;
    const shipmentID = `${BASE_SHIPMENT_ID}_LC`;
    const lcID = `LC_PM_${TEST_ID}_LC`;
    const paymentID = `PAY_PM_${TEST_ID}_LC`;
    
    logStep('LC', 1, 'Setup: Create Contract, Shipment, and Issue LC');
    await createContract(contractID);
    await createShipment(shipmentID, contractID);
    await createAndIssueLC(lcID, contractID);
    logSuccess('Prerequisites created: Contract, Shipment, LC issued');
    
    logStep('LC', 2, 'Initiate Payment');
    await login('bank_admin', 'password123', 'BANKS');
    
    const initiateData = {
      paymentID: paymentID,
      contractID: contractID,
      lcID: lcID,
      shipmentID: shipmentID,
      exporterID: BASE_EXPORTER_ID,
      amount: 170000,
      currency: 'USD',
      paymentMethod: 'LC',
      receivingBank: 'Commercial Bank of Ethiopia',
      receivingBankBIC: 'CBETETAA',
      beneficiaryName: 'Premium Coffee Exporters PLC',
      beneficiaryAccount: '1000123456789'
    };
    
    await axios.post(`${API_BASE}/payments/initiate`, initiateData, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess(`Payment initiated: ${paymentID}`);
    
    logStep('LC', 3, 'Submit Payment Documents');
    await axios.post(`${API_BASE}/payments/${paymentID}/documents`, {
      documents: ['Bill of Lading', 'Commercial Invoice', 'Certificate of Origin', 'Quality Certificate']
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Documents submitted for bank verification');
    
    logStep('LC', 4, 'Verify Payment Documents');
    await axios.post(`${API_BASE}/payments/${paymentID}/verify`, {
      verifiedBy: 'Bank Compliance Officer',
      comments: 'All documents comply with LC terms'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Documents verified by bank');
    
    logStep('LC', 5, 'Settle Payment with NBE Retention');
    await axios.post(`${API_BASE}/payments/${paymentID}/settle`, {
      exchangeRate: '121.50',
      retentionRate: '30',
      payingBank: 'Bank of America',
      payingBankBIC: 'BOFAUS3N',
      swiftReference: `SWIFT-LC-${TEST_ID}`,
      nbeApprovalRef: `NBE-LC-${TEST_ID}`
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Payment settled: $170,000 with 30% NBE retention');
    logInfo('LC Method: Bank guaranteed, lowest risk, highest security');
    
    return { success: true, paymentID };
  } catch (error) {
    logError(`LC test failed: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== TEST 2: CAD - CASH AGAINST DOCUMENTS ====================
async function testCAD() {
  logMethod('CAD', 'Cash Against Documents (Documentary Collection, No Guarantee)');
  
  try {
    const contractID = `${BASE_CONTRACT_ID}_CAD`;
    const shipmentID = `${BASE_SHIPMENT_ID}_CAD`;
    const paymentID = `PAY_PM_${TEST_ID}_CAD`;
    
    logStep('CAD', 1, 'Setup: Create Contract and Shipment');
    await createContract(contractID);
    await createShipment(shipmentID, contractID);
    logSuccess('Prerequisites created (No LC required for CAD)');
    
    logStep('CAD', 2, 'Initiate CAD Payment');
    await login('bank_admin', 'password123', 'BANKS');
    
    const initiateData = {
      paymentID: paymentID,
      contractID: contractID,
      lcID: 'N/A',
      shipmentID: shipmentID,
      exporterID: BASE_EXPORTER_ID,
      amount: 170000,
      currency: 'USD',
      paymentMethod: 'CAD',
      receivingBank: 'Commercial Bank of Ethiopia',
      receivingBankBIC: 'CBETETAA',
      beneficiaryName: 'Premium Coffee Exporters PLC',
      beneficiaryAccount: '1000123456789'
    };
    
    await axios.post(`${API_BASE}/payments/initiate`, initiateData, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess(`CAD payment initiated: ${paymentID}`);
    logInfo('CAD: Bank acts as intermediary, no payment guarantee');
    
    logStep('CAD', 3, 'Update Status: Goods Shipped');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'GOODS_SHIPPED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Status updated: GOODS_SHIPPED');
    
    logStep('CAD', 4, 'Update Status: Documents Sent to Bank');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'DOCUMENTS_SENT_TO_BANK'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Documents sent to bank');
    
    logStep('CAD', 5, 'Update Status: Documents Forwarded');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'DOCUMENTS_FORWARDED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Documents forwarded to buyer bank');
    
    logStep('CAD', 6, 'Update Status: Buyer Notified');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'BUYER_NOTIFIED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Buyer notified to release payment');
    
    logStep('CAD', 7, 'Update Status: Payment Received from Buyer');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'PAYMENT_RECEIVED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Buyer payment received');
    
    logStep('CAD', 8, 'Update Status: Documents Released');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'DOCUMENTS_RELEASED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Documents released to buyer');
    
    logStep('CAD', 9, 'Settle Payment (via status update)');
    // CAD: DOCUMENTS_RELEASED → SETTLED (direct via status update)
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'SETTLED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('CAD settled: $170,000 with 40% NBE retention');
    logInfo('CAD Method: Medium risk, buyer pays on document presentation');
    
    return { success: true, paymentID };
  } catch (error) {
    logError(`CAD test failed: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== TEST 3: TT_ADVANCE - TELEGRAPHIC TRANSFER ADVANCE ====================
async function testTTAdvance() {
  logMethod('TT_ADVANCE', 'Telegraphic Transfer Advance (Payment Before Shipment)');
  
  try {
    const contractID = `${BASE_CONTRACT_ID}_TTA`;
    const shipmentID = `${BASE_SHIPMENT_ID}_TTA`;
    const paymentID = `PAY_PM_${TEST_ID}_TTA`;
    
    logStep('TT_ADVANCE', 1, 'Setup: Create Contract');
    await createContract(contractID);
    logSuccess('Contract created (Shipment created after advance payment)');
    
    logStep('TT_ADVANCE', 2, 'Initiate TT Advance Payment');
    await login('bank_admin', 'password123', 'BANKS');
    
    const initiateData = {
      paymentID: paymentID,
      contractID: contractID,
      lcID: 'N/A',
      shipmentID: 'PENDING',
      exporterID: BASE_EXPORTER_ID,
      amount: 170000,
      currency: 'USD',
      paymentMethod: 'TT_ADVANCE',
      receivingBank: 'Commercial Bank of Ethiopia',
      receivingBankBIC: 'CBETETAA',
      beneficiaryName: 'Premium Coffee Exporters PLC',
      beneficiaryAccount: '1000123456789'
    };
    
    await axios.post(`${API_BASE}/payments/initiate`, initiateData, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess(`TT_ADVANCE payment initiated: ${paymentID}`);
    
    logStep('TT_ADVANCE', 3, 'Receive Advance Payment (30%)');
    await axios.post(`${API_BASE}/payments/${paymentID}/advance`, {
      advancePercentage: '30',
      amountReceived: '51000'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Advance received: $51,000 (30%)');
    logInfo('Exporter can now source coffee and prepare shipment');
    
    logStep('TT_ADVANCE', 4, 'Create Shipment After Advance');
    await createShipment(shipmentID, contractID);
    logSuccess('Shipment created and goods ready');
    
    logStep('TT_ADVANCE', 5, 'Receive Balance Payment (70%)');
    await axios.post(`${API_BASE}/payments/${paymentID}/balance`, {
      amountReceived: '119000'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Balance received: $119,000 (70%)');
    
    logStep('TT_ADVANCE', 6, 'Settle Complete Payment (via status update)');
    // TT_ADVANCE: BALANCE_RECEIVED → SETTLED (direct via status update)
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'SETTLED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('TT_ADVANCE settled: $170,000 total with 30% NBE retention');
    logInfo('TT_ADVANCE Method: Low risk for exporter, advance helps with cash flow');
    
    return { success: true, paymentID };
  } catch (error) {
    logError(`TT_ADVANCE test failed: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== TEST 4: TT_POST - TELEGRAPHIC TRANSFER POST-SHIPMENT ====================
async function testTTPost() {
  logMethod('TT_POST', 'Telegraphic Transfer Post-Shipment (Payment After Shipment)');
  
  try {
    const contractID = `${BASE_CONTRACT_ID}_TTP`;
    const shipmentID = `${BASE_SHIPMENT_ID}_TTP`;
    const paymentID = `PAY_PM_${TEST_ID}_TTP`;
    
    logStep('TT_POST', 1, 'Setup: Create Contract and Shipment');
    await createContract(contractID);
    await createShipment(shipmentID, contractID);
    logSuccess('Contract and shipment created');
    
    logStep('TT_POST', 2, 'Initiate TT Post-Shipment Payment');
    await login('bank_admin', 'password123', 'BANKS');
    
    const initiateData = {
      paymentID: paymentID,
      contractID: contractID,
      lcID: 'N/A',
      shipmentID: shipmentID,
      exporterID: BASE_EXPORTER_ID,
      amount: 170000,
      currency: 'USD',
      paymentMethod: 'TT_POST',
      receivingBank: 'Commercial Bank of Ethiopia',
      receivingBankBIC: 'CBETETAA',
      beneficiaryName: 'Premium Coffee Exporters PLC',
      beneficiaryAccount: '1000123456789'
    };
    
    await axios.post(`${API_BASE}/payments/initiate`, initiateData, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess(`TT_POST payment initiated: ${paymentID}`);
    
    logStep('TT_POST', 3, 'Update Status: Goods Shipped');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'GOODS_SHIPPED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Goods shipped, documents sent directly to buyer');
    logInfo('TT_POST: High risk - exporter ships before receiving payment');
    
    logStep('TT_POST', 4, 'Update Status: Documents Sent Directly');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'DOCUMENTS_SENT_DIRECTLY'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Documents sent directly to buyer');
    
    logStep('TT_POST', 5, 'Update Status: Payment Awaited');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'PAYMENT_AWAITED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Awaiting payment from buyer');
    
    logStep('TT_POST', 6, 'Update Status: Payment Received');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'PAYMENT_RECEIVED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Payment received from buyer');
    
    logStep('TT_POST', 7, 'Settle Payment (via status update)');
    // TT_POST: PAYMENT_RECEIVED → SETTLED (direct via status update)
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'SETTLED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('TT_POST settled: $170,000 with 50% NBE retention (high risk)');
    logInfo('TT_POST Method: Highest risk for exporter, trust-based payment');
    
    return { success: true, paymentID };
  } catch (error) {
    logError(`TT_POST test failed: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== TEST 5: ADVANCE - ADVANCE PAYMENT ====================
async function testAdvance() {
  logMethod('ADVANCE', 'Advance Payment (Payment Before Production/Sourcing)');
  
  try {
    const contractID = `${BASE_CONTRACT_ID}_ADV`;
    const shipmentID = `${BASE_SHIPMENT_ID}_ADV`;
    const paymentID = `PAY_PM_${TEST_ID}_ADV`;
    
    logStep('ADVANCE', 1, 'Initiate Advance Payment (Before Contract)');
    await login('bank_admin', 'password123', 'BANKS');
    
    const initiateData = {
      paymentID: paymentID,
      contractID: 'PENDING',
      lcID: 'N/A',
      shipmentID: 'PENDING',
      exporterID: BASE_EXPORTER_ID,
      amount: 170000,
      currency: 'USD',
      paymentMethod: 'ADVANCE',
      receivingBank: 'Commercial Bank of Ethiopia',
      receivingBankBIC: 'CBETETAA',
      beneficiaryName: 'Premium Coffee Exporters PLC',
      beneficiaryAccount: '1000123456789'
    };
    
    await axios.post(`${API_BASE}/payments/initiate`, initiateData, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess(`ADVANCE payment initiated: ${paymentID}`);
    logInfo('Advance payment received before coffee sourcing');
    
    logStep('ADVANCE', 2, 'Receive 100% Advance Payment');
    await axios.post(`${API_BASE}/payments/${paymentID}/advance`, {
      advancePercentage: '100',
      amountReceived: '170000'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Full advance received: $170,000 (100%)');
    logInfo('Exporter uses advance to source coffee from farmers');
    
    logStep('ADVANCE', 3, 'Register Contract After Sourcing');
    await createContract(contractID);
    logSuccess('Contract registered after coffee sourced');
    
    logStep('ADVANCE', 4, 'Create Shipment After Processing');
    await createShipment(shipmentID, contractID);
    logSuccess('Coffee processed and shipment ready');
    
    logStep('ADVANCE', 5, 'Update Status: Contract Registered');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'CONTRACT_REGISTERED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Contract registered in system');
    
    logStep('ADVANCE', 6, 'Update Status: Coffee Sourcing');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'COFFEE_SOURCING'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Coffee sourcing from farmers');
    
    logStep('ADVANCE', 7, 'Update Status: Quality Inspection');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'QUALITY_INSPECTION'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Quality inspection completed');
    
    logStep('ADVANCE', 8, 'Update Status: Goods Shipped');
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'GOODS_SHIPPED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('Goods shipped to buyer');
    
    logStep('ADVANCE', 9, 'Settle Full Advance Payment (via status update)');
    // ADVANCE: GOODS_SHIPPED → SETTLED (100% advance, direct settlement)
    await axios.post(`${API_BASE}/payments/${paymentID}/status`, {
      status: 'SETTLED'
    }, {
      headers: { 'Authorization': `Bearer ${tokens.BANKS}` }
    });
    logSuccess('ADVANCE settled: $170,000 with 20% NBE retention (low risk)');
    logInfo('ADVANCE Method: Lowest risk for exporter, payment secured upfront');
    
    return { success: true, paymentID };
  } catch (error) {
    logError(`ADVANCE test failed: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== MAIN TEST RUNNER ====================
async function runAllTests() {
  log('\n' + '█'.repeat(70), 'bright');
  log('█  CECBS PAYMENT METHODS COMPREHENSIVE TEST SUITE', 'bright');
  log('█  Testing all 5 payment methods with their unique workflows', 'bright');
  log('█'.repeat(70) + '\n', 'bright');
  
  const results = {
    LC: null,
    CAD: null,
    TT_ADVANCE: null,
    TT_POST: null,
    ADVANCE: null
  };
  
  // Run all tests
  results.LC = await testLC();
  results.CAD = await testCAD();
  results.TT_ADVANCE = await testTTAdvance();
  results.TT_POST = await testTTPost();
  results.ADVANCE = await testAdvance();
  
  // Print summary
  log('\n' + '█'.repeat(70), 'green');
  log('█  TEST SUMMARY', 'green');
  log('█'.repeat(70), 'green');
  
  let passCount = 0;
  let failCount = 0;
  
  Object.entries(results).forEach(([method, result]) => {
    if (result.success) {
      logSuccess(`${method}: PASSED - Payment ID: ${result.paymentID}`);
      passCount++;
    } else {
      logError(`${method}: FAILED - ${result.error}`);
      failCount++;
    }
  });
  
  log('\n' + '═'.repeat(70), 'cyan');
  log(`📊 Results: ${passCount} passed, ${failCount} failed out of 5 tests`, 'cyan');
  log('═'.repeat(70) + '\n', 'cyan');
  
  if (failCount === 0) {
    log('🎉 ALL PAYMENT METHODS TESTED SUCCESSFULLY! 🎉\n', 'green');
    log('Payment Method Risk & Retention Summary:', 'yellow');
    log('  • LC:         LOW risk  | 30% NBE retention | Bank guaranteed', 'yellow');
    log('  • CAD:        MED risk  | 40% NBE retention | No guarantee', 'yellow');
    log('  • TT_ADVANCE: LOW risk  | 30% NBE retention | Advance secured', 'yellow');
    log('  • TT_POST:    HIGH risk | 50% NBE retention | Trust-based', 'yellow');
    log('  • ADVANCE:    LOW risk  | 20% NBE retention | 100% prepaid\n', 'yellow');
    process.exit(0);
  } else {
    log('❌ SOME TESTS FAILED - Review errors above\n', 'red');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
