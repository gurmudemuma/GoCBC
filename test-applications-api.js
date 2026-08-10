// Test Applications API Endpoint
const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n=== Testing Exporter Applications API ===\n');
    
    // Step 1: Login as ECTA admin
    console.log('1. Logging in as ectaAdmin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'ectaAdmin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');
    
    // Step 2: Get pending applications
    console.log('2. Fetching pending applications...');
    const appsResponse = await axios.get('http://localhost:3001/api/v1/exporters/exporter-applications?status=pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`API Response Status: ${appsResponse.status}`);
    console.log(`Success: ${appsResponse.data.success}`);
    console.log(`Applications Count: ${appsResponse.data.data?.length || 0}\n`);
    
    if (appsResponse.data.data && appsResponse.data.data.length > 0) {
      console.log('📋 Pending Applications:');
      console.log('─'.repeat(100));
      appsResponse.data.data.forEach(app => {
        console.log(`${app.application_id} | ${app.company_name} | ${app.status} | ${app.submitted_at}`);
      });
      console.log('─'.repeat(100));
    } else {
      console.log('⚠️  No pending applications returned by API');
    }
    
    console.log('\n✅ API test complete\n');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testAPI();
