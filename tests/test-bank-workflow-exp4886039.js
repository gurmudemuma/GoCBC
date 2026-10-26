/**
 * Banks Portal Workflow Test - EXP4886039
 * Complete end-to-end test for specific exporter
 * 
 * Run: node tests/test-bank-workflow-exp4886039.js
 */

const http = require('http');

const EXPORTER_ID = 'EXP4886039';
const API_BASE = 'http://localhost:3001/api/v1';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(message) {
  log(`\n${'='.repeat(70)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(70), 'blue');
}

function apiRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : API_BASE + path);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(body),
            headers: res.headers 
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

let authToken = null;
const testResults = {
  contracts: [],
  lcs: [],
  shipments: [],
  deliveredShipments: [],
  postDeliveryStatus: []
};

async function main() {
  log('\n╔══════════════════════════════════════════════════════════════════╗', 'magenta');
  log('║     Banks Portal Workflow Test - EXP4886039                     ║', 'magenta');
  log('╚══════════════════════════════════════════════════════════════════╝', 'magenta');
  log(`\nTest Started: ${new Date().toLocaleString()}`, 'cyan');
  log(`Target Exporter: ${EXPORTER_ID}\n`, 'cyan');

  try {
    // Step 1: Login
    section('STEP 1: Authentication');
    log('Logging in as bank_admin...', 'cyan');
    
    const loginRes = await apiRequest('POST', '/users/login', {
      username: 'bank_admin',
      password: 'Bank@2024'
    });

    if (loginRes.status === 200 && loginRes.data.token) {
      authToken = loginRes.data.token;
      log('✅ Login successful', 'green');
      log(`Token: ${authToken.substring(0, 30)}...`, 'cyan');
    } else {
      log('❌ Login failed', 'red');
      log(JSON.stringify(loginRes.data, null, 2), 'yellow');
      process.exit(1);
    }

    // Step 2: Check contracts for exporter
    section('STEP 2: Tab 0 - Check Contracts for EXP4886039');
    log(`Fetching contracts for ${EXPORTER_ID}...`, 'cyan');
    
    const contractsRes = await apiRequest('GET', '/contracts', null, authToken);
    
    if (contractsRes.status === 200) {
      const allContracts = contractsRes.data.data || contractsRes.data.contracts || [];
      testResults.contracts = allContracts.filter(c => 
        c.exporterId === EXPORTER_ID || c.exporter_id === EXPORTER_ID
      );
      
      log(`✅ Found ${testResults.contracts.length} contracts for ${EXPORTER_ID}`, 'green');
      
      if (testResults.contracts.length > 0) {
        testResults.contracts.forEach(c => {
          const cId = c.contractId || c.contract_id;
          const value = c.value || c.contractValue || 0;
          log(`   📄 ${cId} - ${c.currency || 'USD'} ${value.toLocaleString()}`, 'cyan');
        });
      } else {
        log('⚠️  No contracts found for this exporter', 'yellow');
      }
    } else {
      log('❌ Failed to fetch contracts', 'red');
    }

    // Step 3: Check LCs for exporter
    section('STEP 3: Tab 0 - Check LCs for EXP4886039');
    log('Fetching Letter of Credits...', 'cyan');
    
    const lcsRes = await apiRequest('GET', '/banking/lc', null, authToken);
    
    if (lcsRes.status === 200) {
      const allLCs = lcsRes.data.data || lcsRes.data.lcs || [];
      testResults.lcs = allLCs.filter(lc => 
        lc.exporterId === EXPORTER_ID || 
        lc.exporter_id === EXPORTER_ID ||
        lc.beneficiary === EXPORTER_ID
      );
      
      log(`✅ Found ${testResults.lcs.length} LCs for ${EXPORTER_ID}`, 'green');
      
      if (testResults.lcs.length > 0) {
        testResults.lcs.forEach(lc => {
          log(`   💰 ${lc.lcId || lc.lc_id} - ${lc.status} - ${lc.currency} ${(lc.amount || 0).toLocaleString()}`, 'cyan');
        });
      } else {
        log('⚠️  No LCs found for this exporter', 'yellow');
      }
    } else {
      log('❌ Failed to fetch LCs', 'red');
    }

    // Step 4: Tab 3 - Document Examination
    section('STEP 4: Tab 3 - Document Examination');
    log('Checking LCs pending document examination...', 'cyan');
    
    const pendingExamination = testResults.lcs.filter(lc => 
      lc.status === 'DOCUMENTS_SUBMITTED' || 
      lc.status === 'PENDING_EXAMINATION' ||
      lc.status === 'ISSUED'
    );
    
    log(`✅ Found ${pendingExamination.length} LCs for examination`, 'green');
    
    if (pendingExamination.length > 0) {
      pendingExamination.forEach(lc => {
        log(`   📋 ${lc.lcId || lc.lc_id} - Status: ${lc.status}`, 'cyan');
      });
      log('ℹ️  These LCs would appear in Tab 3 (Document Examination)', 'cyan');
    } else {
      log('ℹ️  No LCs pending examination', 'yellow');
    }

    // Step 5: Tab 4 - Payment Release
    section('STEP 5: Tab 4 - Payment Release');
    log('Checking LCs ready for payment...', 'cyan');
    
    const readyForPayment = testResults.lcs.filter(lc => 
      lc.status === 'READY_FOR_PAYMENT' || 
      lc.status === 'UTILIZED' ||
      lc.status === 'DOCUMENTS_VERIFIED'
    );
    
    log(`✅ Found ${readyForPayment.length} LCs ready for payment`, 'green');
    
    if (readyForPayment.length > 0) {
      readyForPayment.forEach(lc => {
        log(`   💵 ${lc.lcId || lc.lc_id} - Status: ${lc.status}`, 'cyan');
      });
      log('ℹ️  These LCs would appear in Tab 4 (Payment Release)', 'cyan');
    } else {
      log('ℹ️  No LCs ready for payment', 'yellow');
    }

    // Step 6: Check shipments
    section('STEP 6: Check Shipments for EXP4886039');
    log('Fetching all shipments...', 'cyan');
    
    const shipmentsRes = await apiRequest('GET', '/shipments', null, authToken);
    
    if (shipmentsRes.status === 200) {
      const allShipments = shipmentsRes.data.data || shipmentsRes.data.shipments || [];
      
      // Filter by exporter through contracts
      const exporterContractIds = testResults.contracts.map(c => c.contractId || c.contract_id);
      testResults.shipments = allShipments.filter(s => 
        exporterContractIds.includes(s.contractId || s.contract_id)
      );
      
      log(`✅ Found ${testResults.shipments.length} total shipments`, 'green');
      
      if (testResults.shipments.length > 0) {
        testResults.shipments.forEach(s => {
          const sId = s.shipmentId || s.shipment_id;
          log(`   🚢 ${sId} - Status: ${s.status}`, 'cyan');
        });
      }
    } else {
      log('❌ Failed to fetch shipments', 'red');
    }

    // Step 7: Tab 8 - LC Settlements (Delivered Shipments)
    section('STEP 7: Tab 8 - LC Settlements (Post-Delivery)');
    log('Checking delivered shipments...', 'cyan');
    
    const deliveredRes = await apiRequest('GET', '/shipments?status=DELIVERED', null, authToken);
    
    if (deliveredRes.status === 200) {
      const allDelivered = deliveredRes.data.data || deliveredRes.data.shipments || [];
      const exporterContractIds = testResults.contracts.map(c => c.contractId || c.contract_id);
      testResults.deliveredShipments = allDelivered.filter(s => 
        exporterContractIds.includes(s.contractId || s.contract_id)
      );
      
      log(`✅ Found ${testResults.deliveredShipments.length} delivered shipments for ${EXPORTER_ID}`, 'green');
      
      if (testResults.deliveredShipments.length > 0) {
        testResults.deliveredShipments.forEach(s => {
          const sId = s.shipmentId || s.shipment_id;
          const cId = s.contractId || s.contract_id;
          log(`   ✅ ${sId} - Contract: ${cId}`, 'green');
        });
        log('ℹ️  These shipments would appear in Tab 8 (LC Settlements)', 'cyan');
      } else {
        log('⚠️  No delivered shipments found', 'yellow');
        log('ℹ️  Tab 8 would show: "No delivered shipments requiring LC settlement"', 'cyan');
      }
    } else {
      log('❌ Failed to fetch delivered shipments', 'red');
    }

    // Step 8: Test Post-Delivery Workflow for each delivered shipment
    if (testResults.deliveredShipments.length > 0) {
      section('STEP 8: Post-Delivery Workflow Status');
      
      for (const shipment of testResults.deliveredShipments) {
        const shipmentId = shipment.shipmentId || shipment.shipment_id;
        log(`\nTesting workflow for: ${shipmentId}`, 'magenta');
        
        // Get post-delivery status
        const statusRes = await apiRequest('GET', `/post-delivery/${shipmentId}/status`, null, authToken);
        
        if (statusRes.status === 200) {
          const status = statusRes.data.data;
          testResults.postDeliveryStatus.push(status);
          
          log('✅ Post-delivery status retrieved', 'green');
          log(`   Overall Status: ${status.overallStatus || 'PENDING'}`, 'cyan');
          log(`   Progress: ${status.completionPercentage || 0}%`, 'cyan');
          log(`   Payment Received: ${status.paymentReceived ? '✅' : '⏳'}`, status.paymentReceived ? 'green' : 'yellow');
          log(`   Forex Repatriated: ${status.forexRepatriated ? '✅' : '⏳'}`, status.forexRepatriated ? 'green' : 'yellow');
          log(`   LC Settled: ${status.lcSettled ? '✅' : '⏳'}`, status.lcSettled ? 'green' : 'yellow');
          log(`   ECTA Audit: ${status.ectaAuditCompleted ? '✅' : '⏳'}`, status.ectaAuditCompleted ? 'green' : 'yellow');
          log(`   Contract Closed: ${status.contractClosed ? '✅' : '⏳'}`, status.contractClosed ? 'green' : 'yellow');
          
          // Check what actions Bank can take
          if (!status.paymentReceived) {
            log('   🔹 ACTION AVAILABLE: Bank can record payment', 'cyan');
          }
          if (status.paymentReceived && status.forexRepatriated && !status.lcSettled) {
            log('   🔹 ACTION AVAILABLE: Bank can record LC settlement', 'cyan');
          }
          
        } else if (statusRes.status === 404) {
          log('⚠️  No post-delivery record yet - needs to be created', 'yellow');
          log('   This is normal for newly delivered shipments', 'cyan');
        } else {
          log(`❌ Failed to get status: ${statusRes.status}`, 'red');
        }
      }
    }

    // Generate Summary Report
    section('TEST SUMMARY REPORT');
    
    log('\n📊 Data Overview:', 'blue');
    log(`Exporter ID: ${EXPORTER_ID}`, 'cyan');
    log(`Contracts: ${testResults.contracts.length}`, 'cyan');
    log(`Letter of Credits: ${testResults.lcs.length}`, 'cyan');
    log(`Total Shipments: ${testResults.shipments.length}`, 'cyan');
    log(`Delivered Shipments: ${testResults.deliveredShipments.length}`, 'cyan');
    
    log('\n📋 Banks Portal Tab Status:', 'blue');
    log(`Tab 0 (Payment Methods): ${testResults.lcs.length} LCs`, testResults.lcs.length > 0 ? 'green' : 'yellow');
    log(`Tab 3 (Document Examination): ${pendingExamination.length} pending`, pendingExamination.length > 0 ? 'green' : 'yellow');
    log(`Tab 4 (Payment Release): ${readyForPayment.length} ready`, readyForPayment.length > 0 ? 'green' : 'yellow');
    log(`Tab 8 (LC Settlements): ${testResults.deliveredShipments.length} delivered`, testResults.deliveredShipments.length > 0 ? 'green' : 'yellow');
    
    log('\n🎯 Tab 8 (LC Settlements) Test Results:', 'blue');
    if (testResults.deliveredShipments.length > 0) {
      log('✅ Tab 8 WOULD DISPLAY DATA', 'green');
      log(`   ${testResults.deliveredShipments.length} shipment(s) would show with PostDeliveryWorkflowPanel`, 'cyan');
      
      testResults.postDeliveryStatus.forEach((status, i) => {
        log(`   Shipment ${i + 1}: ${status.completionPercentage || 0}% complete`, 'cyan');
      });
    } else {
      log('⚠️  Tab 8 WOULD SHOW EMPTY STATE', 'yellow');
      log('   Message: "No delivered shipments requiring LC settlement"', 'cyan');
    }
    
    log('\n🔧 Manual Testing Instructions:', 'blue');
    log('1. Open browser: http://localhost:3000', 'cyan');
    log('2. Login as: bank_admin / Bank@2024', 'cyan');
    log('3. Navigate to Banks Portal', 'cyan');
    log('4. Check each tab:', 'cyan');
    log(`   - Tab 0: Should see ${testResults.lcs.length} LCs`, 'cyan');
    log(`   - Tab 3: Should see ${pendingExamination.length} pending examination`, 'cyan');
    log(`   - Tab 4: Should see ${readyForPayment.length} ready for payment`, 'cyan');
    log(`   - Tab 8: Should see ${testResults.deliveredShipments.length} delivered shipments`, 'cyan');
    
    if (testResults.deliveredShipments.length > 0) {
      log('\n5. In Tab 8, for each shipment:', 'cyan');
      log('   - Verify PostDeliveryWorkflowPanel displays', 'cyan');
      log('   - Check progress bar and percentage', 'cyan');
      log('   - Test "Record Payment" button (if available)', 'cyan');
      log('   - Test "Record LC Settlement" button (if available)', 'cyan');
    }
    
    log('\n✅ Test completed successfully!', 'green');
    log(`\nTest Completed: ${new Date().toLocaleString()}`, 'cyan');

  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
