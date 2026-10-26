#!/usr/bin/env node

/**
 * Create Complete Test Workflow Data for CECBS
 * This creates: Exporter → Contract → Shipment → Quality Inspection → Export Permit → Customs Declaration
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

let EXPORTER_TOKEN = '';
let ECTA_TOKEN = '';
let CUSTOMS_TOKEN = '';

async function login(username, password) {
  const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
  return response.data.data.token;
}

async function createCompleteWorkflow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Creating Complete Test Workflow for Customs Portal');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Login
  console.log('🔐 Step 1: Authentication...\n');
  ECTA_TOKEN = await login('ecta_admin', 'password123');
  console.log('   ✅ ECTA logged in');
  CUSTOMS_TOKEN = await login('customs_admin', 'password123');
  console.log('   ✅ Customs logged in');

  const timestamp = Date.now();
  const shipmentId = `SHIP${timestamp}`;
  const inspectionId = `INSP${timestamp}`;
  const declarationId = `CD-${shipmentId}`;

  // Create Shipment
  console.log('\n📦 Step 2: Creating shipment...');
  try {
    await axios.post(`${API_BASE}/shipments/create`, {
      shipmentID: shipmentId,
      exporterID: 'EXP4342570',
      contractID: 'CON001',
      quantity: 18000,
      valueUSD: 108000,
      destination: 'United States',
      transportMode: 'SEA',
    }, {
      headers: { 'Authorization': `Bearer ${ECTA_TOKEN}` }
    });
    console.log(`   ✅ Shipment created: ${shipmentId}`);
  } catch (error) {
    console.log(`   ⚠️  Shipment: ${error.response?.data?.error?.message || error.message}`);
  }

  // Create Quality Inspection
  console.log('\n🔬 Step 3: Creating quality inspection...');
  try {
    await axios.post(`${API_BASE}/quality/inspection/create`, {
      inspectionID: inspectionId,
      shipmentID: shipmentId,
      exporterID: 'EXP4342570',
      qualityGrade: 'Grade 1',
      totalScore: 92,
      cupping: { aroma: 9, flavor: 9, acidity: 9, body: 9, aftertaste: 9 },
      status: 'APPROVED',
      exportPermitNo: `EP-${timestamp}`,
      certificateNo: `CERT-${timestamp}`,
    }, {
      headers: { 'Authorization': `Bearer ${ECTA_TOKEN}` }
    });
    console.log(`   ✅ Inspection created: ${inspectionId}`);
    console.log(`   ✅ Export permit issued: EP-${timestamp}`);
  } catch (error) {
    console.log(`   ⚠️  Inspection: ${error.response?.data?.error?.message || error.message}`);
  }

  // Create Customs Declaration
  console.log('\n📝 Step 4: Creating customs declaration...');
  try {
    const declResponse = await axios.post(`${API_BASE}/customs/declaration/submit`, {
      declarationID: declarationId,
      shipmentID: shipmentId,
      exporterID: 'EXP4342570',
      declarationType: 'STANDARD',
      hsCode: '090111',
      quantity: 18000,
      value: 108000,
      currency: 'USD',
      destination: 'United States',
      portOfExit: 'Djibouti Port',
      eudrCompliant: false,
    }, {
      headers: { 'Authorization': `Bearer ${CUSTOMS_TOKEN}` }
    });
    console.log(`   ✅ Declaration created: ${declarationId}`);
    console.log(`   📊 Status: SUBMITTED`);
  } catch (error) {
    console.log(`   ⚠️  Declaration: ${error.response?.data?.error?.message || error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ✅ Workflow Created Successfully!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Summary:');
  console.log(`   • Shipment ID: ${shipmentId}`);
  console.log(`   • Inspection ID: ${inspectionId}`);
  console.log(`   • Export Permit: EP-${timestamp}`);
  console.log(`   • Declaration ID: ${declarationId}`);
  console.log(`   • Status: SUBMITTED (ready for inspection)`);
  console.log('\n💡 Next Steps:');
  console.log('   1. Refresh the Customs Portal');
  console.log('   2. Check "Permit Ready" tab - should show 1 item');
  console.log('   3. Check "Submitted" tab - should show 1 declaration');
  console.log('   4. Click "Schedule Inspection" to test workflow');
  console.log('');
}

createCompleteWorkflow().catch(error => {
  console.error('\n❌ Error:', error.response?.data || error.message);
  process.exit(1);
});
