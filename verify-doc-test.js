const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:3002/api/v1';

async function testDocumentSigning() {
  try {
    console.log('--- Step 1: Login as ECTA Admin ---');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'ectaAdmin',
      password: 'password123'
    });

    if (!loginRes.data.success) {
      console.error('Login failed:', loginRes.data.error);
      return;
    }

    const token = loginRes.data.data.token;
    console.log('✅ Logged in successfully. Token received.');

    console.log('\n--- Step 2: Upload a New Document ---');
    const form = new FormData();
    const testFilePath = path.join(__dirname, 'api/uploads/documents/Sample_CONTRACT_SIGNED.pdf');
    
    // Check if test file exists
    if (!fs.existsSync(testFilePath)) {
      console.error(`Test file not found at ${testFilePath}`);
      return;
    }

    form.append('file', fs.createReadStream(testFilePath));
    form.append('fileName', `Test_Doc_${Date.now()}.pdf`);
    form.append('entityType', 'CONTRACT');
    form.append('entityId', `CONT-${Date.now()}`);
    form.append('documentType', 'CONTRACT_SIGNED');
    form.append('description', 'Test document for signing');

    const uploadRes = await axios.post(`${API_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    if (!uploadRes.data.success) {
      console.error('Upload failed:', uploadRes.data.error);
      return;
    }

    const documentID = uploadRes.data.data.documentId || uploadRes.data.data.documentID;
    console.log(`✅ Document uploaded successfully. ID: ${documentID}`);

    console.log(`\n--- Step 3: Verify Document ${documentID} ---`);
    
    const verifyRes = await axios.post(
      `${API_URL}/documents/${documentID}/verify`,
      {
        verified: true,
        remarks: 'Test verification for visual signature'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (verifyRes.data.success) {
      console.log('✅ Document verified successfully!');
      console.log('Response:', JSON.stringify(verifyRes.data, null, 2));
      
      console.log('\n--- Step 4: Check Database for Signature ---');
      // I'll check manually with psql after this
    } else {
      console.error('❌ Verification failed:', verifyRes.data.error);
    }

  } catch (error) {
    console.error('❌ Error during test:', error.response ? error.response.data : error.message);
  }
}

testDocumentSigning();
