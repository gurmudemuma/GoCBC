const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:3001/api/v1';
const CONTRACT_ID = 'CONTRACT_READY_FOR_APPROVAL';

async function test() {
  try {
    console.log('Logging in as ectaAdmin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'ectaAdmin',
      password: 'password123'
    });

    const token = loginRes.data.data.token;
    console.log('Login successful. Token acquired.');

    // Create a dummy PDF file
    const dummyFilePath = path.join(__dirname, 'dummy_contract.pdf');
    fs.writeFileSync(dummyFilePath, 'Dummy PDF content for testing document upload.');
    console.log('Dummy file created.');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(dummyFilePath));
    formData.append('fileName', 'signed_contract_ready.pdf');
    formData.append('entityType', 'CONTRACT');
    formData.append('entityId', CONTRACT_ID);
    formData.append('documentType', 'CONTRACT_SIGNED');
    formData.append('description', 'Signed contract document for ECTA approval');

    console.log('Uploading document...');
    const uploadRes = await axios.post(`${API_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n=== Upload Response ===');
    console.log('Success:', uploadRes.data.success);
    console.log('Document ID:', uploadRes.data.data.documentId);
    console.log('Blockchain TX:', uploadRes.data.data.blockchainTxId);

    // Verify by fetching documents for this contract
    console.log('\nFetching documents for contract:', CONTRACT_ID);
    const docsRes = await axios.get(`${API_URL}/documents?contractID=${CONTRACT_ID}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n=== Contract Documents ===');
    console.log('Total documents:', docsRes.data.data.documents.length);
    console.log(JSON.stringify(docsRes.data.data.documents, null, 2));

    // Cleanup dummy file
    fs.unlinkSync(dummyFilePath);
    console.log('\nDummy file deleted.');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
