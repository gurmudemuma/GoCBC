const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function verifyCompleteCustomsWorkflow() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     COMPLETE CUSTOMS WORKFLOW VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const login = await axios.post(`${API}/auth/login`, {
    username: 'customs_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('📋 STEP 1: VERIFY PREREQUISITES (ECTA INTEGRATION)\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const permitReady = await axios.get(`${API}/customs/permit-ready`, { headers });
    const permits = permitReady.data.data || [];
    console.log(`✅ Permit-Ready Endpoint Working: ${permits.length} shipments with export permits`);
    
    if (permits.length > 0) {
      console.log(`   Sample: ${permits[0].shipmentId} - Permit: ${permits[0].exportPermitNo}`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log('');

  console.log('📋 STEP 2: AUTO-CREATE DECLARATION FROM ECTA PERMIT\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const permitReady = await axios.get(`${API}/customs/permit-ready`, { headers });
    const permits = permitReady.data.data || [];
    
    if (permits.length > 0) {
      const permit = permits[0];
      console.log(`   Testing with shipment: ${permit.shipmentId}`);
      
      const createResult = await axios.post(`${API}/customs/declaration/auto-create-from-permit`, {
        inspectionId: permit.inspectionId,
        shipmentId: permit.shipmentId,
        exporterId: permit.exporterId,
        exportPermitNo: permit.exportPermitNo
      }, { headers });
      
      console.log(`✅ Auto-Create Declaration Working`);
      console.log(`   Declaration ID: ${createResult.data.declarationId}`);
      console.log(`   Status: ${createResult.data.existingDeclaration ? 'Already Exists' : 'Created'}`);
    } else {
      console.log(`⚠️  No permits available for testing`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.response?.data?.error?.message || error.message}`);
  }
  console.log('');

  console.log('📋 STEP 3: READ DECLARATION (GET BY ID)\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const allDecls = await axios.get(`${API}/customs/declarations`, { headers });
    if (allDecls.data.data.length > 0) {
      const testDecl = allDecls.data.data[0];
      const declId = testDecl.declarationId || testDecl.DeclarationID;
      
      const readResult = await axios.get(`${API}/customs/declaration/${declId}`, { headers });
      console.log(`✅ Read Declaration Working`);
      console.log(`   Declaration: ${declId}`);
      console.log(`   Status: ${readResult.data.data.status || readResult.data.data.Status}`);
      console.log(`   Shipment: ${readResult.data.data.shipmentId || readResult.data.data.ShipmentID}`);
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log('');

  console.log('📋 STEP 4: REVIEW DECLARATION (SCHEDULE INSPECTION)\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const allDecls = await axios.get(`${API}/customs/declarations`, { headers });
    const submitted = allDecls.data.data.find(d => (d.status || d.Status) === 'SUBMITTED');
    
    if (submitted) {
      const declId = submitted.declarationId || submitted.DeclarationID;
      console.log(`   Testing with declaration: ${declId}`);
      
      const reviewResult = await axios.post(`${API}/customs/declaration/${declId}/review`, {
        inspectorNotes: 'Documentary review: verifying documents',
        inspectionType: 'DOCUMENTARY',
        scheduledDate: new Date().toISOString()
      }, { headers });
      
      console.log(`✅ Review Declaration Working`);
      console.log(`   New Status: ${reviewResult.data.status}`);
      console.log(`   Message: ${reviewResult.data.message}`);
    } else {
      console.log(`⚠️  No SUBMITTED declarations available for testing`);
      console.log(`   (This is OK if all declarations have progressed past this stage)`);
    }
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    if (msg.includes('cannot be reviewed')) {
      console.log(`⚠️  Declaration already reviewed: ${msg}`);
    } else {
      console.log(`❌ FAILED: ${msg}`);
    }
  }
  console.log('');

  console.log('📋 STEP 5: COMPLETE INSPECTION\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const allDecls = await axios.get(`${API}/customs/declarations`, { headers });
    const underInspection = allDecls.data.data.find(d => (d.status || d.Status) === 'UNDER_INSPECTION');
    
    if (underInspection) {
      const declId = underInspection.declarationId || underInspection.DeclarationID;
      console.log(`   Testing with declaration: ${declId}`);
      
      const inspectResult = await axios.post(`${API}/customs/declaration/${declId}/complete-inspection`, {
        inspectionResult: 'PASSED',
        inspectorComments: 'Physical inspection complete. All requirements met.',
        completedDate: new Date().toISOString()
      }, { headers });
      
      console.log(`✅ Complete Inspection Working`);
      console.log(`   New Status: ${inspectResult.data.status}`);
      console.log(`   Message: ${inspectResult.data.message}`);
    } else {
      console.log(`⚠️  No UNDER_INSPECTION declarations available for testing`);
      console.log(`   (This is OK if all declarations have progressed past this stage)`);
    }
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    if (msg.includes('not under inspection')) {
      console.log(`⚠️  Declaration not under inspection: ${msg}`);
    } else {
      console.log(`❌ FAILED: ${msg}`);
    }
  }
  console.log('');

  console.log('📋 STEP 6: CLEAR DECLARATION (FINAL APPROVAL)\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const allDecls = await axios.get(`${API}/customs/declarations`, { headers });
    const underReview = allDecls.data.data.find(d => (d.status || d.Status) === 'UNDER_REVIEW');
    
    if (underReview) {
      const declId = underReview.declarationId || underReview.DeclarationID;
      console.log(`   Testing with declaration: ${declId}`);
      
      const clearResult = await axios.post(`${API}/customs/declaration/${declId}/clear`, {
        clearanceNumber: `CLR-TEST-${Date.now()}`,
        dutiesAmount: '0'
      }, { headers });
      
      console.log(`✅ Clear Declaration Working`);
      console.log(`   Clearance Number: ${clearResult.data.clearanceNumber}`);
      console.log(`   Message: ${clearResult.data.message}`);
    } else {
      console.log(`⚠️  No UNDER_REVIEW declarations available for testing`);
      console.log(`   (This is OK if all declarations have been cleared)`);
    }
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    if (msg.includes('cannot be cleared')) {
      console.log(`⚠️  Declaration cannot be cleared: ${msg}`);
    } else {
      console.log(`❌ FAILED: ${msg}`);
    }
  }
  console.log('');

  console.log('📋 STEP 7: VERIFY SHIPMENT STATUS UPDATE\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const allDecls = await axios.get(`${API}/customs/declarations`, { headers });
    const cleared = allDecls.data.data.find(d => (d.status || d.Status) === 'CLEARED');
    
    if (cleared) {
      const shipmentId = cleared.shipmentId || cleared.ShipmentID;
      console.log(`   Checking shipment: ${shipmentId}`);
      
      // Login as ECTA to read shipment
      const ectaLogin = await axios.post(`${API}/auth/login`, {
        username: 'ecta_admin',
        password: 'password123'
      });
      const ectaToken = ectaLogin.data.data.token;
      
      const shipmentResult = await axios.get(`${API}/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${ectaToken}` }
      });
      
      const shipmentStatus = shipmentResult.data.data.status || shipmentResult.data.data.Status;
      console.log(`✅ Shipment Status Check Working`);
      console.log(`   Shipment Status: ${shipmentStatus}`);
      console.log(`   Expected: CUSTOMS_CLEARED`);
      
      if (shipmentStatus === 'CUSTOMS_CLEARED') {
        console.log(`   ✅ Status correctly updated!`);
      } else {
        console.log(`   ⚠️  Status not CUSTOMS_CLEARED yet`);
      }
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log('');

  console.log('📋 STEP 8: QUERY BY STATUS\n');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const clearedResult = await axios.get(`${API}/customs/declaration/status/CLEARED`, { headers });
    console.log(`✅ Query by Status Working`);
    console.log(`   CLEARED declarations: ${clearedResult.data.data.length}`);
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('CUSTOMS WORKFLOW STATUS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const allDecls = await axios.get(`${API}/customs/declarations`, { headers });
  const declarations = allDecls.data.data;
  
  const statusCounts = {};
  declarations.forEach(d => {
    const status = d.status || d.Status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log('Current Declaration Status Distribution:');
  Object.keys(statusCounts).sort().forEach(status => {
    console.log(`   ${status.padEnd(20)} ${statusCounts[status]}`);
  });
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('NEXT WORKFLOW STEPS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('After Customs Clearance (CUSTOMS_CLEARED), the shipment should:');
  console.log('');
  console.log('1. 🚢 SHIPPING/LOGISTICS');
  console.log('   - Book transport (sea/air freight)');
  console.log('   - Assign container/cargo');
  console.log('   - Generate bill of lading');
  console.log('   - Track shipment to destination');
  console.log('');
  console.log('2. 💰 PAYMENT COLLECTION');
  console.log('   - If LC: Present documents to bank');
  console.log('   - If Documentary Collection: Submit through bank');
  console.log('   - If Advance: Record final payment');
  console.log('   - Confirm receipt of funds');
  console.log('');
  console.log('3. 📄 FINAL DOCUMENTATION');
  console.log('   - Certificate of Origin');
  console.log('   - Commercial Invoice');
  console.log('   - Packing List');
  console.log('   - Bill of Lading');
  console.log('   - Insurance Certificate');
  console.log('');
  console.log('4. 🔄 WORKFLOW COMPLETION');
  console.log('   - Mark shipment as SHIPPED');
  console.log('   - Mark shipment as DELIVERED (when received)');
  console.log('   - Close contract');
  console.log('   - Archive documents');
  console.log('');
}

verifyCompleteCustomsWorkflow().catch(console.error);
