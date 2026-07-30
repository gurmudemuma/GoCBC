// Test LC Query to debug empty LCID issue
const axios = require('axios');

async function testLCQuery() {
  try {
    // First login to get token
    console.log('\n=== Logging in ===\n');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    console.log('✅ Login successful, got token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN!');
    
    if (!token) {
      console.error('❌ No token found in login response');
      return;
    }
    
    console.log('\n=== Testing LC Query for CONTRACT1784193660328 ===\n');
    
    // Get all LCs
    const allLCsResponse = await axios.get('http://localhost:3001/api/v1/banking/lc', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('All LCs Response:', JSON.stringify(allLCsResponse.data, null, 2));
    
    if (allLCsResponse.data.success && Array.isArray(allLCsResponse.data.data)) {
      const lcsForContract = allLCsResponse.data.data.filter(lc => 
        lc.contractId === 'CONTRACT1784193660328' || lc.ContractID === 'CONTRACT1784193660328'
      );
      
      console.log('\n=== LCs for CONTRACT1784193660328 ===');
      console.log(JSON.stringify(lcsForContract, null, 2));
      
      if (lcsForContract.length > 0) {
        const lc = lcsForContract[0];
        console.log('\n=== First LC Details ===');
        console.log('LCID field:', lc.LCID);
        console.log('lcId field:', lc.lcId);
        console.log('lcID field:', lc.lcID);
        console.log('All keys:', Object.keys(lc));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

testLCQuery();
