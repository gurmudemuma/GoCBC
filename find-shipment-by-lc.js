const axios = require('axios');

async function findShipmentByLC() {
  try {
    console.log('=== Finding Shipment for LC1784193914912 ===\n');
    
    // Login
    const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = login.data.data.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in as EXP8277584\n');
    
    // Step 1: Get all LCs and find the specific one
    console.log('Step 1: Fetching all LCs...');
    const lcResponse = await axios.get('http://localhost:3001/api/v1/banking/lc', {
      headers: authHeaders
    });
    
    if (lcResponse.data.success && lcResponse.data.data) {
      const allLCs = lcResponse.data.data;
      const targetLC = allLCs.find(lc => 
        (lc.lcId || lc.LCID) === 'LC1784193914912'
      );
      
      if (!targetLC) {
        console.log('❌ LC not found: LC1784193914912');
        console.log(`Total LCs in blockchain: ${allLCs.length}`);
        console.log('Available LC IDs:', allLCs.map(lc => lc.lcId || lc.LCID).slice(0, 10).join(', '));
        return;
      }
      
      const lc = targetLC;
      console.log('LC Details:');
      console.log(`  LC ID: ${lc.lcId || lc.LCID}`);
      console.log(`  Contract ID: ${lc.contractId || lc.ContractID}`);
      console.log(`  Amount: ${lc.amount || lc.Amount} ${lc.currency || lc.Currency}`);
      console.log(`  Status: ${lc.status || lc.Status}`);
      console.log(`  Exporter ID: ${lc.exporterId || lc.ExporterID}`);
      console.log('');
      
      const contractId = lc.contractId || lc.ContractID;
      
      // Step 2: Find shipments for this contract
      console.log(`Step 2: Searching for shipments on contract ${contractId}...`);
      const shipmentsResponse = await axios.get('http://localhost:3001/api/v1/shipments', {
        headers: authHeaders
      });
      
      if (shipmentsResponse.data.success && shipmentsResponse.data.data) {
        const allShipments = shipmentsResponse.data.data;
        const contractShipments = allShipments.filter(s => 
          (s.contractId || s.ContractID) === contractId
        );
        
        console.log(`Found ${contractShipments.length} shipment(s) for contract ${contractId}\n`);
        
        if (contractShipments.length === 0) {
          console.log('❌ No shipments found for this LC\'s contract');
          console.log(`   LC: LC1784193914912`);
          console.log(`   Contract: ${contractId}`);
          console.log('\nThis means:');
          console.log('1. The exporter has not yet registered a shipment for this contract');
          console.log('2. OR the shipment was filtered out due to incomplete data (quantity=0, grade empty)');
          return;
        }
        
        // Display each shipment
        contractShipments.forEach((shipment, index) => {
          console.log(`========== SHIPMENT ${index + 1} ==========`);
          console.log(JSON.stringify(shipment, null, 2));
          console.log('');
          
          console.log('Key Fields:');
          console.log(`  Shipment ID: ${shipment.shipmentId || shipment.ShipmentID}`);
          console.log(`  Contract ID: ${shipment.contractId || shipment.ContractID}`);
          console.log(`  Exporter ID: ${shipment.exporterId || shipment.ExporterID}`);
          console.log(`  Buyer ID: ${shipment.buyerId || shipment.BuyerID}`);
          console.log(`  Quantity: ${shipment.quantity || 0} kg`);
          console.log(`  Grade: ${shipment.grade || 'N/A'}`);
          console.log(`  Origin: ${shipment.origin || 'N/A'}`);
          console.log(`  Status: ${shipment.status || shipment.Status}`);
          console.log(`  Value USD: $${shipment.valueUsd || shipment.ValueUSD || 0}`);
          console.log(`  Transport Mode: ${shipment.transportMode || 'N/A'}`);
          console.log(`  EUDR Compliant: ${shipment.eudrCompliant ? 'Yes' : 'No'}`);
          console.log('');
        });
        
        console.log('=== Summary ===');
        console.log(`LC ID: LC1784193914912`);
        console.log(`Contract ID: ${contractId}`);
        console.log(`Total Shipments: ${contractShipments.length}`);
        console.log(`Shipment IDs: ${contractShipments.map(s => s.shipmentId || s.ShipmentID).join(', ')}`);
        
      } else {
        console.log('❌ Failed to fetch shipments');
      }
      
    } else {
      console.log('❌ LC not found: LC1784193914912');
      console.log('Response:', lcResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

findShipmentByLC();
