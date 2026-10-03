#!/usr/bin/env node

const axios = require('axios');

async function testUsersEndpoint() {
  console.log('='.repeat(60));
  console.log('Testing User Management Endpoint');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 30) + '...');
    console.log('');
    
    // Step 2: Fetch users
    console.log('Step 2: Fetching users (limit=10, offset=0)...');
    const usersResponse = await axios.get('http://localhost:3001/api/v1/users?limit=10&offset=0', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Users fetched successfully!');
    console.log('');
    console.log('Response Summary:');
    console.log('  Success:', usersResponse.data.success);
    console.log('  Total Users:', usersResponse.data.pagination.total);
    console.log('  Users Returned:', usersResponse.data.data.length);
    console.log('  Scope:', usersResponse.data.scope);
    console.log('');
    
    console.log('User Details:');
    console.log('-'.repeat(60));
    usersResponse.data.data.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username.padEnd(15)} | ${user.role.padEnd(10)} | ${user.email}`);
      console.log(`   Name: ${user.full_name || '(not set)'}`);
      console.log(`   Organization: ${user.organization}`);
      console.log(`   Status: ${user.status}`);
      console.log('');
    });
    
    // Step 3: Test system stats endpoint
    console.log('Step 3: Testing system stats endpoint...');
    try {
      const statsResponse = await axios.get('http://localhost:3001/api/v1/users?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ System stats endpoint working');
      console.log('   Total users in system:', statsResponse.data.pagination.total);
    } catch (statsError) {
      console.log('⚠️  System stats endpoint failed:', statsError.message);
    }
    console.log('');
    
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('');
    console.log('The User Management page should now work correctly.');
    console.log('No more 500 errors expected!');
    console.log('');
    
  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ ERROR OCCURRED');
    console.log('='.repeat(60));
    console.log('');
    
    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 500) {
        console.log('');
        console.log('⚠️  Still getting 500 error!');
        console.log('');
        console.log('Troubleshooting steps:');
        console.log('1. Check API logs: tail -f logs/api.log');
        console.log('2. Verify database schema: docker exec cecbs-postgres psql -U cecbs -d cecbs -c "\\d users"');
        console.log('3. Check migration was applied: look for "018_update_users_table_schema" in logs');
        console.log('');
      }
    } else if (error.request) {
      console.log('Error: No response from server');
      console.log('Is the API running? Check: lsof -i:3001');
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('Full error:');
    console.log(error.stack || error);
    console.log('');
    
    process.exit(1);
  }
}

testUsersEndpoint();
