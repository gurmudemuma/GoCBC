#!/usr/bin/env node
/**
 * Fix Shipment Status - Reconcile blockchain status with expected workflow state
 */

const http = require('http');

const SHIPMENT_ID = 'SHIP1787204371672';
const TARGET_STATUS = 'CUSTOMS_CLEARED';

console.log(`\n🔧 Fixing Shipment Status`);
console.log(`   Shipment: ${SHIPMENT_ID}`);
console.log(`   Target Status: ${TARGET_STATUS}\n`);

// Step 1: Login to get token
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
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (!response.success) {
        console.error('❌ Login failed:', response.error || 'Unknown error');
        console.log('Response:', data);
        process.exit(1);
      }
      
      const token = response.data?.token || response.token;
      
      if (!token) {
        console.error('❌ No token received');
        console.log('Response:', data);
        process.exit(1);
      }
      console.log('✅ Authenticated successfully\n');
      
      // Step 2: Get current shipment status
      console.log('📋 Fetching current shipment status...');
      
      const getShipmentOptions = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/v1/shipments/${SHIPMENT_ID}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      http.get(getShipmentOptions, (res2) => {
        let data2 = '';
        
        res2.on('data', (chunk) => {
          data2 += chunk;
        });
        
        res2.on('end', () => {
          try {
            const shipmentResponse = JSON.parse(data2);
            
            if (!shipmentResponse.success) {
              console.error('❌ Failed to fetch shipment:', shipmentResponse.error);
              process.exit(1);
            }
            
            const currentStatus = shipmentResponse.data.status || shipmentResponse.data.Status;
            console.log(`   Current Status: ${currentStatus}`);
            console.log(`   Target Status: ${TARGET_STATUS}\n`);
            
            if (currentStatus === TARGET_STATUS) {
              console.log('✅ Status is already correct. No reconciliation needed.');
              process.exit(0);
            }
            
            // Step 3: Reconcile status
            console.log('🔄 Reconciling status on blockchain...');
            
            const reconcileData = JSON.stringify({
              targetStatus: TARGET_STATUS
            });
            
            const reconcileOptions = {
              hostname: 'localhost',
              port: 3001,
              path: `/api/v1/shipments/${SHIPMENT_ID}/reconcile-status`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': reconcileData.length
              }
            };
            
            const reconcileReq = http.request(reconcileOptions, (res3) => {
              let data3 = '';
              
              res3.on('data', (chunk) => {
                data3 += chunk;
              });
              
              res3.on('end', () => {
                try {
                  const reconcileResponse = JSON.parse(data3);
                  
                  if (reconcileResponse.success) {
                    console.log('✅ Status reconciled successfully!');
                    console.log(`   Previous: ${reconcileResponse.data.previousStatus}`);
                    console.log(`   New: ${reconcileResponse.data.newStatus}`);
                    console.log(`   TX ID: ${reconcileResponse.txId}`);
                  } else {
                    console.error('❌ Reconciliation failed:', reconcileResponse.error);
                    process.exit(1);
                  }
                } catch (error) {
                  console.error('❌ Failed to parse reconciliation response:', error.message);
                  console.log('Raw response:', data3);
                  process.exit(1);
                }
              });
            });
            
            reconcileReq.on('error', (error) => {
              console.error('❌ Reconciliation request failed:', error.message);
              process.exit(1);
            });
            
            reconcileReq.write(reconcileData);
            reconcileReq.end();
            
          } catch (error) {
            console.error('❌ Failed to parse shipment response:', error.message);
            console.log('Raw response:', data2);
            process.exit(1);
          }
        });
      }).on('error', (error) => {
        console.error('❌ Get shipment request failed:', error.message);
        process.exit(1);
      });
      
    } catch (error) {
      console.error('❌ Failed to parse login response:', error.message);
      console.log('Raw response:', data);
      process.exit(1);
    }
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Login request failed:', error.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
