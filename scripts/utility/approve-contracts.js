// Approve existing test contracts
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function approveContracts() {
  console.log('\n=========================================');
  console.log('APPROVING TEST CONTRACTS');
  console.log('=========================================\n');

  try {
    // Login as NBE admin
    console.log('Step 1: Logging in as NBE admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'nbe_admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in successfully\n');

    // Approve CONTRACT_TEST_001
    console.log('Step 2: Approving CONTRACT_TEST_001...');
    try {
      const approveResponse = await axios.post(
        `${API_BASE}/contracts/CONTRACT_TEST_001/approve`,
        { remarks: 'Test approval for banking portal' },
        { headers }
      );
      console.log('✅ CONTRACT_TEST_001 approved');
    } catch (error) {
      console.log('ℹ️  CONTRACT_TEST_001:', error.response?.data?.error?.message || error.message);
    }

    // Approve CONTRACT_TEST_002
    console.log('\nStep 3: Approving CONTRACT_TEST_002...');
    try {
      const approveResponse = await axios.post(
        `${API_BASE}/contracts/CONTRACT_TEST_002/approve`,
        { remarks: 'Test approval for banking portal' },
        { headers }
      );
      console.log('✅ CONTRACT_TEST_002 approved');
    } catch (error) {
      console.log('ℹ️  CONTRACT_TEST_002:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n=========================================');
    console.log('✅ CONTRACTS APPROVED');
    console.log('=========================================');
    console.log('\nNow refresh the Banks Portal to see the NBE-approved contracts!');

  } catch (error) {
    console.error('\n❌ Error approving contracts:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

approveContracts();
