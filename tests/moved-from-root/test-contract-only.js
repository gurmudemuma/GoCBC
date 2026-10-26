#!/usr/bin/env node
const http = require('http');

// Test contract registration only (assuming documents are already uploaded)
async function testContractRegistration() {
  // Step 1: Login
  console.log('Logging in...');
  const loginData = JSON.stringify({ username: 'testexporter', password: 'password123' });
  
  const loginPromise = new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Login timeout')));
    req.write(loginData);
    req.end();
  });
  
  const loginResult = await loginPromise;
  
  if (loginResult.status !== 200) {
    console.log('❌ Login failed');
    return;
  }
  
  const token = loginResult.data.data.token;
  const user = loginResult.data.data.user;
  console.log('✅ Logged in as:', user.fullName);
  
  // Step 2: Register contract
  console.log('\nRegistering contract...');
  const contractId = `CONTRACT_${Date.now()}`;
  
  const contractPayload = {
    contractID: contractId,
    exporterID: user.exporterId,
    buyerID: 'STARBUCKS_COFFEE_COMPANY',
    buyerName: 'Starbucks Coffee Company',
    buyerCountry: 'United States',
    buyerBank: 'Chase Bank',
    exporterBank: 'Commercial Bank of Ethiopia',
    coffeeType: 'Yirgacheffe Grade 1',
    quantity: 12000,  // 200 bags × 60kg
    pricePerKg: 6.5,
    currency: 'USD',
    paymentMethod: 'LC',
    eudrRequired: true,
    deliveryDate: '2026-12-31',
    portOfLoading: 'Djibouti',
    portOfDestination: 'Seattle',
    incoterm: 'FOB',
    documents: []  // Empty for now, test without documents first
  };
  
  const contractData = JSON.stringify(contractPayload);
  
  const contractPromise = new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/contracts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': contractData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => reject(new Error('Contract registration timeout')));
    req.write(contractData);
    req.end();
  });
  
  const contractResult = await contractPromise;
  
  console.log('Response Status:', contractResult.status);
  console.log('Response:', JSON.stringify(contractResult.data || contractResult.raw, null, 2));
  
  if (contractResult.status === 201 || contractResult.status === 202) {
    console.log('\n✅✅✅ CONTRACT REGISTERED SUCCESSFULLY!');
  } else {
    console.log('\n❌ CONTRACT REGISTRATION FAILED');
  }
}

testContractRegistration().catch(console.error);
