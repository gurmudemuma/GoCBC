const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function test() {
  // Login
  const login = await axios.post(`${API}/auth/login`, {
    username: 'ecta_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('1. Checking permit-ready inspections...');
  const ready = await axios.get(`${API}/customs/permit-ready`, { headers });
  console.log(`   Found ${ready.data.data.length} permit-ready inspections`);

  if (ready.data.data.length > 0) {
    const inspection = ready.data.data[0];
    console.log(`\n2. Using inspection: ${inspection.inspectionId}`);
    console.log(`   Shipment: ${inspection.shipmentId}`);
    console.log(`   Export Permit: ${inspection.exportPermitNo}`);

    // Try to auto-create customs declaration
    console.log('\n3. Auto-creating customs declaration...');
    try {
      const result = await axios.post(`${API}/customs/declaration/auto-create-from-permit`, {
        inspectionId: inspection.inspectionId,
        shipmentId: inspection.shipmentId,
        exporterId: inspection.exporterId,
        exportPermitNo: inspection.exportPermitNo
      }, { headers });
      
      console.log('   ✅ SUCCESS:', result.data.message);
      console.log('   Declaration ID:', result.data.declarationId);
      console.log('   Auto-mapped data:', JSON.stringify(result.data.autoMapped, null, 2));
    } catch (error) {
      console.log('   ❌ FAILED:', error.response?.data?.error?.message || error.message);
    }
  } else {
    console.log('\n❌ No permit-ready inspections found. Need to run complete workflow first.');
  }
}

test().catch(console.error);
