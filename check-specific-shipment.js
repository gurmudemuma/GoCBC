const axios = require('axios');

async function checkSpecificShipment() {
  try {
    const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = login.data.data.token;
    const shipmentId = 'SHIPMENT1784646554928';
    
    console.log(`Fetching shipment ${shipmentId}...\n`);
    
    const response = await axios.get(`http://localhost:3001/api/v1/shipments/${shipmentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('Shipment Data:');
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('Error:', response.data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkSpecificShipment();
