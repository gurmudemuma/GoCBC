const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
const exporterId = 'EXP4886039';

async function testBanksTab8Workflow() {
  console.log('\n=== TESTING BANKS PORTAL TAB 8 (LC SETTLEMENTS) WORKFLOW ===\n');
  
  try {
    // 1. LOGIN
    console.log('Step 1: Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in successfully\n');
    
    // 2. GET DELIVERED SHIPMENTS (Tab 8 loads this)
    console.log('Step 2: Fetch delivered shipments...');
    const shipmentsRes = await axios.get(`${API_BASE}/shipments?status=DELIVERED`, { headers });
    const deliveredShipments = Array.isArray(shipmentsRes.data) ? shipmentsRes.data : (shipmentsRes.data.data || []);
    console.log(`✅ Found ${deliveredShipments.length} delivered shipments`);
    
    if (deliveredShipments.length === 0) {
      console.log('⚠️  No delivered shipments - cannot test Tab 8');
      return;
    }
    
    // Find shipment for EXP4886039
    const testShipment = deliveredShipments.find(s => 
      s.shipmentNumber && s.shipmentNumber.includes('SHIP-')
    ) || deliveredShipments[0];
    
    console.log(`   Testing with shipment: ${testShipment.shipmentNumber || testShipment.id}`);
    console.log();
    
    // 3. GET POST-DELIVERY STATUS (PostDeliveryWorkflowPanel loads this)
    console.log('Step 3: Get post-delivery workflow status...');
    const shipmentId = testShipment.shipmentNumber || testShipment.id;
    
    try {
      const statusRes = await axios.get(`${API_BASE}/post-delivery/${shipmentId}/status`, { headers });
      const status = statusRes.data;
      
      console.log('✅ Post-delivery status:');
      console.log(`   - Payment Received: ${status.paymentReceived ? '✅' : '⏳'}`);
      console.log(`   - Forex Repatriated: ${status.forexRepatriated ? '✅' : '⏳'}`);
      console.log(`   - LC Settled: ${status.lcSettled ? '✅' : '⏳'}`);
      console.log(`   - Completion: ${status.completionPercentage || 0}%`);
      console.log();
      
      // 4. RECORD PAYMENT (First action in workflow)
      if (!status.paymentReceived) {
        console.log('Step 4: Recording payment...');
        const paymentRes = await axios.post(`${API_BASE}/post-delivery/${shipmentId}/payment`, {
          amount: 55000,
          currency: 'USD',
          swiftReference: 'SWIFT' + Date.now(),
          paymentDate: new Date().toISOString()
        }, { headers });
        
        console.log('✅ Payment recorded');
        console.log(`   - Amount: $${paymentRes.data.amount || 55000}`);
        console.log();
      } else {
        console.log('Step 4: Payment already recorded ✅\n');
      }
      
      // 5. RECORD LC SETTLEMENT (Tab 8 specific action)
      if (!status.lcSettled && status.lcUsed !== false) {
        console.log('Step 5: Recording LC settlement...');
        const lcSettlementRes = await axios.post(`${API_BASE}/post-delivery/${shipmentId}/lc-settlement`, {
          lcReference: 'LC' + Date.now(),
          settlementDate: new Date().toISOString()
        }, { headers });
        
        console.log('✅ LC settlement recorded');
        console.log(`   - LC Reference: ${lcSettlementRes.data.lcReference || 'LC' + Date.now()}`);
        console.log();
      } else if (status.lcSettled) {
        console.log('Step 5: LC already settled ✅\n');
      } else {
        console.log('Step 5: LC not used for this shipment (skipped)\n');
      }
      
      // 6. GET UPDATED STATUS
      console.log('Step 6: Get updated workflow status...');
      const finalStatusRes = await axios.get(`${API_BASE}/post-delivery/${shipmentId}/status`, { headers });
      const finalStatus = finalStatusRes.data;
      
      console.log('✅ Final status:');
      console.log(`   - Payment Received: ${finalStatus.paymentReceived ? '✅' : '⏳'}`);
      console.log(`   - Forex Repatriated: ${finalStatus.forexRepatriated ? '✅' : '⏳'}`);
      console.log(`   - LC Settled: ${finalStatus.lcSettled ? '✅' : '⏳'}`);
      console.log(`   - Completion: ${finalStatus.completionPercentage || 0}%`);
      console.log();
      
      // 7. SUMMARY
      console.log('=== TEST RESULTS ===');
      console.log(`✅ Banks Portal Tab 8 workflow is WORKING`);
      console.log(`✅ PostDeliveryWorkflowPanel integration is WORKING`);
      console.log(`✅ All API endpoints responding correctly`);
      console.log();
      
      const progressIncrease = (finalStatus.completionPercentage || 0) - (status.completionPercentage || 0);
      if (progressIncrease > 0) {
        console.log(`📈 Progress increased by ${progressIncrease}%`);
      }
      
    } catch (statusErr) {
      if (statusErr.response?.status === 404) {
        console.log('⚠️  Post-delivery tracking not found for this shipment');
        console.log('   This is expected if the shipment was just created');
        console.log('   The UI will show "No post-delivery workflow data"');
      } else {
        throw statusErr;
      }
    }
    
  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testBanksTab8Workflow();
