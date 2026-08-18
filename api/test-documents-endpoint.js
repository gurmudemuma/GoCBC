// Test the documents endpoint
const axios = require('axios');

(async () => {
  try {
    // First login to get a token
    console.log('1. Logging in as ectaAdmin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'ectaAdmin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Test fetching documents for an application that has documents
    console.log('\n2. Testing endpoint with application that has documents (APP-07193259)...');
    const response1 = await axios.get(
      'http://localhost:3001/api/v1/documents/entity/EXPORTER_APPLICATION/APP-07193259',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Response:', JSON.stringify(response1.data, null, 2));
    
    // Test with Jimma Buna application (no documents expected)
    console.log('\n3. Testing endpoint with Jimma Buna application (APP-1786706626876-FPEY88)...');
    const response2 = await axios.get(
      'http://localhost:3001/api/v1/documents/entity/EXPORTER_APPLICATION/APP-1786706626876-FPEY88',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Response:', JSON.stringify(response2.data, null, 2));
    
    if (response2.data.data.length === 0) {
      console.log('\n⚠️  No documents found for Jimma Buna application');
      console.log('This means documents have not been uploaded yet.');
      console.log('The applicant needs to upload documents during registration.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
})();
