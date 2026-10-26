#!/usr/bin/env node
/**
 * Test /banking/lc endpoint to verify buyer names are returned
 */

const http = require('http');

// First login to get token
const loginData = JSON.stringify({
  username: 'bankAdmin',
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

console.log('1. Logging in as bankAdmin...');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const loginResult = JSON.parse(data);
    if (!loginResult.success) {
      console.error('❌ Login failed:', loginResult);
      process.exit(1);
    }
    
    const token = loginResult.token || loginResult.data?.token;
    console.log('✅ Login successful, token:', token ? 'received' : 'MISSING');
    
    if (!token) {
      console.error('❌ No token in response:', loginResult);
      process.exit(1);
    }
    
    // Now test /banking/lc endpoint
    console.log('2. Fetching LCs from /banking/lc...');
    
    const lcOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/banking/lc',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const lcReq = http.request(lcOptions, (res) => {
      let lcData = '';
      res.on('data', (chunk) => { lcData += chunk; });
      res.on('end', () => {
        const lcResult = JSON.parse(lcData);
        
        if (!lcResult.success) {
          console.error('❌ Failed to fetch LCs:', lcResult);
          process.exit(1);
        }
        
        console.log(`✅ Fetched ${lcResult.data.length} LCs\n`);
        
        // Check if buyer names are present
        const lcsWithBuyers = lcResult.data.filter(lc => lc.buyerName && lc.buyerName !== '');
        console.log(`📊 LCs with buyer names: ${lcsWithBuyers.length}/${lcResult.data.length}`);
        
        if (lcsWithBuyers.length > 0) {
          console.log('\n✅ SUCCESS! Sample LCs with buyer names:');
          lcsWithBuyers.slice(0, 5).forEach(lc => {
            console.log(`  - ${lc.lcId}: ${lc.buyerName} (${lc.buyerCountry || 'N/A'})`);
          });
        } else {
          console.log('\n❌ FAIL! No LCs have buyer names populated');
        }
      });
    });
    
    lcReq.on('error', (error) => {
      console.error('❌ Request error:', error);
      process.exit(1);
    });
    
    lcReq.end();
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Login error:', error);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
