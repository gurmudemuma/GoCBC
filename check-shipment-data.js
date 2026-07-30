const axios = require('axios');

async function checkShipmentData() {
  try {
    console.log('=== Checking Shipment Data from Blockchain ===\n');
    
    // Login
    const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = login.data.data.token;
    console.log('✅ Logged in as EXP8277584\n');
    
    // Fetch all shipments
    const response = await axios.get('http://localhost:3001/api/v1/shipments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const allShipments = response.data.data;
    console.log(`Total shipments in blockchain: ${allShipments.length}`);
    
    // Filter for this exporter
    const myShipments = allShipments.filter(s => s.exporterId === 'EXP8277584');
    console.log(`My shipments (EXP8277584): ${myShipments.length}\n`);
    
    if (myShipments.length === 0) {
      console.log('❌ No shipments found for EXP8277584');
      return;
    }
    
    // Display first shipment in detail
    console.log('========== FIRST SHIPMENT DETAILS ==========');
    console.log(JSON.stringify(myShipments[0], null, 2));
    console.log('============================================\n');
    
    // Check critical fields
    console.log('=== CRITICAL FIELDS CHECK ===');
    console.log(`Shipment ID: ${myShipments[0].shipmentId || myShipments[0].ShipmentID || 'MISSING'}`);
    console.log(`Contract ID: ${myShipments[0].contractId || myShipments[0].ContractID || 'MISSING'}`);
    console.log(`Quantity: ${myShipments[0].quantity !== undefined ? myShipments[0].quantity : 'MISSING'}`);
    console.log(`Grade: ${myShipments[0].grade || 'MISSING'}`);
    console.log(`Buyer ID: ${myShipments[0].buyerId || 'MISSING'}`);
    console.log(`Status: ${myShipments[0].status || 'MISSING'}`);
    console.log(`Origin: ${myShipments[0].origin || 'MISSING'}`);
    console.log('');
    
    // Summary of all shipments
    console.log('=== ALL MY SHIPMENTS SUMMARY ===');
    myShipments.forEach((s, index) => {
      console.log(`${index + 1}. ${s.shipmentId || s.ShipmentID}`);
      console.log(`   Quantity: ${s.quantity !== undefined ? s.quantity + ' kg' : 'N/A'}`);
      console.log(`   Grade: ${s.grade || 'N/A'}`);
      console.log(`   Status: ${s.status || 'N/A'}`);
      console.log('');
    });
    
    // Check if quantities are all zero
    const nonZeroShipments = myShipments.filter(s => s.quantity && s.quantity > 0);
    console.log(`Shipments with quantity > 0: ${nonZeroShipments.length} / ${myShipments.length}`);
    
    if (nonZeroShipments.length === 0) {
      console.log('\n⚠️  WARNING: ALL shipments have quantity = 0 or undefined!');
      console.log('This means the data in blockchain has no quantity values.');
      console.log('You may need to create new test shipments with proper data.\n');
    } else {
      console.log('\n✅ Shipments have quantity data!');
      console.log('The issue is likely in the UI data mapping or display.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkShipmentData();
