#!/usr/bin/env node
/**
 * Complete Workflow Progression Test
 * Tests shipment progression through all workflow stages
 */

const http = require('http');

const SHIPMENT_ID = 'SHIP1787204371672';

// Workflow stages to test
const WORKFLOW_STAGES = [
  {
    name: 'In Transit',
    endpoint: `/api/v1/shipments/${SHIPMENT_ID}/reconcile-status`,
    method: 'POST',
    expectedStatus: 'IN_TRANSIT',
    data: { targetStatus: 'IN_TRANSIT' }
  },
  {
    name: 'Destination Arrival',
    endpoint: `/api/v1/shipments/${SHIPMENT_ID}/destination/arrive`,
    method: 'POST',
    expectedStatus: 'DESTINATION_ARRIVED',
    data: {}
  }
];

let currentStage = 0;
let token = null;

console.log(`\n🚢 Complete Workflow Progression Test`);
console.log(`   Shipment: ${SHIPMENT_ID}`);
console.log(`   Stages: ${WORKFLOW_STAGES.length}\n`);

// Login first
function login(callback) {
  const loginData = JSON.stringify({
    username: 'shippingAdmin',
    password: 'password123'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const response = JSON.parse(data);
      token = response.data?.token || response.token;
      
      if (!token) {
        console.error('❌ Login failed');
        process.exit(1);
      }
      
      console.log('✅ Authenticated\n');
      callback();
    });
  });

  loginReq.on('error', (error) => {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  });

  loginReq.write(loginData);
  loginReq.end();
}

// Get current shipment status
function getCurrentStatus(callback) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/shipments/${SHIPMENT_ID}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  };

  http.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          const status = response.data.status || response.data.Status;
          callback(null, status);
        } else {
          callback(response.error);
        }
      } catch (error) {
        callback(error);
      }
    });
  }).on('error', callback);
}

// Execute a workflow stage
function executeStage(stage, callback) {
  console.log(`\n📦 Stage ${currentStage + 1}/${WORKFLOW_STAGES.length}: ${stage.name}`);
  console.log(`   Expected Status: ${stage.expectedStatus}`);
  
  const postData = JSON.stringify(stage.data);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: stage.endpoint,
    method: stage.method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (response.success) {
          console.log(`   ✅ ${stage.name} completed`);
          console.log(`   Status: ${response.data?.status || stage.expectedStatus}`);
          console.log(`   TX ID: ${response.txId}`);
          
          // Wait a bit for blockchain to settle
          setTimeout(() => {
            currentStage++;
            if (currentStage < WORKFLOW_STAGES.length) {
              executeStage(WORKFLOW_STAGES[currentStage], callback);
            } else {
              callback(null);
            }
          }, 2000);
        } else {
          console.error(`   ❌ Failed: ${response.error?.message || 'Unknown error'}`);
          if (response.error?.details) {
            console.error(`   Details:`, response.error.details);
          }
          callback(response.error);
        }
      } catch (error) {
        console.error(`   ❌ Parse error:`, error.message);
        console.log(`   Raw response:`, data);
        callback(error);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`   ❌ Request failed:`, error.message);
    callback(error);
  });

  req.write(postData);
  req.end();
}

// Main execution
login(() => {
  console.log('🔍 Checking current status...');
  getCurrentStatus((err, status) => {
    if (err) {
      console.error('❌ Failed to get current status:', err);
      process.exit(1);
    }
    
    console.log(`   Current Status: ${status}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Starting Workflow Progression');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    executeStage(WORKFLOW_STAGES[0], (err) => {
      if (err) {
        console.error('\n❌ Workflow progression failed');
        process.exit(1);
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Verifying Final Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      getCurrentStatus((err, finalStatus) => {
        if (err) {
          console.error('❌ Failed to verify final status:', err);
          process.exit(1);
        }
        
        console.log(`✅ Workflow Complete!`);
        console.log(`   Final Status: ${finalStatus}`);
        console.log(`   Stages Completed: ${currentStage}/${WORKFLOW_STAGES.length}\n`);
        
        if (finalStatus === 'DELIVERED') {
          console.log('🎉 SUCCESS: Shipment progressed through complete workflow!');
        } else {
          console.log(`⚠️  WARNING: Expected DELIVERED but got ${finalStatus}`);
        }
      });
    });
  });
});
