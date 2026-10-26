/**
 * Test the shipments API endpoint
 */

const http = require('http');

function testAPI(path, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🧪 Testing Shipments API endpoint...\n');
  
  try {
    // First, login to get a token
    console.log('Step 1: Logging in as admin...');
    const loginData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const loginPromise = new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': loginData.length
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    const loginResult = await loginPromise;
    
    if (loginResult.status !== 200 || !loginResult.data.token) {
      console.log('❌ Login failed');
      console.log('Status:', loginResult.status);
      console.log('Response:', JSON.stringify(loginResult.data, null, 2));
      return;
    }

    const token = loginResult.data.token;
    console.log('✅ Login successful\n');

    // Now test the shipments endpoint
    console.log('Step 2: Fetching shipments...');
    const shipmentsResult = await testAPI('/api/v1/shipments', token);
    
    console.log('\n📊 Shipments API Response:');
    console.log('Status:', shipmentsResult.status);
    
    if (shipmentsResult.status === 200) {
      console.log('✅ SUCCESS! Shipments loaded without error');
      console.log('Number of shipments:', shipmentsResult.data.data?.length || 0);
      
      if (shipmentsResult.data.data?.length > 0) {
        const sample = shipmentsResult.data.data[0];
        console.log('\nSample shipment:');
        console.log('  ID:', sample.shipmentId);
        console.log('  ecxLots:', JSON.stringify(sample.ecxLots));
        console.log('  documents:', JSON.stringify(sample.documents));
        console.log('  quantity:', sample.quantity);
        console.log('  origin:', sample.origin);
      }
    } else {
      console.log('❌ ERROR:', shipmentsResult.data.error?.message || shipmentsResult.data.message);
      
      if (shipmentsResult.data.error?.message?.includes('ecxLots')) {
        console.log('\n⚠️  The null ecxLots error is STILL OCCURRING!');
        console.log('This means the error is NOT from the database.');
        console.log('Possible causes:');
        console.log('  1. SDK is caching old metadata');
        console.log('  2. Peer nodes have old data in their state');
        console.log('  3. CouchDB indexes are stale');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main().catch(console.error);
