const axios = require('axios');

const API_URL = 'http://localhost:3001/api/v1';

async function test() {
  try {
    console.log('Logging in as ectaAdmin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'ectaAdmin',
      password: 'password123'
    });

    const token = loginRes.data.data.token;
    console.log('Login successful. Token acquired.');

    console.log('Fetching contracts...');
    const contractsRes = await axios.get(`${API_URL}/contracts`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n=== API Response ===');
    console.log('Success:', contractsRes.data.success);
    console.log('Total contracts:', contractsRes.data.data.length);
    console.log('Contracts:', JSON.stringify(contractsRes.data.data, null, 2));

    const contract = contractsRes.data.data.find(c => c.contractId === 'CONTRACT_READY_FOR_APPROVAL');
    if (contract) {
      console.log('\n✅ Found CONTRACT_READY_FOR_APPROVAL');
      console.log('Status:', contract.status);
      console.log('Contract Status:', contract.contractStatus);
    } else {
      console.log('\n❌ CONTRACT_READY_FOR_APPROVAL not found in API response');
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
