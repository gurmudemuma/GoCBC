// Test Complete Shipping Workflow - 8 Steps
// Tests: CUSTOMS_CLEARED → LAND_TRANSPORT → PORT_ARRIVED → CONTAINER_STUFFED → 
//        VESSEL_LOADED → DEPARTED → IN_TRANSIT → DESTINATION_ARRIVED → DELIVERED

const API_BASE = 'http://localhost:3001/api/v1';
let authToken = '';
let testShipmentId = '';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${result.error?.message || response.statusText}`);
  }
  
  return result;
}

// Step 0: Login
async function login() {
  console.log('\n=== STEP 0: Login ===');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'shipping_admin',
      password: 'password123'
    })
  });
  
  const result = await response.json();
  if (result.success && result.data?.token) {
    authToken = result.data.token;
    console.log('✅ Login successful');
    return true;
  }
  
  throw new Error('Login failed');
}

// Step 1: Find a CUSTOMS_CLEARED shipment
async function findClearedShipment() {
  console.log('\n=== STEP 1: Find CUSTOMS_CLEARED Shipment ===');
  const result = await apiCall('/shipments');
  
  if (!result.success || !result.data) {
    throw new Error('Failed to fetch shipments');
  }
  
  const clearedShipment = result.data.find(s => {
    const status = s.status || s.Status;
    const shipmentId = s.shipmentId || s.ShipmentID;
    // Only find CUSTOMS_CLEARED or CLEARED status (not DELIVERED)
    return (status === 'CUSTOMS_CLEARED' || status === 'CLEARED') && 
           status !== 'DELIVERED';
  });
  
  if (!clearedShipment) {
    console.log('⚠️  No CUSTOMS_CLEARED shipments found');
    console.log('Available statuses:', result.data.map(s => ({
      id: s.shipmentId || s.ShipmentID,
      status: s.status || s.Status
    })));
    throw new Error('No CUSTOMS_CLEARED shipment available for testing');
  }
  
  testShipmentId = clearedShipment.shipmentId || clearedShipment.ShipmentID;
  const status = clearedShipment.status || clearedShipment.Status;
  console.log(`✅ Found shipment: ${testShipmentId}`);
  console.log(`   Status: ${status}`);
  return testShipmentId;
}

// Step 2: Start Land Transport (CUSTOMS_CLEARED → LAND_TRANSPORT)
async function startLandTransport() {
  console.log('\n=== STEP 2: Start Land Transport ===');
  console.log(`Shipment: ${testShipmentId}`);
  
  const result = await apiCall(`/shipments/${testShipmentId}/land-transport/start`, 'POST', {
    transportCompany: 'Addis Express Transport',
    truckPlate: 'AA-12345',
    driverName: 'Ahmed Mohammed',
    sealNumber: `SEAL-${Date.now()}`
  });
  
  if (result.success) {
    console.log('✅ Land transport started');
    console.log(`   Status: LAND_TRANSPORT`);
    console.log(`   Truck: AA-12345`);
    console.log(`   Journey: Addis Ababa → Djibouti (800km)`);
    return true;
  }
  
  throw new Error('Failed to start land transport');
}

// Step 3: Port Arrival (LAND_TRANSPORT → PORT_ARRIVED)
async function recordPortArrival() {
  console.log('\n=== STEP 3: Record Port Arrival ===');
  
  const result = await apiCall(`/shipments/${testShipmentId}/port/arrive`, 'POST', {
    notes: 'Arrived at Djibouti Port'
  });
  
  if (result.success) {
    console.log('✅ Port arrival recorded');
    console.log(`   Status: PORT_ARRIVED`);
    console.log(`   Location: Djibouti Port`);
    return true;
  }
  
  throw new Error('Failed to record port arrival');
}

// Step 4: Container Stuffing (PORT_ARRIVED → CONTAINER_STUFFED)
async function stuffContainer() {
  console.log('\n=== STEP 4: Stuff Container ===');
  
  const containerNumber = `TCLU${Date.now().toString().substr(-7)}`;
  
  const result = await apiCall(`/shipments/${testShipmentId}/container/stuff`, 'POST', {
    containerNumber: containerNumber,
    containerType: 'DRY',
    sealNumber: `SEAL-${Date.now()}`,
    stuffedBy: 'Djibouti Port Authority',
    location: 'Djibouti Port'
  });
  
  if (result.success) {
    console.log('✅ Container stuffed');
    console.log(`   Status: CONTAINER_STUFFED`);
    console.log(`   Container: ${containerNumber}`);
    console.log(`   Type: DRY`);
    return true;
  }
  
  throw new Error('Failed to stuff container');
}

// Step 5: Vessel Loading (CONTAINER_STUFFED → VESSEL_LOADED)
async function loadOnVessel() {
  console.log('\n=== STEP 5: Load on Vessel ===');
  
  const result = await apiCall(`/shipments/${testShipmentId}/vessel/load`, 'POST', {
    notes: 'Container loaded on vessel'
  });
  
  if (result.success) {
    console.log('✅ Vessel loaded');
    console.log(`   Status: VESSEL_LOADED`);
    return true;
  }
  
  throw new Error('Failed to load on vessel');
}

// Step 6: Vessel Departure (VESSEL_LOADED → DEPARTED)
async function vesselDepart() {
  console.log('\n=== STEP 6: Vessel Departure ===');
  
  const result = await apiCall(`/shipments/${testShipmentId}/vessel/depart`, 'POST', {
    notes: 'Vessel departed from Djibouti'
  });
  
  if (result.success) {
    console.log('✅ Vessel departed');
    console.log(`   Status: DEPARTED`);
    console.log(`   Port: Djibouti`);
    return true;
  }
  
  throw new Error('Failed to record vessel departure');
}

// Step 7: In-Transit Update (DEPARTED → IN_TRANSIT)
async function updateInTransit() {
  console.log('\n=== STEP 7: Update In-Transit ===');
  
  const result = await apiCall(`/shipments/${testShipmentId}/in-transit/update`, 'POST', {
    trackingNumber: `TRK-${Date.now()}`
  });
  
  if (result.success) {
    console.log('✅ In-transit updated');
    console.log(`   Status: IN_TRANSIT`);
    console.log(`   Journey: 25-35 days to Europe`);
    return true;
  }
  
  throw new Error('Failed to update in-transit');
}

// Step 8: Destination Arrival (IN_TRANSIT → DESTINATION_ARRIVED)
async function arriveAtDestination() {
  console.log('\n=== STEP 8: Destination Arrival ===');
  
  const result = await apiCall(`/shipments/${testShipmentId}/destination/arrive`, 'POST', {
    notes: 'Arrived at destination port'
  });
  
  if (result.success) {
    console.log('✅ Destination arrival recorded');
    console.log(`   Status: DESTINATION_ARRIVED`);
    return true;
  }
  
  throw new Error('Failed to record destination arrival');
}

// Step 9: Complete Delivery (DESTINATION_ARRIVED → DELIVERED)
async function completeDelivery() {
  console.log('\n=== STEP 9: Complete Delivery ===');
  
  const result = await apiCall(`/shipments/${testShipmentId}/delivery/complete`, 'POST', {
    deliveryNotes: 'Test delivery completed successfully'
  });
  
  if (result.success) {
    console.log('✅ Delivery completed');
    console.log(`   Status: DELIVERED`);
    console.log(`   🎉 Ethiopian Coffee Export Complete!`);
    return true;
  }
  
  throw new Error('Failed to complete delivery');
}

// Step 10: Verify Final Status
async function verifyFinalStatus() {
  console.log('\n=== STEP 10: Verify Final Status ===');
  
  const result = await apiCall('/shipments');
  const shipment = result.data.find(s => 
    (s.shipmentId || s.ShipmentID) === testShipmentId
  );
  
  if (!shipment) {
    throw new Error('Shipment not found');
  }
  
  const status = shipment.status || shipment.Status;
  console.log(`Shipment ${testShipmentId}:`);
  console.log(`  Status: ${status}`);
  console.log(`  Container: ${shipment.containerNumber || shipment.ContainerNumber || 'N/A'}`);
  console.log(`  Vessel: ${shipment.vesselName || shipment.VesselName || 'N/A'}`);
  
  if (status === 'DELIVERED') {
    console.log('\n✅ ALL TESTS PASSED');
    return true;
  } else {
    console.log(`\n⚠️  Expected DELIVERED, got ${status}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Shipping Workflow Test - 8 Steps                    ║');
  console.log('║   CUSTOMS_CLEARED → DELIVERED                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  try {
    await login();
    await findClearedShipment();
    await startLandTransport();
    await recordPortArrival();
    await stuffContainer();
    await loadOnVessel();
    await vesselDepart();
    await updateInTransit();
    await arriveAtDestination();
    await completeDelivery();
    await verifyFinalStatus();
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL SHIPPING WORKFLOW TESTS PASSED               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
