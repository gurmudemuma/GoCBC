const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function test() {
  const login = await axios.post(`${API}/auth/login`, {
    username: 'ecta_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  const ready = await axios.get(`${API}/customs/permit-ready`, { headers });
  
  for (const inspection of ready.data.data.slice(0, 2)) {
    console.log(`\n=== Testing ${inspection.shipmentId} ===`);
    console.log(`Inspection: ${inspection.inspectionId}`);
    console.log(`Permit: ${inspection.exportPermitNo}`);
    
    try {
      const result = await axios.post(`${API}/customs/declaration/auto-create-from-permit`, {
        inspectionId: inspection.inspectionId,
        shipmentId: inspection.shipmentId,
        exporterId: inspection.exporterId,
        exportPermitNo: inspection.exportPermitNo
      }, { headers });
      
      console.log('SUCCESS:', result.data.message);
    } catch (error) {
      console.log('ERROR:', error.response?.data?.error?.message || error.message);
      if (error.response?.data?.error) {
        console.log('Full error:', JSON.stringify(error.response.data.error, null, 2));
      }
    }
  }
}

test().catch(console.error);
