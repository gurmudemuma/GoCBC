#!/usr/bin/env node

/**
 * Test New Endpoints - Workflow Completion Verification
 * Tests: Phytosanitary, EUDR, Land Transport, Insurance, Courier
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

let testResults = { passed: 0, failed: 0, steps: [] };
let tokens = { ecta: null, exporter: null };

// Test IDs
const shipmentID = 'SHIP-TEST-' + Date.now();
const certificateID = 'PHYTO-TEST-' + Date.now();
const dueDiligenceID = 'EUDR-TEST-' + Date.now();
const policyNumber = 'INS-TEST-' + Date.now();

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, status, details = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '→';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${step}${details ? ': ' + details : ''}`, color);
  
  testResults.steps.push({ step, status, details });
  if (status === 'PASS') testResults.passed++;
  if (status === 'FAIL') testResults.failed++;
}

async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    throw error;
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function loginUsers() {
  log('\n' + '='.repeat(60), 'cyan');
  log('AUTHENTICATION: Getting tokens', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Login as ECTA
  const ectaResult = await apiCall('POST', '/auth/login', {
    username: 'ecta_admin',
    password: 'password123'
  });
  
  if (ectaResult.success && ectaResult.data?.token) {
    tokens.ecta = ectaResult.data.token;
    log('✓ Logged in as ECTA', 'green');
  } else {
    log('✗ Failed to login as ECTA', 'red');
    return false;
  }
  
  // Login as Exporter (use existing exporter)
  const exporterResult = await apiCall('POST', '/auth/login', {
    username: 'testexporter',
    password: 'password123'
  });
  
  if (exporterResult.success && exporterResult.data?.token) {
    tokens.exporter = exporterResult.data.token;
    log('✓ Logged in as Exporter', 'green');
  } else {
    log('✗ Failed to login as Exporter', 'red');
    return false;
  }
  
  log('');
  return true;
}

async function testPhytosanitaryCertificate() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST 1: Phytosanitary Certificate Workflow', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Step 1: Request Certificate
  const requestData = {
    certificateID,
    shipmentID,
    exporterID: 'testexporter',
    plantDescription: 'Coffee beans (Coffea arabica)',
    quantity: 20000,
    treatmentApplied: 'Fumigation'
  };
  
  const requestResult = await apiCall('POST', '/phytosanitary/request', requestData, tokens.exporter);
  
  if (requestResult.success) {
    logStep('Phytosanitary Certificate Request', 'PASS', certificateID);
  } else {
    logStep('Phytosanitary Certificate Request', 'FAIL', requestResult.error?.message);
    return false;
  }
  
  await wait(1000);
  
  // Step 2: Inspect (ECTA)
  const inspectData = {
    inspectorName: 'Dr. Mulugeta Assefa',
    inspectionDate: new Date().toISOString().split('T')[0],
    pestsDetected: false,
    diseaseDetected: false,
    inspectionNotes: 'No pests detected. Coffee is fit for export.'
  };
  
  const inspectResult = await apiCall('POST', `/phytosanitary/${certificateID}/inspect`, inspectData, tokens.ecta);
  
  if (inspectResult.success) {
    logStep('Phytosanitary Inspection', 'PASS', 'No pests detected');
  } else {
    logStep('Phytosanitary Inspection', 'FAIL', inspectResult.error?.message);
  }
  
  await wait(1000);
  
  // Step 3: Issue Certificate (ECTA)
  const issueData = {
    certificateNumber: 'PC-2026-ETH-' + Date.now().toString().slice(-6),
    issuingAuthority: 'ECTA Quality Lab',
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    additionalDeclarations: 'Treated with methyl bromide as per IPPC standards'
  };
  
  const issueResult = await apiCall('POST', `/phytosanitary/${certificateID}/issue`, issueData, tokens.ecta);
  
  if (issueResult.success) {
    logStep('Phytosanitary Certificate Issuance', 'PASS', issueData.certificateNumber);
  } else {
    logStep('Phytosanitary Certificate Issuance', 'FAIL', issueResult.error?.message);
  }
  
  // Step 4: Get Certificate
  const getResult = await apiCall('GET', `/phytosanitary/${certificateID}`, null, tokens.exporter);
  
  if (getResult.success) {
    logStep('Phytosanitary Certificate Retrieval', 'PASS', 'Certificate found');
  } else {
    logStep('Phytosanitary Certificate Retrieval', 'FAIL', 'Certificate not found');
  }
  
  return true;
}

async function testEUDRCompliance() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST 2: EUDR Compliance Workflow', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Step 1: Submit Due Diligence
  const dueDiligenceData = {
    dueDiligenceID,
    shipmentID,
    exporterID: 'testexporter',
    geoCoordinates: [
      { lat: 6.123456, lon: 38.654321 },
      { lat: 6.123789, lon: 38.654987 }
    ],
    plotSize: 5.5,
    farmName: 'Yirgacheffe Highland Farm',
    farmLocation: 'Gedeo Zone, SNNPR',
    deforestationFree: true,
    legalHarvest: true,
    harvestDate: '2026-01-15',
    landRights: 'DOCUMENTED'
  };
  
  const submitResult = await apiCall('POST', '/eudr/due-diligence', dueDiligenceData, tokens.exporter);
  
  if (submitResult.success) {
    logStep('EUDR Due Diligence Submission', 'PASS', dueDiligenceID);
  } else {
    logStep('EUDR Due Diligence Submission', 'FAIL', submitResult.error?.message);
    return false;
  }
  
  await wait(1000);
  
  // Step 2: Verify Compliance (ECTA)
  const verifyData = {
    verifiedBy: 'ECTA EUDR Officer',
    verified: true,
    verificationNotes: 'All geo-coordinates verified via satellite imagery. No deforestation detected.'
  };
  
  const verifyResult = await apiCall('POST', `/eudr/${dueDiligenceID}/verify`, verifyData, tokens.ecta);
  
  if (verifyResult.success) {
    logStep('EUDR Compliance Verification', 'PASS', 'Verified');
  } else {
    logStep('EUDR Compliance Verification', 'FAIL', verifyResult.error?.message);
  }
  
  // Step 3: Get Due Diligence
  const getResult = await apiCall('GET', `/eudr/${dueDiligenceID}`, null, tokens.exporter);
  
  if (getResult.success) {
    logStep('EUDR Due Diligence Retrieval', 'PASS', 'Record found');
  } else {
    logStep('EUDR Due Diligence Retrieval', 'FAIL', 'Record not found');
  }
  
  return true;
}


async function testLandTransport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST 3: Land Transport Tracking', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Step 1: Start Transport
  const startData = {
    transportCompany: 'Ethiopian Freight Services',
    truckPlateNumber: 'ET-3-' + Date.now().toString().slice(-5),
    driverName: 'Tesfaye Mengistu',
    driverPhone: '+251911234567',
    sealNumber: 'SEAL-' + Date.now().toString().slice(-6),
    departureTime: new Date().toISOString()
  };
  
  const startResult = await apiCall('POST', `/land-transport/${shipmentID}/start`, startData, tokens.exporter);
  
  if (startResult.success) {
    logStep('Land Transport Start', 'PASS', `Truck: ${startData.truckPlateNumber}`);
  } else {
    logStep('Land Transport Start', 'FAIL', startResult.error?.message);
    return false;
  }
  
  await wait(1000);
  
  // Step 2: Border Crossing
  const borderData = {
    crossingTime: new Date().toISOString(),
    customsOfficer: 'Officer Kassa Tesfaye',
    sealVerified: true,
    notes: 'Seal intact. All documents verified at border.'
  };
  
  const borderResult = await apiCall('POST', `/land-transport/${shipmentID}/border-crossing`, borderData, tokens.exporter);
  
  if (borderResult.success) {
    logStep('Border Crossing', 'PASS', 'Seal verified');
  } else {
    logStep('Border Crossing', 'FAIL', borderResult.error?.message);
  }
  
  await wait(1000);
  
  // Step 3: Port Arrival
  const arrivalData = {
    arrivalTime: new Date().toISOString(),
    receivedBy: 'Djibouti Port Authority',
    sealCondition: 'INTACT',
    notes: 'Cargo received in good condition'
  };
  
  const arrivalResult = await apiCall('POST', `/land-transport/${shipmentID}/arrive`, arrivalData, tokens.exporter);
  
  if (arrivalResult.success) {
    logStep('Port Arrival', 'PASS', 'Djibouti Port');
  } else {
    logStep('Port Arrival', 'FAIL', arrivalResult.error?.message);
  }
  
  // Step 4: Get Status
  const statusResult = await apiCall('GET', `/land-transport/${shipmentID}/status`, null, tokens.exporter);
  
  if (statusResult.success) {
    logStep('Land Transport Status', 'PASS', statusResult.data?.status || 'Status retrieved');
  } else {
    logStep('Land Transport Status', 'FAIL', 'Status not found');
  }
  
  return true;
}

async function testInsurance() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST 4: Insurance Policy Management', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Step 1: Register Policy
  const policyData = {
    policyNumber,
    shipmentID,
    insuranceCompany: 'Ethiopian Insurance Corporation',
    coverageAmount: 200000,
    currency: 'USD',
    policyType: 'MARINE_CARGO',
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    beneficiary: 'testexporter',
    coverageDetails: 'All-risk marine cargo insurance'
  };
  
  const registerResult = await apiCall('POST', '/insurance/register', policyData, tokens.exporter);
  
  if (registerResult.success) {
    logStep('Insurance Policy Registration', 'PASS', policyNumber);
  } else {
    logStep('Insurance Policy Registration', 'FAIL', registerResult.error?.message);
    return false;
  }
  
  await wait(1000);
  
  // Step 2: Get Policy
  const getResult = await apiCall('GET', `/insurance/${policyNumber}`, null, tokens.exporter);
  
  if (getResult.success) {
    logStep('Insurance Policy Retrieval', 'PASS', 'Policy found');
  } else {
    logStep('Insurance Policy Retrieval', 'FAIL', 'Policy not found');
  }
  
  // Step 3: File Claim
  const claimData = {
    claimAmount: 5000,
    claimReason: 'Minor water damage during transit',
    incidentDate: new Date().toISOString().split('T')[0],
    supportingDocuments: ['SURVEY-REPORT-001']
  };
  
  const claimResult = await apiCall('POST', `/insurance/${policyNumber}/claim`, claimData, tokens.exporter);
  
  if (claimResult.success) {
    logStep('Insurance Claim Filing', 'PASS', '$5,000 claim');
  } else {
    logStep('Insurance Claim Filing', 'FAIL', claimResult.error?.message);
  }
  
  return true;
}

async function testCourier() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST 5: Document Courier Tracking', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Step 1: Send Documents
  const sendData = {
    courierCompany: 'DHL Express',
    trackingNumber: 'DHL-' + Date.now().toString().slice(-10),
    documents: [
      'Bill of Lading (Original)',
      'Commercial Invoice',
      'Certificate of Origin',
      'Quality Certificate',
      'Phytosanitary Certificate'
    ],
    recipient: 'ABC Coffee Importers Inc.',
    recipientAddress: '123 Harbor St, New York, NY 10001, USA',
    sentDate: new Date().toISOString()
  };
  
  const sendResult = await apiCall('POST', `/courier/${shipmentID}/send`, sendData, tokens.exporter);
  
  if (sendResult.success) {
    logStep('Document Courier Dispatch', 'PASS', sendData.trackingNumber);
  } else {
    logStep('Document Courier Dispatch', 'FAIL', sendResult.error?.message);
    return false;
  }
  
  await wait(1000);
  
  // Step 2: Update Status
  const updateData = {
    status: 'IN_TRANSIT',
    location: 'Dubai Hub',
    updateTime: new Date().toISOString(),
    notes: 'Package cleared customs'
  };
  
  const updateResult = await apiCall('PUT', `/courier/${shipmentID}/update-status`, updateData, tokens.exporter);
  
  if (updateResult.success) {
    logStep('Courier Status Update', 'PASS', 'In transit - Dubai Hub');
  } else {
    logStep('Courier Status Update', 'FAIL', updateResult.error?.message);
  }
  
  await wait(1000);
  
  // Step 3: Confirm Receipt
  const receiveData = {
    receivedDate: new Date().toISOString(),
    receivedBy: 'John Smith, Import Manager',
    condition: 'GOOD',
    notes: 'All documents received in excellent condition'
  };
  
  const receiveResult = await apiCall('POST', `/courier/${shipmentID}/receive`, receiveData, tokens.exporter);
  
  if (receiveResult.success) {
    logStep('Document Receipt Confirmation', 'PASS', 'Received by buyer');
  } else {
    logStep('Document Receipt Confirmation', 'FAIL', receiveResult.error?.message);
  }
  
  // Step 4: Get Status
  const statusResult = await apiCall('GET', `/courier/${shipmentID}/status`, null, tokens.exporter);
  
  if (statusResult.success) {
    logStep('Courier Tracking Status', 'PASS', statusResult.data?.status || 'Status retrieved');
  } else {
    logStep('Courier Tracking Status', 'FAIL', 'Status not found');
  }
  
  return true;
}

async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║  NEW ENDPOINTS TEST SUITE - Workflow Completion Check   ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Login
    const loginSuccess = await loginUsers();
    if (!loginSuccess) {
      log('\n❌ Login failed. Cannot proceed with tests.', 'red');
      process.exit(1);
    }
    
    // Run all tests
    await testPhytosanitaryCertificate();
    await testEUDRCompliance();
    await testLandTransport();
    await testInsurance();
    await testCourier();
    
    // Print summary
    log('\n' + '='.repeat(60), 'cyan');
    log('TEST SUMMARY', 'bright');
    log('='.repeat(60), 'cyan');
    log(`✓ Passed: ${testResults.passed}`, 'green');
    log(`✗ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
    log(`Total: ${testResults.passed + testResults.failed}`, 'cyan');
    log('='.repeat(60), 'cyan');
    
    if (testResults.failed === 0) {
      log('\n🎉 ALL TESTS PASSED! Workflow is 100% functional.', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Error running tests: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
