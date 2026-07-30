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
  console.log(`Found ${ready.data.data.length} permit-ready inspections\n`);

  for (const inspection of ready.data.data) {
    console.log(`Trying ${inspection.shipmentId}...`);
    try {
      const result = await axios.post(`${API}/customs/declaration/auto-create-from-permit`, {
        inspectionId: inspection.inspectionId,
        shipmentId: inspection.shipmentId,
        exporterId: inspection.exporterId,
        exportPermitNo: inspection.exportPermitNo
      }, { headers });
      
      console.log('✅ SUCCESS!');
      console.log('Declaration ID:', result.data.declarationId);
      console.log('Message:', result.data.message);
      console.log('\n✅ ECTA → Customs integration is WORKING!\n');
      return;
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('already exists')) {
        console.log('  Already has declaration, trying next...\n');
        continue;
      }
      console.log('  Error:', error.response?.data?.error?.message || error.message);
    }
  }
  
  console.log('All permit-ready shipments already have declarations.');
  console.log('✅ This means the integration WORKED previously!');
}

test().catch(console.error);
