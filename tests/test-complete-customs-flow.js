const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function testFullCustomsWorkflow() {
  console.log('Testing Complete Customs Workflow\n');
  console.log('====================================\n');

  // Login
  const login = await axios.post(`${API}/auth/login`, {
    username: 'customs_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  // Get permit-ready inspections
  const ready = await axios.get(`${API}/customs/permit-ready`, { headers });
  console.log(`✅ Step 0: Found ${ready.data.data.length} permit-ready inspections\n`);

  if (ready.data.data.length === 0) {
    console.log('❌ No permit-ready inspections. Run ECTA workflow first.');
    return;
  }

  // Find a shipment without a REJECTED declaration
  let inspection = null;
  let declarationId = null;
  
  for (const insp of ready.data.data) {
    const testDeclarationId = `CD-${insp.shipmentId}`;
    try {
      const declCheck = await axios.get(`${API}/customs/declaration/${testDeclarationId}`, { headers });
      const status = declCheck.data.data.status || declCheck.data.data.Status;
      console.log(`  Checking ${insp.shipmentId}: Declaration exists with status ${status}`);
      
      if (status === 'REJECTED') {
        console.log(`    ⚠️ Skipping - declaration is REJECTED`);
        continue;
      }
      
      // Found a valid declaration in SUBMITTED or later status
      inspection = insp;
      declarationId = testDeclarationId;
      console.log(`    ✅ Using this shipment (status: ${status})\n`);
      break;
    } catch (err) {
      // No declaration exists - perfect!
      inspection = insp;
      declarationId = testDeclarationId;
      console.log(`  ${insp.shipmentId}: No declaration exists - will create one\n`);
      break;
    }
  }
  
  if (!inspection) {
    console.log('❌ All declarations are REJECTED. Please create new inspections/permits.');
    return;
  }

  console.log(`Using shipment: ${inspection.shipmentId}`);
  console.log(`Declaration ID: ${declarationId}\n`);

  // Step 1: Check if declaration exists, if not auto-create
  try {
    console.log('Step 1: Checking/Creating Declaration...');
    const createResult = await axios.post(`${API}/customs/declaration/auto-create-from-permit`, {
      inspectionId: inspection.inspectionId,
      shipmentId: inspection.shipmentId,
      exporterId: inspection.exporterId,
      exportPermitNo: inspection.exportPermitNo
    }, { headers });
    console.log(`  ✅ ${createResult.data.message}`);
    console.log(`  Declaration: ${createResult.data.declarationId}\n`);
  } catch (error) {
    console.log(`  ❌ Error: ${error.response?.data?.error?.message || error.message}\n`);
    return;
  }

  // Step 2: Get declaration details
  try {
    console.log('Step 2: Reading Declaration Details...');
    const declResult = await axios.get(`${API}/customs/declaration/${declarationId}`, { headers });
    console.log(`  ✅ Status: ${declResult.data.data.status || declResult.data.data.Status}`);
    console.log(`  HS Code: ${declResult.data.data.hsCode || declResult.data.data.HSCode}`);
    console.log(`  Quantity: ${declResult.data.data.quantity || declResult.data.data.Quantity}`);
    console.log(`  Value: ${declResult.data.data.totalValue || declResult.data.data.TotalValue}\n`);
  } catch (error) {
    console.log(`  ⚠️  Could not read declaration: ${error.response?.data?.error?.message || error.message}\n`);
  }

  // Step 3: Review declaration (start inspection)
  try {
    console.log('Step 3: Reviewing Declaration (Schedule Inspection)...');
    const reviewResult = await axios.post(`${API}/customs/declaration/${declarationId}/review`, {
      inspectorNotes: 'Documentary review: verifying export permit and certificates',
      inspectionType: 'DOCUMENTARY',
      scheduledDate: new Date().toISOString()
    }, { headers });
    console.log(`  ✅ ${reviewResult.data.message}`);
    console.log(`  Status: ${reviewResult.data.status}\n`);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    if (msg.includes('cannot be reviewed') || msg.includes('current status')) {
      console.log(`  ⚠️  Already reviewed: ${msg}\n`);
    } else {
      console.log(`  ❌ Error: ${msg}\n`);
      return;
    }
  }

  // Step 4: Complete inspection
  try {
    console.log('Step 4: Completing Physical Inspection...');
    const inspectResult = await axios.post(`${API}/customs/declaration/${declarationId}/complete-inspection`, {
      inspectionResult: 'PASSED',
      inspectorComments: 'All documents verified. ECTA permit valid. Container seal intact.',
      completedDate: new Date().toISOString()
    }, { headers });
    console.log(`  ✅ ${inspectResult.data.message}`);
    console.log(`  Status: ${inspectResult.data.status}\n`);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    if (msg.includes('not under inspection') || msg.includes('current status')) {
      console.log(`  ⚠️  Already inspected: ${msg}\n`);
    } else {
      console.log(`  ❌ Error: ${msg}\n`);
      return;
    }
  }

  // Step 5: Clear declaration
  try {
    console.log('Step 5: Clearing Declaration (Final Approval)...');
    const clearResult = await axios.post(`${API}/customs/declaration/${declarationId}/clear`, {
      clearanceNumber: `CLR-${Date.now()}`,
      dutiesAmount: '0'
    }, { headers });
    console.log(`  ✅ ${clearResult.data.message}`);
    console.log(`  Clearance Number: ${clearResult.data.clearanceNumber}\n`);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    if (msg.includes('cannot be cleared') || msg.includes('current status')) {
      console.log(`  ⚠️  Already cleared or cannot clear: ${msg}\n`);
    } else {
      console.log(`  ❌ Error: ${msg}\n`);
      return;
    }
  }

  // Step 6: Verify final status
  try {
    console.log('Step 6: Verifying Final Status...');
    const finalResult = await axios.get(`${API}/customs/declaration/${declarationId}`, { headers });
    const finalStatus = finalResult.data.data.status || finalResult.data.data.Status;
    console.log(`  ✅ Final Status: ${finalStatus}\n`);

    if (finalStatus === 'CLEARED') {
      console.log('====================================');
      console.log('✅ COMPLETE CUSTOMS WORKFLOW SUCCESS');
      console.log('====================================\n');
      console.log('Workflow Steps Completed:');
      console.log('1. ✅ ECTA Export Permit Issued');
      console.log('2. ✅ Customs Declaration Auto-Created');
      console.log('3. ✅ Declaration Reviewed (Documentary Check)');
      console.log('4. ✅ Physical Inspection Completed');
      console.log('5. ✅ Customs Clearance Granted');
      console.log('\n🎉 Shipment ready for export!\n');
    } else {
      console.log(`Current status: ${finalStatus}`);
      console.log('Workflow partially complete.\n');
    }
  } catch (error) {
    console.log(`  ❌ Error verifying status: ${error.message}\n`);
  }
}

testFullCustomsWorkflow().catch(console.error);
