#!/usr/bin/env node
/**
 * Complete Post-Delivery Workflow Test
 * Tests the entire post-delivery process from delivery to contract closure
 */

const http = require('http');

const SHIPMENT_ID = 'SHIP1787204371672';
let token = null;

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║     POST-DELIVERY WORKFLOW COMPLETE TEST                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Helper function for HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Login
async function login() {
  console.log('🔐 Step 1: Authentication...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'shippingAdmin',
    password: 'password123'
  });
  
  if (response.body.success) {
    token = response.body.data?.token || response.body.token;
    console.log('   ✅ Authenticated successfully\n');
    return true;
  }
  
  console.error('   ❌ Login failed');
  return false;
}

// Get post-delivery status
async function getStatus() {
  console.log('📊 Step 2: Checking post-delivery status...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/post-delivery/${SHIPMENT_ID}/status`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.body.success) {
    const status = response.body.data;
    console.log(`   Shipment: ${status.shipmentId}`);
    console.log(`   Contract: ${status.contractId}`);
    console.log(`   Delivered: ${new Date(status.deliveryDate).toLocaleString()}`);
    console.log(`   Days Elapsed: ${status.daysElapsed}`);
    console.log(`   Completion: ${status.completionPercentage}%`);
    console.log(`   Status: ${status.overallStatus}`);
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   Payment Received: ${status.paymentReceived ? '✅' : '❌'}`);
    console.log(`   Forex Repatriated: ${status.forexRepatriated ? '✅' : '❌'}`);
    console.log(`   LC Settled: ${status.lcUsed ? (status.lcSettled ? '✅' : '❌') : 'N/A'}`);
    console.log(`   ECTA Audit: ${status.ectaAuditCompleted ? '✅' : '❌'}`);
    console.log(`   Contract Closed: ${status.contractClosed ? '✅' : '❌'}`);
    console.log('');
    return status;
  }
  
  if (response.statusCode === 404) {
    console.log('   ⚠️  No post-delivery record found (will be created on delivery)\n');
    return null;
  }
  
  console.error('   ❌ Failed to get status');
  return null;
}

// Record payment
async function recordPayment() {
  console.log('💰 Step 3: Recording payment received...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/post-delivery/${SHIPMENT_ID}/payment`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    paymentAmount: 125000.00,
    paymentCurrency: 'USD',
    swiftReference: 'SWIFT-MT103-2026-09-02'
  });
  
  if (response.body.success) {
    console.log('   ✅ Payment recorded successfully');
    console.log('   Amount: $125,000.00 USD');
    console.log('   SWIFT: SWIFT-MT103-2026-09-02\n');
    return true;
  }
  
  console.log(`   ⚠️  ${response.body.error?.message || 'Failed to record payment'}\n`);
  return false;
}

// Record forex repatriation
async function recordForex() {
  console.log('💱 Step 4: Recording forex repatriation...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/post-delivery/${SHIPMENT_ID}/forex`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    forexAmount: 125000.00,
    forexRate: 115.50
  });
  
  if (response.body.success) {
    console.log('   ✅ Forex repatriation recorded');
    console.log('   Amount: $125,000.00 USD');
    console.log('   Rate: 115.50 ETB/USD');
    console.log('   ETB Value: 14,437,500.00 ETB\n');
    return true;
  }
  
  console.log(`   ⚠️  ${response.body.error?.message || 'Failed to record forex'}\n`);
  return false;
}

// Record LC settlement
async function recordLC() {
  console.log('📄 Step 5: Recording LC settlement...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/post-delivery/${SHIPMENT_ID}/lc-settlement`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    lcReference: 'LC-2026-45678-CECBS'
  });
  
  if (response.body.success) {
    console.log('   ✅ LC settlement recorded');
    console.log('   Reference: LC-2026-45678-CECBS\n');
    return true;
  }
  
  console.log(`   ⚠️  ${response.body.error?.message || 'Failed to record LC'}\n`);
  return false;
}

// Record ECTA audit
async function recordAudit() {
  console.log('📋 Step 6: Recording ECTA audit...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/post-delivery/${SHIPMENT_ID}/ecta-audit`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    auditResult: 'PASSED',
    auditNotes: 'All documentation verified. Export compliance confirmed. No issues detected.'
  });
  
  if (response.body.success) {
    console.log('   ✅ ECTA audit completed');
    console.log('   Result: PASSED');
    console.log('   Notes: All documentation verified\n');
    return true;
  }
  
  console.log(`   ⚠️  ${response.body.error?.message || 'Failed to record audit'}\n`);
  return false;
}

// Close contract
async function closeContract() {
  console.log('📝 Step 7: Closing export contract...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/post-delivery/${SHIPMENT_ID}/close-contract`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.body.success) {
    console.log('   ✅ Contract closed successfully');
    console.log('   Export transaction complete!\n');
    return true;
  }
  
  console.log(`   ⚠️  ${response.body.error?.message || 'Failed to close contract'}\n`);
  return false;
}

// Get dashboard
async function getDashboard() {
  console.log('📊 Step 8: Fetching dashboard summary...');
  
  const response = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/post-delivery/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.body.success) {
    const data = response.body.data;
    console.log('   ✅ Dashboard data retrieved');
    console.log(`   Pending Payments: ${data.pendingPayments.length}`);
    console.log(`   Pending Forex: ${data.pendingForex.length}`);
    console.log(`   Pending Audits: ${data.pendingAudits.length}`);
    console.log(`   Ready for Closure: ${data.readyForClosure.length}\n`);
    return true;
  }
  
  console.log('   ⚠️  Failed to get dashboard\n');
  return false;
}

// Main execution
async function main() {
  try {
    // Step 1: Login
    if (!await login()) {
      process.exit(1);
    }
    
    // Step 2: Check current status
    const initialStatus = await getStatus();
    
    // Step 3-7: Execute workflow steps
    await recordPayment();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB
    
    await recordForex();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (initialStatus?.lcUsed) {
      await recordLC();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await recordAudit();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await closeContract();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 8: Get final status
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    FINAL STATUS                           ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const finalStatus = await getStatus();
    
    // Step 9: Dashboard
    await getDashboard();
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    if (finalStatus?.overallStatus === 'COMPLETED') {
      console.log('║                  ✅ TEST PASSED                           ║');
      console.log('║     Post-Delivery Workflow Completed Successfully        ║');
    } else {
      console.log('║                  ⚠️  TEST INCOMPLETE                      ║');
      console.log(`║     Status: ${(finalStatus?.overallStatus || 'UNKNOWN').padEnd(47)}║`);
    }
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

main();
