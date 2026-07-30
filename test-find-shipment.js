// Find our specific shipment in the list
const axios = require('axios');

async function findShipment() {
  try {
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    
    // Get all shipments
    const response = await axios.get('http://localhost:3001/api/v1/shipments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data.success && response.data.data) {
      const shipments = response.data.data;
      console.log(`\nTotal shipments returned: ${shipments.length}`);
      
      // Find our specific shipment
      const ourShipment = shipments.find(s => 
        (s.shipmentID || s.shipmentId) === 'SHIPMENT1784708976913'
      );
      
      if (ourShipment) {
        console.log('\n✅ Found our shipment SHIPMENT1784708976913:');
        console.log(JSON.stringify(ourShipment, null, 2));
      } else {
        console.log('\n❌ Shipment SHIPMENT1784708976913 NOT FOUND in list');
        
        // Show a few shipment IDs for comparison
        console.log('\nFirst 5 shipment IDs in the list:');
        shipments.slice(0, 5).forEach((s, idx) => {
          console.log(`${idx + 1}. ${s.shipmentID || s.shipmentId} - quantity: ${s.quantity}, grade: ${s.grade}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

findShipment();
