// Test that simulates exactly what the frontend does
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

const buildApiUrl = (endpoint) => {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('FRONTEND DOCUMENT FETCH SIMULATION');
    console.log('='.repeat(80));
    
    // Step 1: Login as ectaAdmin
    console.log('\n1. Login as ectaAdmin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'ectaAdmin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('   ✅ Login successful');
    console.log('   Token:', token.substring(0, 50) + '...');
    
    // Step 2: Get application list
    console.log('\n2. Fetch application list...');
    const appsResponse = await axios.get(`${API_BASE_URL}/exporters/exporter-applications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`   ✅ Found ${appsResponse.data.data.length} applications`);
    
    // Find Jimma Buna application
    const jimmaApp = appsResponse.data.data.find(app => 
      app.company_name === 'Jimma Buna exporter'
    );
    
    if (!jimmaApp) {
      console.log('   ⚠️  Jimma Buna application not found');
      return;
    }
    
    console.log(`   ✅ Found Jimma Buna application: ${jimmaApp.application_id}`);
    
    // Step 3: Simulate frontend API call using apiFetch logic
    console.log('\n3. Fetch documents using frontend logic...');
    const endpoint = `/documents/entity/EXPORTER_APPLICATION/${jimmaApp.application_id}`;
    const url = buildApiUrl(endpoint);
    
    console.log('   Endpoint:', endpoint);
    console.log('   Full URL:', url);
    
    const docsResponse = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n4. API Response:');
    console.log('   Success:', docsResponse.data.success);
    console.log('   Documents found:', docsResponse.data.data.length);
    
    if (docsResponse.data.data.length > 0) {
      console.log('\n   📄 Documents:');
      docsResponse.data.data.forEach((doc, i) => {
        console.log(`\n   ${i + 1}. ${doc.file_name}`);
        console.log(`      ID: ${doc.document_id}`);
        console.log(`      Type: ${doc.document_type}`);
        console.log(`      Size: ${doc.file_size} bytes`);
        console.log(`      MIME: ${doc.mime_type}`);
        console.log(`      Status: ${doc.status}`);
        console.log(`      Uploaded: ${doc.uploaded_at}`);
      });
    } else {
      console.log('\n   ⚠️  NO DOCUMENTS FOUND');
      console.log('\n   📋 Next Steps:');
      console.log('   1. The applicant needs to upload documents during registration');
      console.log('   2. Or upload documents separately via the upload endpoint');
      console.log('   3. Documents should have:');
      console.log('      - entity_type: EXPORTER_APPLICATION');
      console.log(`      - entity_id: ${jimmaApp.application_id}`);
    }
    
    // Step 5: Verify how frontend would map the data
    console.log('\n5. Frontend Data Mapping:');
    if (docsResponse.data.data.length > 0) {
      const mappedDocs = docsResponse.data.data.map(doc => ({
        id: doc.document_id,
        name: doc.file_name,
        type: (doc.mime_type || 'application/pdf').split('/')[1]?.toUpperCase() || 'PDF',
        status: 'AVAILABLE',
        url: `/api/v1/documents/${doc.document_id}/download`,
        uploadedDate: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : new Date().toLocaleDateString(),
        size: doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'N/A',
        category: doc.document_type,
      }));
      
      console.log('   Mapped documents for UI:');
      console.log(JSON.stringify(mappedDocs, null, 4));
    } else {
      console.log('   No documents to map - will show default required documents list');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();
