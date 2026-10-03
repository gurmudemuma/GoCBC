// Test users endpoint to see actual error
const axios = require('axios');

async function testUsersEndpoint() {
  try {
    console.log('Testing /api/v1/users endpoint...\n');
    
    // First, login as admin to get token
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Logged in successfully');
    console.log('Token:', token.substring(0, 20) + '...\n');
    
    // Now try to get users
    console.log('Fetching users with limit=10, offset=0...');
    const usersResponse = await axios.get('http://localhost:3001/api/v1/users?limit=10&offset=0', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Users fetched successfully!');
    console.log('Response:', JSON.stringify(usersResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error occurred:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    // Try to get more details from stack
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

testUsersEndpoint();
