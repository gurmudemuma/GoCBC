#!/usr/bin/env node
/**
 * Test Land Transport - Verify shipment can now progress through workflow
 */

const http = require('http');

const SHIPMENT_ID = 'SHIP1787204371672';

console.log(`\n🚚 Testing Land Transport Start`);
console.log(`   Shipment: ${SHIPMENT_ID}\n`);

// Step 1: Login
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
    const response = JSON.parse(data);
    const token = response.data?.token || response.token;
    
    if (!token) {
      console.error('❌ Login failed');
      process.exit(1);
    }
    
    console.log('✅ Authenticated\n');
    
    // Step 2: Start land transport
    console.log('🚚 Starting land transport...');
    
    const transportData = JSON.stringify({
      truckPlateNumber: 'ET-3-12345',
      driverName: 'Test Driver',
      transportCompany: 'Test Logistics Ltd'
    });
    
    const transportOptions = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/shipments/${SHIPMENT_ID}/land-transport/start`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': transportData.length
      }
    };
    
    const transportReq = http.request(transportOptions, (res2) => {
      let data2 = '';
      
      res2.on('data', (chunk) => {
        data2 += chunk;
      });
      
      res2.on('end', () => {
        try {
          const transportResponse = JSON.parse(data2);
          
          if (transportResponse.success) {
            console.log('✅ Land transport started successfully!');
            console.log(`   Status: ${transportResponse.data?.status || 'LAND_TRANSPORT'}`);
            console.log(`   TX ID: ${transportResponse.txId}`);
          } else {
            console.error('❌ Failed to start land transport:', transportResponse.error);
            console.log('Full response:', JSON.stringify(transportResponse, null, 2));
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
          console.log('Raw response:', data2);
        }
      });
    });
    
    transportReq.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      process.exit(1);
    });
    
    transportReq.write(transportData);
    transportReq.end();
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Login failed:', error.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
