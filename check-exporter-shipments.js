const axios = require('axios');

async function checkExporterShipments() {
  try {
    // 1. Login as exporter
    console.log('=== Logging in as EXP8277584 ===');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const loginResult = loginResponse.data;
    if (!loginResult.success) {
      console.error('Login failed:', loginResult.error);
      return;
    }
    
    const token = loginResult.data.token;
    console.log('✅ Login successful\n');
    
    // 2. Get all shipments
    console.log('=== Fetching all shipments ===');
    const shipmentsResponse = await axios.get('http://localhost:3001/api/v1/shipments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const shipmentsResult = shipmentsResponse.data;
    if (!shipmentsResult.success) {
      console.error('Failed to fetch shipments:', shipmentsResult.error);
      return;
    }
    
    const allShipments = shipmentsResult.data || [];
    console.log(`Total shipments in system: ${allShipments.length}\n`);
    
    // 3. Filter for this exporter
    const myShipments = allShipments.filter(s => 
      (s.exporterID || s.ExporterID || s.exporterId) === 'EXP8277584'
    );
    
    console.log(`=== Shipments for EXP8277584: ${myShipments.length} ===\n`);
    
    if (myShipments.length === 0) {
      console.log('❌ No shipments found for this exporter');
      console.log('\n✅ Exporter can create a NEW shipment\n');
    } else {
      myShipments.forEach((shipment, index) => {
        console.log(`--- Shipment ${index + 1} ---`);
        console.log(`Shipment ID: ${shipment.ShipmentID || shipment.shipmentID || shipment.shipmentId}`);
        console.log(`Contract ID: ${shipment.ContractID || shipment.contractID || shipment.contractId}`);
        console.log(`Status: ${shipment.ShipmentStatus || shipment.Status || shipment.status}`);
        console.log(`Quantity: ${shipment.Quantity || shipment.quantity} kg`);
        console.log(`Grade: ${shipment.Grade || shipment.grade}`);
        console.log(`ICO Number: ${shipment.ICONumber || shipment.icoNumber}`);
        console.log(`Destination: ${shipment.Destination || shipment.destination}`);
        console.log(`EUDR Compliant: ${shipment.EUDRCompliant || shipment.eudrCompliant}`);
        console.log('');
      });
    }
    
    // 4. Get contracts with forex allocated
    console.log('=== Checking contracts with forex allocated ===');
    const contractsResponse = await axios.get('http://localhost:3001/api/v1/contracts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const contractsResult = contractsResponse.data;
    if (contractsResult.success) {
      const myContracts = (contractsResult.data || []).filter(c => 
        (c.exporterID || c.ExporterID || c.exporterId) === 'EXP8277584'
      );
      console.log(`Total contracts for exporter: ${myContracts.length}\n`);
    }
    
    // 5. Get forex allocations
    const forexResponse = await axios.get('http://localhost:3001/api/v1/forex', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const forexResult = forexResponse.data;
    if (forexResult.success) {
      const myForex = (forexResult.data || []).filter(f => 
        (f.exporterId || f.ExporterID) === 'EXP8277584'
      );
      
      console.log(`=== Forex Allocations for EXP8277584: ${myForex.length} ===\n`);
      
      myForex.forEach((forex, index) => {
        const contractId = forex.contractId || forex.ContractID;
        const status = forex.status || forex.Status;
        const amount = forex.allocatedAmount || forex.AllocatedAmount;
        
        console.log(`--- Forex ${index + 1} ---`);
        console.log(`Forex ID: ${forex.forexId || forex.ForexID}`);
        console.log(`Contract ID: ${contractId}`);
        console.log(`Status: ${status}`);
        console.log(`Allocated Amount: ${amount} ${forex.currency || forex.Currency}`);
        
        // Check if shipment exists for this contract
        const shipmentExists = myShipments.some(s => 
          (s.ContractID || s.contractID || s.contractId) === contractId
        );
        
        if (shipmentExists) {
          console.log('✅ Shipment EXISTS for this contract');
        } else {
          console.log('❌ NO shipment for this contract - READY TO CREATE');
        }
        console.log('');
      });
    }
    
    // 6. Get quality inspections
    console.log('=== Checking Quality Inspections ===');
    const inspectionsResponse = await axios.get('http://localhost:3001/api/v1/quality/inspections', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const inspectionsResult = inspectionsResponse.data;
    if (inspectionsResult.success) {
      const allInspections = inspectionsResult.data || [];
      const myInspections = allInspections.filter(i => 
        (i.exporterID || i.ExporterID) === 'EXP8277584'
      );
      
      console.log(`Total inspections for exporter: ${myInspections.length}\n`);
      
      if (myInspections.length > 0) {
        myInspections.forEach((inspection, index) => {
          console.log(`--- Inspection ${index + 1} ---`);
          console.log(`Inspection ID: ${inspection.inspectionID || inspection.InspectionID}`);
          console.log(`Shipment ID: ${inspection.shipmentID || inspection.ShipmentID}`);
          console.log(`Status: ${inspection.status || inspection.Status}`);
          console.log(`Grade: ${inspection.grade || inspection.Grade || 'Not graded yet'}`);
          console.log('');
        });
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Shipments: ${myShipments.length}`);
    console.log(`Contracts: ${contractsResult.success ? contractsResult.data.filter(c => (c.exporterID || c.ExporterID || c.exporterId) === 'EXP8277584').length : '?'}`);
    console.log(`Forex Allocations: ${forexResult.success ? forexResult.data.filter(f => (f.exporterId || f.ExporterID) === 'EXP8277584').length : '?'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkExporterShipments();
