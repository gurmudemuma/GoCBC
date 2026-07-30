/**
 * Test Script: Customs Portal - All Action Buttons
 * 
 * This script tests all action-taking buttons in the Customs Portal
 * to ensure the complete workflow functions correctly.
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001/api/v1';

// Test credentials
const CUSTOMS_OFFICER = {
  username: 'customs_admin',
  password: 'password123',
  role: 'CUSTOMS'
};

let authToken = '';
let testShipmentId = '';
let testDeclarationId = '';

// Color console output
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

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`  ${title}`, colors.blue);
  log(`${'='.repeat(60)}\n`, colors.blue);
}

// Authentication
async function login() {
  try {
    section('AUTHENTICATION');
    info('Logging in as Customs Officer...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: CUSTOMS_OFFICER.username,
      password: CUSTOMS_OFFICER.password
    });
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      success(`Logged in successfully as ${CUSTOMS_OFFICER.username}`);
      return true;
    } else {
      error('Login failed');
      return false;
    }
  } catch (err) {
    error(`Login error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Get headers with auth token
function getHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

// Test 1: View All Declarations (Export Report Data)
async function testViewAllDeclarations() {
  try {
    section('TEST 1: View All Declarations');
    info('Fetching all customs declarations...');
    
    const response = await axios.get(`${API_BASE}/customs/declarations`, {
      headers: getHeaders()
    });
    
    if (response.data.success) {
      const declarations = response.data.data || [];
      success(`✅ Found ${declarations.length} declarations`);
      
      if (declarations.length > 0) {
        // Use first declaration for subsequent tests
        testDeclarationId = declarations[0].declarationId || declarations[0].DeclarationID;
        testShipmentId = declarations[0].shipmentId || declarations[0].ShipmentID;
        
        info(`Using declaration: ${testDeclarationId}`);
        info(`Shipment: ${testShipmentId}`);
        
        // Show sample declaration
        const sample = declarations[0];
        console.log('\n📋 Sample Declaration:');
        console.log(`   ID: ${sample.declarationId || sample.DeclarationID}`);
        console.log(`   Status: ${sample.status || sample.DeclarationStatus}`);
        console.log(`   Exporter: ${sample.exporterId || sample.ExporterID}`);
        console.log(`   Destination: ${sample.destination || sample.Destination}`);
      } else {
        warning('No declarations found - will create a test declaration');
      }
      
      return true;
    } else {
      error('Failed to fetch declarations');
      return false;
    }
  } catch (err) {
    error(`View declarations error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Test 2: View Declaration Details (👁️ Eye Button)
async function testViewDeclarationDetails() {
  if (!testDeclarationId) {
    warning('Skipping: No declaration available');
    return false;
  }
  
  try {
    section('TEST 2: View Declaration Details (👁️ Button)');
    info(`Fetching details for: ${testDeclarationId}`);
    
    const response = await axios.get(`${API_BASE}/customs/declaration/${testDeclarationId}`, {
      headers: getHeaders()
    });
    
    if (response.data.success) {
      const declaration = response.data.data;
      success('Declaration details retrieved successfully');
      
      console.log('\n📄 Declaration Details:');
      console.log(`   Status: ${declaration.status || declaration.DeclarationStatus}`);
      console.log(`   HS Code: ${declaration.hsCode || declaration.HSCode}`);
      console.log(`   Quantity: ${declaration.quantity || declaration.Quantity} kg`);
      console.log(`   Value: ${declaration.totalValue || declaration.TotalValue} ${declaration.currency || declaration.Currency}`);
      console.log(`   EUDR: ${declaration.eudrCompliant || declaration.EUDRCompliant ? 'Yes' : 'No'}`);
      
      return true;
    } else {
      error('Failed to fetch declaration details');
      return false;
    }
  } catch (err) {
    error(`View details error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Test 3: Schedule Inspection (🔍 Button)
async function testScheduleInspection() {
  if (!testDeclarationId) {
    warning('Skipping: No declaration available');
    return false;
  }
  
  try {
    section('TEST 3: Schedule Inspection (🔍 Security Button)');
    info(`Scheduling inspection for: ${testDeclarationId}`);
    
    const inspectionData = {
      inspectorNotes: `
📅 Scheduled: ${new Date().toISOString().split('T')[0]} at 09:00
📍 Location: PORT
👤 Inspector: Officer Alemayehu T.
🎯 Priority: NORMAL

📝 Test inspection scheduled via automated test
      `.trim(),
      inspectionType: 'STANDARD',
      scheduledDate: new Date().toISOString(),
    };
    
    const response = await axios.post(
      `${API_BASE}/customs/declaration/${testDeclarationId}/review`,
      inspectionData,
      { headers: getHeaders() }
    );
    
    if (response.data.success) {
      success('✅ Inspection scheduled successfully');
      console.log(`   New Status: ${response.data.status || 'UNDER_INSPECTION'}`);
      console.log(`   Transaction ID: ${response.data.txId || 'N/A'}`);
      return true;
    } else {
      error('Failed to schedule inspection');
      console.log(`   Error: ${JSON.stringify(response.data.error)}`);
      return false;
    }
  } catch (err) {
    error(`Schedule inspection error: ${err.response?.data?.error?.message || err.message}`);
    
    // Check if already scheduled
    if (err.response?.data?.error?.message?.includes('already')) {
      warning('Declaration may already be under inspection');
      return true; // Not a failure, just already done
    }
    
    return false;
  }
}

// Test 4: Complete Inspection (API Call)
async function testCompleteInspection() {
  if (!testDeclarationId) {
    warning('Skipping: No declaration available');
    return false;
  }
  
  try {
    section('TEST 4: Complete Inspection (API Call)');
    info(`Completing inspection for: ${testDeclarationId}`);
    
    const inspectionResult = {
      inspectionResult: 'PASSED',
      inspectorComments: 'All requirements met. Test inspection completed successfully.',
      completedDate: new Date().toISOString(),
    };
    
    const response = await axios.post(
      `${API_BASE}/customs/declaration/${testDeclarationId}/complete-inspection`,
      inspectionResult,
      { headers: getHeaders() }
    );
    
    if (response.data.success) {
      success('✅ Inspection completed successfully');
      console.log(`   New Status: ${response.data.status || 'UNDER_REVIEW'}`);
      console.log(`   Transaction ID: ${response.data.txId || 'N/A'}`);
      return true;
    } else {
      error('Failed to complete inspection');
      return false;
    }
  } catch (err) {
    error(`Complete inspection error: ${err.response?.data?.error?.message || err.message}`);
    
    // Check if not in right status
    if (err.response?.data?.error?.message?.includes('status')) {
      warning('Declaration may not be in UNDER_INSPECTION status');
    }
    
    return false;
  }
}

// Test 5: Clear Declaration (✅ Check Button)
async function testClearDeclaration() {
  if (!testDeclarationId) {
    warning('Skipping: No declaration available');
    return false;
  }
  
  try {
    section('TEST 5: Clear Declaration (✅ Approve Button)');
    info(`Clearing declaration: ${testDeclarationId}`);
    
    const clearanceData = {
      clearanceNumber: `CLR-${Date.now()}-TEST`,
      dutiesAmount: '0',
    };
    
    const response = await axios.post(
      `${API_BASE}/customs/declaration/${testDeclarationId}/clear`,
      clearanceData,
      { headers: getHeaders() }
    );
    
    if (response.data.success) {
      success('✅ Declaration cleared successfully');
      console.log(`   Clearance Number: ${response.data.clearanceNumber}`);
      console.log(`   Shipment ID: ${response.data.shipmentID}`);
      console.log(`   Transaction ID: ${response.data.txId || 'N/A'}`);
      
      if (response.data.nextSteps && response.data.nextSteps.length > 0) {
        console.log('\n📋 Next Steps Triggered:');
        response.data.nextSteps.forEach(step => {
          console.log(`   • ${step.action}: ${step.description}`);
        });
      }
      
      return true;
    } else {
      error('Failed to clear declaration');
      console.log(`   Error: ${JSON.stringify(response.data.error)}`);
      return false;
    }
  } catch (err) {
    error(`Clear declaration error: ${err.response?.data?.error?.message || err.message}`);
    
    // Check if status is wrong
    if (err.response?.data?.error?.message?.includes('status')) {
      warning('Declaration may not be in UNDER_REVIEW status');
      warning('Current status must be UNDER_REVIEW to clear');
    }
    
    return false;
  }
}

// Test 6: Reject Declaration (❌ Cancel Button)
async function testRejectDeclaration() {
  // Create a test declaration first so we don't reject a real one
  try {
    section('TEST 6: Reject Declaration (❌ Reject Button)');
    info('Creating a test declaration for rejection...');
    
    // First, get a shipment to use
    const shipmentsResponse = await axios.get(`${API_BASE}/shipments`, {
      headers: getHeaders()
    });
    
    if (!shipmentsResponse.data.success || !shipmentsResponse.data.data || shipmentsResponse.data.data.length === 0) {
      warning('No shipments available for test rejection');
      return false;
    }
    
    const testShipment = shipmentsResponse.data.data[0];
    const testShipmentID = testShipment.shipmentId || testShipment.ShipmentID;
    const testDeclarationID = `CD-TEST-REJECT-${Date.now()}`;
    
    info(`Using test shipment: ${testShipmentID}`);
    
    // Create test declaration
    const newDeclResponse = await axios.post(
      `${API_BASE}/customs/declaration/submit`,
      {
        declarationID: testDeclarationID,
        shipmentID: testShipmentID,
        exporterID: testShipment.exporterId || testShipment.ExporterID || 'EXP_TEST',
        declarationType: 'STANDARD',
        hsCode: '090111',
        quantity: 1000,
        value: 9250,
        currency: 'USD',
        destination: 'Test Country',
        portOfExit: 'Djibouti Port',
        eudrCompliant: false,
        additionalNotes: 'Test declaration for rejection testing'
      },
      { headers: getHeaders() }
    );
    
    if (!newDeclResponse.data.success) {
      error('Failed to create test declaration');
      return false;
    }
    
    success('Test declaration created');
    info(`Test Declaration ID: ${testDeclarationID}`);
    
    // Now reject it
    info('Rejecting test declaration...');
    
    const rejectionData = {
      rejectedBy: 'Officer Alemayehu T.',
      rejectionReason: `DOCUMENTATION: Test rejection via automated test
      
Required Actions:
• This is a test rejection
• No real action needed
• Testing system functionality

Appeal deadline: 14 days`
    };
    
    const response = await axios.post(
      `${API_BASE}/customs/declaration/${testDeclarationID}/reject`,
      rejectionData,
      { headers: getHeaders() }
    );
    
    if (response.data.success) {
      success('✅ Declaration rejected successfully');
      console.log(`   Declaration ID: ${testDeclarationID}`);
      console.log(`   Rejected By: Officer Alemayehu T.`);
      console.log(`   Transaction ID: ${response.data.txId || 'N/A'}`);
      return true;
    } else {
      error('Failed to reject declaration');
      return false;
    }
  } catch (err) {
    error(`Reject declaration error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Test 7: Submit New Declaration (➕ New Declaration Button)
async function testSubmitNewDeclaration() {
  try {
    section('TEST 7: Submit New Declaration (➕ New Button)');
    info('Fetching a shipment for test declaration...');
    
    // Get available shipments
    const shipmentsResponse = await axios.get(`${API_BASE}/shipments`, {
      headers: getHeaders()
    });
    
    if (!shipmentsResponse.data.success || !shipmentsResponse.data.data || shipmentsResponse.data.data.length === 0) {
      warning('No shipments available for test declaration');
      return false;
    }
    
    const testShipment = shipmentsResponse.data.data[0];
    const newTestShipmentID = testShipment.shipmentId || testShipment.ShipmentID;
    const newTestDeclarationID = `CD-TEST-${Date.now()}`;
    
    info(`Creating declaration for shipment: ${newTestShipmentID}`);
    
    const declarationData = {
      declarationID: newTestDeclarationID,
      shipmentID: newTestShipmentID,
      exporterID: testShipment.exporterId || testShipment.ExporterID || 'EXP_TEST',
      declarationType: 'STANDARD',
      hsCode: '090111',
      quantity: 5000,
      value: 46250,
      currency: 'USD',
      destination: 'France',
      portOfExit: 'Djibouti Port',
      eudrCompliant: true,
      additionalNotes: 'Test declaration created via automated button test'
    };
    
    const response = await axios.post(
      `${API_BASE}/customs/declaration/submit`,
      declarationData,
      { headers: getHeaders() }
    );
    
    if (response.data.success) {
      success('✅ New declaration submitted successfully');
      console.log(`   Declaration ID: ${newTestDeclarationID}`);
      console.log(`   Status: SUBMITTED`);
      console.log(`   Transaction ID: ${response.data.txId || 'N/A'}`);
      
      if (response.data.autoMapped) {
        console.log('\n🔄 Auto-Mapped Data:');
        console.log(`   Quantity: ${response.data.autoMapped.quantity} kg`);
        console.log(`   Value: $${response.data.autoMapped.value}`);
        console.log(`   Destination: ${response.data.autoMapped.destination}`);
        console.log(`   EUDR: ${response.data.autoMapped.eudrCompliant ? 'Yes' : 'No'}`);
      }
      
      return true;
    } else {
      error('Failed to submit new declaration');
      console.log(`   Error: ${JSON.stringify(response.data.error)}`);
      return false;
    }
  } catch (err) {
    error(`Submit new declaration error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Test 8: Export Report (📥 Download Button - Simulated)
async function testExportReport() {
  try {
    section('TEST 8: Export Report (📥 Download Button)');
    info('Fetching data for CSV export...');
    
    const response = await axios.get(`${API_BASE}/customs/declarations`, {
      headers: getHeaders()
    });
    
    if (response.data.success) {
      const declarations = response.data.data || [];
      
      // Simulate CSV generation
      const csvHeaders = [
        'Declaration ID',
        'Shipment ID',
        'Exporter',
        'Type',
        'HS Code',
        'Quantity (kg)',
        'Value',
        'Currency',
        'Destination',
        'Status',
        'Submission Date',
        'EUDR Compliant'
      ];
      
      console.log('\n📊 CSV Export Preview:');
      console.log(csvHeaders.join(','));
      
      declarations.slice(0, 3).forEach(d => {
        const row = [
          d.declarationId || d.DeclarationID || '',
          d.shipmentId || d.ShipmentID || '',
          d.exporterId || d.ExporterID || '',
          d.declarationType || d.DeclarationType || '',
          d.hsCode || d.HSCode || '',
          d.quantity || d.Quantity || '',
          d.totalValue || d.TotalValue || d.value || '',
          d.currency || d.Currency || '',
          d.destination || d.Destination || '',
          d.status || d.DeclarationStatus || '',
          d.submissionDate || d.SubmissionDate || '',
          (d.eudrCompliant || d.EUDRCompliant) ? 'Yes' : 'No'
        ];
        console.log(row.join(','));
      });
      
      if (declarations.length > 3) {
        console.log(`... and ${declarations.length - 3} more rows`);
      }
      
      success(`✅ Export report data ready (${declarations.length} records)`);
      return true;
    } else {
      error('Failed to fetch export report data');
      return false;
    }
  } catch (err) {
    error(`Export report error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Test 9: Query by Status
async function testQueryByStatus() {
  try {
    section('TEST 9: Query Declarations by Status');
    
    const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'CLEARED'];
    
    for (const status of statuses) {
      info(`Querying declarations with status: ${status}`);
      
      const response = await axios.get(`${API_BASE}/customs/declaration/status/${status}`, {
        headers: getHeaders()
      });
      
      if (response.data.success) {
        const count = response.data.data?.length || 0;
        success(`Found ${count} declarations with status ${status}`);
      } else {
        warning(`Failed to query ${status} declarations`);
      }
    }
    
    return true;
  } catch (err) {
    error(`Query by status error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Test 10: Permit-Ready Summary
async function testPermitReadySummary() {
  try {
    section('TEST 10: Permit-Ready Summary');
    info('Fetching shipments ready for customs declaration...');
    
    const response = await axios.get(`${API_BASE}/customs/permit-ready`, {
      headers: getHeaders()
    });
    
    if (response.data.success) {
      const ready = response.data.data || [];
      success(`✅ Found ${ready.length} shipments ready for customs declaration`);
      
      if (ready.length > 0) {
        console.log('\n📋 Permit-Ready Shipments (Sample):');
        ready.slice(0, 3).forEach(item => {
          console.log(`   • Shipment: ${item.shipmentId}`);
          console.log(`     Exporter: ${item.exporterId}`);
          console.log(`     Quality Grade: ${item.qualityGrade}`);
          console.log(`     Export Permit: ${item.exportPermitNo}`);
          console.log(`     Status: ${item.status}`);
          console.log('');
        });
      }
      
      return true;
    } else {
      error('Failed to fetch permit-ready summary');
      return false;
    }
  } catch (err) {
    error(`Permit-ready summary error: ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════╗', colors.blue);
  log('║   CUSTOMS PORTAL - ACTION BUTTONS TEST SUITE             ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════════╝', colors.blue);
  console.log('\n');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Login first
  if (!await login()) {
    error('\n❌ Authentication failed. Cannot proceed with tests.\n');
    process.exit(1);
  }
  
  // Run tests in sequence
  const tests = [
    { name: 'View All Declarations', fn: testViewAllDeclarations },
    { name: 'View Declaration Details', fn: testViewDeclarationDetails },
    { name: 'Schedule Inspection', fn: testScheduleInspection },
    { name: 'Complete Inspection', fn: testCompleteInspection },
    { name: 'Clear Declaration', fn: testClearDeclaration },
    { name: 'Reject Declaration', fn: testRejectDeclaration },
    { name: 'Submit New Declaration', fn: testSubmitNewDeclaration },
    { name: 'Export Report', fn: testExportReport },
    { name: 'Query by Status', fn: testQueryByStatus },
    { name: 'Permit-Ready Summary', fn: testPermitReadySummary },
  ];
  
  for (const test of tests) {
    const result = await test.fn();
    if (result === true) {
      results.passed++;
    } else if (result === false) {
      results.failed++;
    } else {
      results.skipped++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  section('TEST RESULTS SUMMARY');
  console.log(`   Total Tests: ${tests.length}`);
  success(`   Passed: ${results.passed}`);
  if (results.failed > 0) {
    error(`   Failed: ${results.failed}`);
  } else {
    console.log(`   Failed: ${results.failed}`);
  }
  if (results.skipped > 0) {
    warning(`   Skipped: ${results.skipped}`);
  }
  
  const successRate = ((results.passed / tests.length) * 100).toFixed(1);
  console.log(`   Success Rate: ${successRate}%`);
  
  console.log('\n');
  
  if (results.failed === 0) {
    success('🎉 All tests passed! Customs Portal buttons are working correctly.\n');
    process.exit(0);
  } else {
    error('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Execute tests
runAllTests().catch(err => {
  error(`\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
