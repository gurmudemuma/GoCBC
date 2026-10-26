const http = require('http');

// Test document download endpoint
const documentId = 'DOC-1786108859099954228'; // TIN Certificate

console.log(`\n=== Testing Document Download ===`);
console.log(`Document ID: ${documentId}`);
console.log(`URL: http://localhost:3001/api/v1/documents/${documentId}/download\n`);

// First, login to get token
const loginData = JSON.stringify({
  username: 'ectaAdmin',
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
      if (response.success && response.data.token) {
        const token = response.data.token;
        console.log('✓ Login successful, got token\n');
        
        // Now try to download document
        const downloadOptions = {
          hostname: 'localhost',
          port: 3001,
          path: `/api/v1/documents/${documentId}/download`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const downloadReq = http.request(downloadOptions, (downloadRes) => {
          console.log(`Download response status: ${downloadRes.statusCode}`);
          console.log(`Content-Type: ${downloadRes.headers['content-type']}`);
          console.log(`Content-Length: ${downloadRes.headers['content-length']}\n`);
          
          let fileData = '';
          downloadRes.on('data', (chunk) => {
            fileData += chunk;
          });
          
          downloadRes.on('end', () => {
            if (downloadRes.statusCode === 200) {
              console.log('✓ Document downloaded successfully!');
              console.log(`Content: "${fileData}"\n`);
            } else {
              console.log('✗ Download failed');
              console.log(`Response: ${fileData}\n`);
            }
            process.exit(0);
          });
        });
        
        downloadReq.on('error', (err) => {
          console.error('Download request error:', err.message);
          process.exit(1);
        });
        
        downloadReq.end();
      } else {
        console.error('✗ Login failed:', response);
        process.exit(1);
      }
    } catch (err) {
      console.error('✗ Error parsing login response:', err.message);
      console.log('Response:', data);
      process.exit(1);
    }
  });
});

loginReq.on('error', (err) => {
  console.error('Login request error:', err.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
