// Script to create test shipment data for Shipping Portal testing
// This creates a complete shipment workflow ending in CUSTOMS_CLEARED status

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

// You need to get a valid auth token first
// Login as exporter: exporter1 / exporter1
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

async function createTestShipmentData() {
  if (!AUTH_TOKEN) {
    console.error('❌ ERROR: AUTH_TOKEN environment variable is required');
    console.log('\nHow to get token:');
    console.log('1. Login to the app (exporter1/exporter1)');
    console.log('2. Open browser console');
    console.log('3. Run: localStorage.getItem("authToken")');
    console.log('4. Set environment variable: $env:AUTH_TOKEN="your-token-here"');
    console.log('5. Run this script again');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('=== CREATING TEST SHIPMENT DATA ===\n');

    // Step 1: Create a sales contract
    console.log('Step 1: Creating sales contract...');
    const contractId = `CONTRACT-TEST-${Date.now()}`;
    const contractResponse = await fetch(`${API_URL}/contracts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contractID: contractId,
        nbeReferenceNumber: `NBE-${Date.now()}`,
        exporterID: 'EXP001',
        buyerID: 'BUYER-EU-001',
        buyerCountry: 'Germany',
        buyerBank: 'Deutsche Bank',
        exporterBank: 'Commercial Bank of Ethiopia',
        coffeeType: 'Yirgacheffe Grade 1',
        quantity: 20000,
        pricePerKg: 5.50,
        totalValue: 110000,
        currency: 'USD',
        minimumPriceCompliant: true,
        eudrRequired: true,
      })
    });
    
    const contractResult = await contractResponse.json();
    if (!contractResult.success) {
      console.error('❌ Failed to create contract:', contractResult.error);
      return;
    }
    console.log('✅ Contract created:', contractId);

    // Step 2: Create a shipment
    console.log('\nStep 2: Creating shipment...');
    const shipmentId = `SHP-TEST-${Date.now()}`;
    const shipmentResponse = await fetch(`${API_URL}/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        shipmentID: shipmentId,
        contractID: contractId,
        exporterID: 'EXP001',
        buyerID: 'BUYER-EU-001',
        origin: 'Yirgacheffe, Sidama',
        quantity: 20000,
        grade: 'Grade 1',
        icoNumber: `ICO-${Date.now()}`,
        channel: 'ECX',
        ecxLotNumber: `ECX-${Date.now()}`,
        forexRate: 57.50,
        valueUSD: 110000,
        eudrCompliant: true,
      })
    });
    
    const shipmentResult = await shipmentResponse.json();
    if (!shipmentResult.success) {
      console.error('❌ Failed to create shipment:', shipmentResult.error);
      return;
    }
    console.log('✅ Shipment created:', shipmentId);

    // Step 3: Update shipment status to QUALITY_APPROVED
    console.log('\nStep 3: Setting status to QUALITY_APPROVED...');
    await updateStatus(shipmentId, 'QUALITY_APPROVED', headers);

    // Step 4: Update shipment status to PERMIT_ISSUED
    console.log('Step 4: Setting status to PERMIT_ISSUED...');
    await updateStatus(shipmentId, 'PERMIT_ISSUED', headers);

    // Step 5: Update shipment status to CUSTOMS_DECLARED
    console.log('Step 5: Setting status to CUSTOMS_DECLARED...');
    await updateStatus(shipmentId, 'CUSTOMS_DECLARED', headers);

    // Step 6: Update shipment status to CUSTOMS_CLEARED
    console.log('Step 6: Setting status to CUSTOMS_CLEARED...');
    await updateStatus(shipmentId, 'CUSTOMS_CLEARED', headers);

    console.log('\n=== TEST DATA CREATED SUCCESSFULLY ===');
    console.log(`\nShipment ID: ${shipmentId}`);
    console.log('Status: CUSTOMS_CLEARED');
    console.log('\n✅ This shipment should now appear in the Shipping Portal!');
    console.log('\nNext steps:');
    console.log('1. Open the Shipping Portal');
    console.log('2. You should see 1 shipment in the table');
    console.log('3. Click "Record Shipping Document" to add B/L or AWB');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  }
}

async function updateStatus(shipmentId, status, headers) {
  const response = await fetch(`${API_URL}/shipments/${shipmentId}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log(`  ✅ Status updated to ${status}`);
  } else {
    console.error(`  ❌ Failed to update status to ${status}:`, result.error);
  }
  
  // Small delay between updates
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Run the script
createTestShipmentData();
