// Test Query Shipment to see what data it has
const axios = require('axios');

async function testQueryShipment() {
  try {
    console.log('\n=== Testing Shipment Query ===\n');
    
    // First login
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Query the newly created shipment
    const shipmentId = 'SHIPMENT1784708105226';
    console.log(`\n📦 Querying shipment: ${shipmentId}`);
    
    const shipmentResponse = await axios.get(
      `http://localhost:3001/api/v1/shipments/${shipmentId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('\n✅ Shipment Data:');
    console.log(JSON.stringify(shipmentResponse.data, null, 2));
    
    // Query all shipments to see what's returned
    console.log('\n\n📦 Querying ALL shipments for exporter EXP8277584:');
    
    const allShipmentsResponse = await axios.get(
      'http://localhost:3001/api/v1/shipments',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (allShipmentsResponse.data.success && allShipmentsResponse.data.data) {
      const myShipments = allShipmentsResponse.data.data.filter((s) => 
        (s.exporterId || s.ExporterID || s.exporterID) === 'EXP8277584'
      );
      
      console.log(`\n✅ Found ${myShipments.length} shipments for EXP8277584`);
      
      myShipments.forEach((s, idx) => {
        console.log(`\n--- Shipment ${idx + 1}: ${s.shipmentID || s.shipmentId} ---`);
        console.log('Quantity:', s.quantity || s.Quantity);
        console.log('Grade:', s.grade || s.Grade);
        console.log('Status:', s.status || s.Status);
        console.log('Contract:', s.contractId || s.ContractID);
        console.log('ExporterId:', s.exporterId || s.ExporterID || s.exporterID);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

testQueryShipment();
