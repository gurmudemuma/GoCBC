// Test login directly with your credentials
const axios = require('axios');

async function testLogin() {
  console.log('\n=== Testing Login ===\n');
  
  // CHANGE THESE TO YOUR ACTUAL CREDENTIALS
  const username = 'admin';  // ← CHANGE THIS
  const password = 'admin123';  // ← CHANGE THIS
  
  console.log(`Testing login with:`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password.replace(/./g, '*')}`);
  console.log(`  API: http://localhost:3001/api/v1/auth/login\n`);
  
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username,
      password
    });
    
    console.log('✅ LOGIN SUCCESSFUL!\n');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Your credentials are correct!');
    console.log('✅ The API is working!');
    console.log('\n🔧 The issue is with the UI, not the API.');
    console.log('   Try clearing browser cache and restarting UI server.\n');
    
  } catch (error) {
    console.log('❌ LOGIN FAILED!\n');
    
    if (error.response) {
      console.log(`Status: ${error.response.status} ${error.response.statusText}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        const errorCode = error.response.data?.error?.code;
        const errorMsg = error.response.data?.error?.message;
        
        console.log('\n❌ Authentication Failed:');
        console.log(`   Error Code: ${errorCode}`);
        console.log(`   Message: ${errorMsg}\n`);
        
        if (errorCode === 'INVALID_CREDENTIALS') {
          console.log('🔧 Solution: Your username or password is incorrect.');
          console.log('   Run: node api/check-users.js to see available users');
          console.log('   Or: node api/reset-password.js <username> to reset password\n');
        } else if (errorCode === 'ACCOUNT_SUSPENDED') {
          console.log('🔧 Solution: Your account is suspended or inactive.');
          console.log('   Check user status in database or contact admin\n');
        }
      }
    } else if (error.request) {
      console.log('❌ No response from server!');
      console.log('   Make sure API server is running on port 3001');
      console.log('   Run: netstat -ano | findstr :3001\n');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testLogin();
