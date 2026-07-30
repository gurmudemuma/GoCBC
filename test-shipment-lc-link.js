// Test Shipment Creation with LC Linking
const axios = require('axios');

async function testShipmentCreation() {
  try {
    console.log('\n=== Testing Shipment Creation with LC Linking ===\n');
    
    // First login
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Create a new shipment for CONTRACT1784193660328 (which has LC1784193914912)
    const timestamp = Date.now();
    const shipmentData = {
      shipmentID: `SHIPMENT${timestamp}`,
      contractID: 'CONTRACT1784193660328',
      exporterID: 'EXP8277584',
      buyerID: 'BUYER001',
      quantity: 500,  // 500 kg
      grade: 'Grade 1',
      origin: 'Ethiopia',
      destination: 'United States',
      shipDate: '2026-07-22',
      estimatedArrival: '2026-08-15',
      icoNumber: `ICO${timestamp}`,
      channel: 'Direct',
      forexRate: 115.5,
      valueUSD: 25000,
      eudrCompliant: true,
      documents: []
    };
    
    console.log('\n📦 Creating shipment with data:', shipmentData);
    
    const shipmentResponse = await axios.post(
      'http://localhost:3001/api/v1/shipments',
      shipmentData,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('\n✅ Shipment Response:');
    console.log(JSON.stringify(shipmentResponse.data, null, 2));
    
    if (shipmentResponse.data.success) {
      const shipmentID = shipmentResponse.data.data?.shipmentID || shipmentResponse.data.shipmentID;
      console.log(`\n✅ Shipment created successfully: ${shipmentID}`);
      
      // Check API logs for LC linking debug messages
      console.log('\n📋 Check API server logs to see LC linking debug output');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    if (error.response) {
      console.error('\nStatus:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testShipmentCreation();
