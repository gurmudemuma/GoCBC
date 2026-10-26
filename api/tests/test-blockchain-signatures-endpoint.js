/**
 * Test the blockchain-signatures API endpoint
 */

const axios = require('axios');

async function testEndpoint() {
  try {
    console.log('Testing blockchain-signatures endpoint...\n');
    
    // First, login to get a token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');
    
    // Test the blockchain-signatures endpoint
    console.log('2. Testing /api/v1/blockchain-signatures/entity/FOREX_ALLOCATION/...');
    const forexId = 'FOREX_LC1787055024941_1787059332852_v2';
    
    const response = await axios.get(
      `http://localhost:3001/api/v1/blockchain-signatures/entity/FOREX_ALLOCATION/${forexId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ Blockchain signatures endpoint is working!');
      console.log(`Found ${response.data.data.signatures.length} signatures`);
    } else {
      console.log('\n❌ Endpoint returned error');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to API. Is it running on http://localhost:3001?');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testEndpoint();
