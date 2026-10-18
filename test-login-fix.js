
const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'exp001',
      password: 'password123'
    });
    console.log('Login Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Login Error:', error.response ? error.response.data : error.message);
  }
}

testLogin();
