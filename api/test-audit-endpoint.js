const http = require('http');

// Get auth token first
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data?.token);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test the audit endpoint
async function testAuditEndpoint(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/audit/portal/recent?limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('\n=== Audit Trail API Response ===');
        console.log('Status:', res.statusCode);
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('\n✅ SUCCESS!');
            console.log('Total logs:', result.data?.logs?.length || 0);
            console.log('Statistics:', JSON.stringify(result.data?.statistics, null, 2));
            
            if (result.data?.logs?.length > 0) {
              console.log('\nFirst audit log:');
              console.log(JSON.stringify(result.data.logs[0], null, 2));
            }
          } catch (e) {
            console.error('Failed to parse response:', e);
            console.log('Raw response:', data);
          }
        } else {
          console.error('❌ ERROR:', res.statusCode);
          console.log('Response:', data);
        }
        resolve();
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('Testing Audit Trail API...\n');
    
    console.log('1. Getting auth token...');
    const token = await getAuthToken();
    console.log('✅ Token received');

    console.log('\n2. Testing /api/v1/audit/portal/recent endpoint...');
    await testAuditEndpoint(token);
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

main();
