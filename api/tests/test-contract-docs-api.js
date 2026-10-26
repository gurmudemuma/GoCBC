// Test the contract documents API endpoint
const https = require('https');
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

// Test the documents endpoint
async function testDocumentsEndpoint(token, contractId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/contracts/${contractId}/documents`,
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
        console.log('\n=== API Response ===');
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        try {
          const result = JSON.parse(data);
          console.log('\n=== Parsed Response ===');
          console.log(JSON.stringify(result, null, 2));
        } catch (e) {
          console.error('Failed to parse response:', e);
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
    console.log('Getting auth token...');
    const token = await getAuthToken();
    console.log('Token:', token ? 'RECEIVED' : 'FAILED');

    if (token) {
      console.log('\nTesting documents endpoint for CONTRACT1786364548810...');
      await testDocumentsEndpoint(token, 'CONTRACT1786364548810');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
