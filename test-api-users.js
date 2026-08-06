// Test API User Creation Endpoint
const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n=== Testing API User Endpoints ===\n');
    
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Get all users
    console.log('\n2. Fetching all users...');
    const usersResponse = await axios.get('http://localhost:3001/api/v1/users?limit=1000', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${usersResponse.data.data.users.length} users:`);
    usersResponse.data.data.users.forEach(user => {
      console.log(`   - ${user.username.padEnd(25)} | ${user.role.padEnd(20)} | ${user.organization || 'N/A'}`);
    });
    
    console.log('\n✅ API test complete\n');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response from server. Is the API running on port 3001?');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testAPI();
