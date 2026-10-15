#!/usr/bin/env node

const http = require('http');

console.log('Testing API after fix...\n');

// Test health
http.get('http://localhost:3001/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Health:', data);
    console.log('');
    
    // Login
    const postData = JSON.stringify({username: 'admin', password: 'admin123'});
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': postData.length}
    }, (res2) => {
      let loginData = '';
      res2.on('data', chunk => loginData += chunk);
      res2.on('end', () => {
        const token = JSON.parse(loginData).token;
        if (!token) {
          console.log('Login failed:', loginData);
          process.exit(1);
        }
        
        console.log('✓ Logged in, token:', token.substring(0, 30) + '...');
        console.log('');
        
        // Get contracts
        http.get({
          hostname: 'localhost',
          port: 3001,
          path: '/api/v1/contracts',
          headers: {'Authorization': `Bearer ${token}`}
        }, (res3) => {
          let contractsData = '';
          res3.on('data', chunk => contractsData += chunk);
          res3.on('end', () => {
            const contracts = JSON.parse(contractsData);
            console.log('Contracts response:');
            console.log(JSON.stringify(contracts, null, 2));
            
            if (contracts.data && contracts.data.length > 0) {
              console.log('\n✓✓✓ SUCCESS! Found', contracts.data.length, 'contracts');
              console.log('\nFirst contract:');
              console.log(JSON.stringify(contracts.data[0], null, 2));
            } else {
              console.log('\n✗ No contracts returned');
            }
            process.exit(0);
          });
        }).on('error', (e) => {
          console.error('Contracts request error:', e.message);
          process.exit(1);
        });
      });
    });
    req.write(postData);
    req.end();
  });
}).on('error', (e) => {
  console.error('Health check error:', e.message);
  console.error('\nAPI is not running! Start it with:');
  console.error('cd /home/guda/GoCBC && bash RUN-THIS-TO-FIX.sh');
  process.exit(1);
});
