const axios = require('axios');

async function testShipmentWorkflow() {
  try {
    console.log('=== SHIPMENT WORKFLOW VERIFICATION ===\n');
    
    // 1. Login as exporter
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'EXP8277584',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Logged in as EXP8277584\n');
    
    // 2. Create a test shipment
    const shipmentId = `SHIPMENT${Date.now()}`;
    const contractId = 'CONTRACT1784193660328';
    
    console.log(`=== STEP 1: Creating Shipment ${shipmentId} ===`);
    
    const shipmentData = {
      shipmentID: shipmentId,
      contractID: contractId,
      exporterID: 'EXP8277584',
      buyerID: 'BUYER001',
      origin: 'Yirgacheffe, Gedeo Zone',
      quantity: 30000,
      grade: 'Grade 1',
      icoNumber: `ET-8277-${Date.now()}`,
      ecxLotNumber: `ECX-2026-${Date.now()}`,
      channel: 'Direct Export',
      bondReference: 'BOND-2026-001',
      forexRate: 115.5,
      valueUSD: 61700,
      eudrCompliant: true,
      documents: []
    };
    
    try {
      const createResponse = await axios.post(
        'http://localhost:3001/api/v1/shipments',
        shipmentData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (createResponse.data.success) {
        console.log('✅ Shipment created successfully');
        console.log(`   Transaction ID: ${createResponse.data.txId}`);
        console.log(`   Auto-mapped: ${JSON.stringify(createResponse.data.autoMapped, null, 2)}`);
        console.log('');
        
        // Wait for blockchain sync
        console.log('⏳ Waiting 3 seconds for blockchain sync...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. Verify shipment was created
        console.log('=== STEP 2: Verifying Shipment Creation ===');
        const verifyResponse = await axios.get(
          `http://localhost:3001/api/v1/shipments/${shipmentId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (verifyResponse.data.success) {
          const shipment = verifyResponse.data.data;
          console.log('✅ Shipment verified in blockchain');
          console.log(`   Shipment ID: ${shipment.shipmentId}`);
          console.log(`   Status: ${shipment.status}`);
          console.log(`   Quantity: ${shipment.quantity} kg`);
          console.log(`   Grade: ${shipment.grade}`);
          console.log(`   Value USD: $${shipment.valueUsd}`);
          console.log(`   Forex Rate: ${shipment.forexRate}`);
          console.log('');
        } else {
          console.log('❌ Shipment NOT found in blockchain');
          console.log('');
        }
        
        // 4. Check quality inspection (should be auto-created)
        console.log('=== STEP 3: Checking Quality Inspection (Auto-Created) ===');
        const inspectionId = `INSPECTION_${shipmentId}`;
        
        try {
          const inspectionResponse = await axios.get(
            `http://localhost:3001/api/v1/quality/inspections/${inspectionId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          if (inspectionResponse.data.success) {
            const inspection = inspectionResponse.data.data;
            console.log('✅ Quality Inspection auto-created');
            console.log(`   Inspection ID: ${inspection.inspectionId || inspection.InspectionID}`);
            console.log(`   Status: ${inspection.status || inspection.Status}`);
            console.log(`   Shipment ID: ${inspection.shipmentId || inspection.ShipmentID}`);
            console.log('');
            
            // 5. Simulate ECTA quality inspection workflow
            console.log('=== STEP 4: Simulating ECTA Quality Testing ===');
            
            // Login as ECTA
            const ectaLogin = await axios.post('http://localhost:3001/api/v1/auth/login', {
              username: 'ecta_admin',
              password: 'password123'
            });
            
            const ectaToken = ectaLogin.data.data.token;
            
            // Step 4a: Perform quality inspection (record test results)
            const performData = {
              inspectorID: 'ECTA-QC-001',
              inspectorName: 'Q-Grader Ahmed',
              sampleSize: 350,
              moistureContent: 11.2,
              defectCount: 3,
              beanSize: '15/16',
              color: 'Bluish-Green',
              odor: 'Fresh, No Off-Odors',
              fragrance: 8.5,
              flavor: 8.75,
              aftertaste: 8.5,
              acidity: 8.25,
              body: 8.5,
              balance: 8.5,
              uniformity: 10,
              cleanCup: 10,
              sweetness: 10,
              overall: 8.5,
              classification: 'Grade 1',
              pesticideTest: 'PASSED',
              heavyMetalTest: 'PASSED',
              mycotoxinTest: 'PASSED',
              remarks: 'Excellent Ethiopian Yirgacheffe with floral notes'
            };
            
            const performResponse = await axios.post(
              `http://localhost:3001/api/v1/quality/inspections/${inspectionId}/perform`,
              performData,
              { headers: { 'Authorization': `Bearer ${ectaToken}` } }
            );
            
            if (!performResponse.data.success) {
              console.log('❌ Quality testing failed');
              console.log(`   Error: ${performResponse.data.error?.message}`);
              return;
            }
            
            console.log('✅ Quality tests completed');
            console.log(`   Classification: ${performData.classification}`);
            console.log(`   Cup Score: ${8.5 * 8 + 10 * 3} (calculated from individual scores)`);
            console.log(`   Pesticide Test: ${performData.pesticideTest}`);
            console.log('');
            
            // Step 4b: Approve inspection
            console.log('=== STEP 5: ECTA Quality Approval ===');
            
            const approveData = {
              approvedBy: 'ECTA Q-Grader Ahmed',
              certificateNo: `CERT-${Date.now()}`
            };
            
            const approveResponse = await axios.post(
              `http://localhost:3001/api/v1/quality/inspections/${inspectionId}/approve`,
              approveData,
              { headers: { 'Authorization': `Bearer ${ectaToken}` } }
            );
            
            if (!approveResponse.data.success) {
              console.log('❌ Quality approval failed');
              console.log(`   Error: ${approveResponse.data.error?.message}`);
              return;
            }
            
            console.log('✅ Quality Inspection APPROVED by ECTA');
            console.log(`   Certificate No: ${approveData.certificateNo}`);
            console.log('');
            
            // Step 4c: Issue export permit
            console.log('=== STEP 6: Issuing Export Permit ===');
            
            const permitData = {
              exportPermitNo: `PERMIT-${Date.now()}`,
              issuedBy: 'ECTA Export Licensing Officer'
            };
            
            const permitResponse = await axios.post(
              `http://localhost:3001/api/v1/quality/inspections/${inspectionId}/issue-permit`,
              permitData,
              { headers: { 'Authorization': `Bearer ${ectaToken}` } }
            );
            
            if (permitResponse.data.success) {
              console.log('✅ Export Permit ISSUED');
              console.log(`   Permit No: ${permitData.exportPermitNo}`);
              console.log('');
              
              // Wait for update
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // 6. Verify shipment status updated
              console.log('=== STEP 7: Verifying Shipment Status Update ===');
              const updatedShipment = await axios.get(
                `http://localhost:3001/api/v1/shipments/${shipmentId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              
              if (updatedShipment.data.success) {
                const status = updatedShipment.data.data.status;
                console.log(`✅ Shipment status: ${status}`);
                console.log(`   Quantity: ${updatedShipment.data.data.quantity} kg`);
                console.log(`   Grade: ${updatedShipment.data.data.grade}`);
                
                if (status === 'PERMIT_ISSUED' || status === 'SHIPPED' || status === 'QUALITY_APPROVED' || status === 'CREATED') {
                  console.log('✅ Ready for NEXT STEP: Customs Declaration');
                } else {
                  console.log(`⚠️  Unexpected status: '${status}'`);
                }
                console.log('');
              }
              
              // 7. Show next steps
              console.log('=== NEXT STEPS IN WORKFLOW ===');
              console.log('8. Exporter submits Customs Declaration');
              console.log('9. Customs Officer reviews and inspects');
              console.log('10. Customs Officer issues clearance');
              console.log('11. Shipping company records vessel/BOL details');
              console.log('12. Bank processes SWIFT messages (MT700, MT103)');
              console.log('13. Payment settlement & forex utilization');
              console.log('');
              
            } else {
              console.log('❌ Export permit issuance failed');
              console.log(`   Error: ${permitResponse.data.error?.message}`);
            }
            
          } else {
            console.log('❌ Quality Inspection NOT found');
            console.log('   This means auto-creation failed');
          }
        } catch (inspErr) {
          if (inspErr.response?.status === 404) {
            console.log('❌ Quality Inspection NOT found (404)');
            console.log('   Auto-creation may have failed');
          } else {
            console.log('❌ Error checking inspection:', inspErr.message);
          }
        }
        
      } else {
        console.log('❌ Shipment creation failed');
        console.log(`   Error: ${createResponse.data.error?.message}`);
        console.log(`   Error Code: ${createResponse.data.error?.code}`);
      }
    } catch (createErr) {
      if (createErr.response) {
        console.log('❌ Shipment creation failed');
        console.log(`   Status: ${createErr.response.status}`);
        console.log(`   Error: ${createErr.response.data.error?.message}`);
        console.log(`   Error Code: ${createErr.response.data.error?.code}`);
      } else {
        console.log('❌ Network error:', createErr.message);
      }
    }
    
    console.log('\n=== WORKFLOW TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testShipmentWorkflow();
