const axios = require('axios');

/**
 * This script fixes shipments that have empty/zero values by populating them
 * with correct data from their associated contracts.
 */

async function fixEmptyShipments() {
  try {
    console.log('=== Fixing Empty Shipment Data ===\n');
    
    // Login as exporter
    const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = login.data.data.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in as EXP8277584\n');
    
    // Fetch all shipments
    const shipmentsResponse = await axios.get('http://localhost:3001/api/v1/shipments', {
      headers: authHeaders
    });
    
    const allShipments = shipmentsResponse.data.data;
    const myShipments = allShipments.filter(s => s.exporterId === 'EXP8277584');
    console.log(`Found ${myShipments.length} shipments for EXP8277584\n`);
    
    // Fetch contracts to get proper data
    const contractsResponse = await axios.get('http://localhost:3001/api/v1/contracts', {
      headers: authHeaders
    });
    
    const contracts = contractsResponse.data.data;
    console.log(`Found ${contracts.length} total contracts\n`);
    
    // Find the contract for these shipments
    const myContract = contracts.find(c => c.contractId === 'CONTRACT1784193660328');
    
    if (!myContract) {
      console.log('❌ Contract CONTRACT1784193660328 not found');
      return;
    }
    
    console.log('Contract Details:');
    console.log(`  Contract ID: ${myContract.contractId || myContract.ContractID}`);
    console.log(`  Exporter: ${myContract.exporterId || myContract.ExporterID}`);
    console.log(`  Buyer: ${myContract.buyerId || myContract.buyerID || myContract.BuyerID}`);
    console.log(`  Buyer Name: ${myContract.buyerName || myContract.BuyerName}`);
    console.log(`  Quantity: ${myContract.quantity || myContract.Quantity} kg`);
    console.log(`  Coffee Type: ${myContract.coffeeType || myContract.CoffeeType}`);
    console.log(`  Price/kg: $${myContract.pricePerKg || myContract.PricePerKg}`);
    console.log(`  Origin: ${myContract.origin || myContract.Origin}`);
    console.log('');
    
    // Calculate reasonable defaults based on contract
    const contractQuantity = myContract.quantity || myContract.Quantity || 100000;
    const pricePerKg = myContract.pricePerKg || myContract.PricePerKg || 2.05;
    const buyerId = myContract.buyerId || myContract.buyerID || myContract.BuyerID || 'BUYER001';
    const origin = myContract.origin || myContract.Origin || 'Yirgacheffe, Gedeo Zone, Ethiopia';
    
    console.log('=== Updating Shipments ===\n');
    
    // For each empty shipment, update it with proper data
    for (let i = 0; i < myShipments.length; i++) {
      const shipment = myShipments[i];
      
      // Skip if shipment already has data
      if (shipment.quantity > 0 && shipment.grade && shipment.buyerId) {
        console.log(`✓ Shipment ${shipment.shipmentId} already has data, skipping`);
        continue;
      }
      
      console.log(`\n${i + 1}. Updating ${shipment.shipmentId}...`);
      
      // Calculate quantity: distribute contract quantity across shipments
      const shipmentQuantity = Math.floor(contractQuantity / myShipments.length);
      const valueUSD = shipmentQuantity * pricePerKg;
      
      const updatedData = {
        ...shipment,
        buyerId: buyerId,
        origin: origin,
        quantity: shipmentQuantity,
        grade: 'Grade 1',
        icoNumber: shipment.icoNumber || `ICO-ET-${Date.now()}-${i}`,
        ecxLotNumber: shipment.ecxLotNumber || `ECX-2026-${Date.now()}-${i}`,
        forexRate: 115.5,
        valueUsd: valueUSD,
        transportMode: 'SEA',
        channel: 'Direct Export',
        eudrCompliant: true,
      };
      
      console.log(`   Origin: ${origin}`);
      console.log(`   Quantity: ${shipmentQuantity} kg`);
      console.log(`   Grade: Grade 1`);
      console.log(`   Buyer ID: ${buyerId}`);
      console.log(`   Value USD: $${valueUSD.toFixed(2)}`);
      
      try {
        // Note: We need to use UpdateShipment chaincode function
        // This may require adding an update endpoint to the API
        console.log(`   ⚠️  Update endpoint not available - shipment data logged above`);
        console.log(`   You can manually update or recreate this shipment with correct data`);
      } catch (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total shipments: ${myShipments.length}`);
    console.log(`Shipments with quantity = 0: ${myShipments.filter(s => s.quantity === 0).length}`);
    console.log('');
    console.log('⚠️  RECOMMENDATION: ');
    console.log('Since there\'s no UPDATE endpoint, you should:');
    console.log('1. Delete the existing empty shipments');
    console.log('2. Create NEW shipments through the UI with proper form data');
    console.log('3. Or add an UpdateShipment chaincode function and API endpoint');
    console.log('');
    console.log('For now, create a NEW test shipment through:');
    console.log('  node test-shipment-workflow.js');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

fixEmptyShipments();
