/**
 * Test script for newly added GET endpoints
 * Tests individual quality inspection and customs declaration retrieval
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Test credentials
const TEST_USERS = {
  exporter: { username: 'exporter1', password: 'exporter123' },
  ecta: { username: 'ectaAdmin', password: 'password123' },
  customs: { username: 'customsAdmin', password: 'password123' },
  bank: { username: 'bankAdmin', password: 'password123' }
};

let tokens = {};

async function login(userType) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USERS[userType]);
    const token = response.data.token || response.data.data?.token;
    if (token) {
      tokens[userType] = token;
      console.log(`✓ Logged in as ${userType}`);
      return true;
    }
    console.log(`✗ Login failed for ${userType}:`, response.data);
    return false;
  } catch (error) {
    console.log(`✗ Login error for ${userType}:`, error.response?.data || error.message);
    return false;
  }
}

async function testQualityInspectionGet(token, inspectionId) {
  try {
    console.log(`\n📋 Testing GET /quality/inspections/${inspectionId}`);
    const response = await axios.get(
      `${API_BASE}/quality/inspections/${inspectionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success && response.data.data) {
      const inspection = response.data.data;
      console.log(`✓ Retrieved inspection successfully`);
      console.log(`  - Inspection ID: ${inspection.inspectionID || inspection.inspection_id}`);
      console.log(`  - Shipment ID: ${inspection.shipmentID || inspection.shipment_id}`);
      console.log(`  - Status: ${inspection.status}`);
      console.log(`  - Grade: ${inspection.grade}`);
      console.log(`  - Passed: ${inspection.passed}`);
      console.log(`  - Blockchain TxID: ${inspection.blockchainTxId || inspection.blockchain_tx_id || 'N/A'}`);
      return true;
    } else {
      console.log(`✗ Failed to retrieve inspection:`, response.data);
      return false;
    }
  } catch (error) {
    console.log(`✗ Error retrieving inspection:`, error.response?.data || error.message);
    return false;
  }
}

async function testCustomsDeclarationGet(token, declarationId) {
  try {
    console.log(`\n📋 Testing GET /customs/declarations/${declarationId}`);
    const response = await axios.get(
      `${API_BASE}/customs/declarations/${declarationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success && response.data.data) {
      const declaration = response.data.data;
      console.log(`✓ Retrieved customs declaration successfully`);
      console.log(`  - Declaration ID: ${declaration.declarationID || declaration.declaration_number}`);
      console.log(`  - Shipment ID: ${declaration.shipmentID || declaration.shipment_id}`);
      console.log(`  - Status: ${declaration.status}`);
      console.log(`  - HS Code: ${declaration.hsCode || declaration.hs_code || 'N/A'}`);
      console.log(`  - Value: ${declaration.value || 0}`);
      console.log(`  - Blockchain TxID: ${declaration.blockchainTxId || declaration.blockchain_tx_id || 'N/A'}`);
      return true;
    } else {
      console.log(`✗ Failed to retrieve declaration:`, response.data);
      return false;
    }
  } catch (error) {
    console.log(`✗ Error retrieving declaration:`, error.response?.data || error.message);
    return false;
  }
}

async function testAuditTrail(token, entityType, entityId) {
  try {
    console.log(`\n📋 Testing GET /audit/trail/${entityType}/${entityId}`);
    const response = await axios.get(
      `${API_BASE}/audit/trail/${entityType}/${entityId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.data.success && response.data.data) {
      const trail = response.data.data;
      console.log(`✓ Retrieved audit trail successfully`);
      console.log(`  - Entity Type: ${trail.entityType}`);
      console.log(`  - Entity ID: ${trail.entityId}`);
      console.log(`  - Total Logs: ${trail.logs?.length || 0}`);
      
      if (trail.logs && trail.logs.length > 0) {
        console.log(`  - Latest Action: ${trail.logs[0].action}`);
        console.log(`  - Latest Actor: ${trail.logs[0].actor_username || trail.logs[0].actor}`);
        console.log(`  - Latest Timestamp: ${trail.logs[0].timestamp}`);
      }
      
      console.log(`  - Blockchain Verified: ${trail.blockchainVerification ? 'Yes' : 'No'}`);
      console.log(`  - Chain Integrity: ${trail.chainIntegrity || 'N/A'}`);
      return true;
    } else {
      console.log(`✗ Failed to retrieve audit trail:`, response.data);
      return false;
    }
  } catch (error) {
    console.log(`✗ Error retrieving audit trail:`, error.response?.data || error.message);
    return false;
  }
}

async function getLatestTestData(token) {
  try {
    // Get latest quality inspection
    const inspResponse = await axios.get(
      `${API_BASE}/quality/inspections`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const inspection = inspResponse.data.data?.inspections?.[0] || inspResponse.data.data?.[0];
    
    // Get latest customs declaration
    const declResponse = await axios.get(
      `${API_BASE}/customs/declarations`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const declaration = declResponse.data.data?.declarations?.[0] || declResponse.data.data?.[0];
    
    return {
      inspectionId: inspection?.inspectionID || inspection?.inspection_id,
      declarationId: declaration?.declarationId || declaration?.declarationNumber || declaration?.declaration_number,
      shipmentId: inspection?.shipmentID || inspection?.shipment_id
    };
  } catch (error) {
    console.log('Error fetching test data:', error.message);
    return {};
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('  Testing Newly Added GET Endpoints');
  console.log('='.repeat(80));
  
  // Login as different users
  console.log('\n📝 Step 1: Authentication');
  await login('ecta');
  await login('customs');
  await login('bank');
  
  if (!tokens.ecta || !tokens.customs) {
    console.log('\n✗ Authentication failed. Cannot continue tests.');
    return;
  }
  
  // Get test data
  console.log('\n📝 Step 2: Fetching test data');
  const testData = await getLatestTestData(tokens.ecta);
  console.log('Test Data:', testData);
  
  if (!testData.inspectionId || !testData.declarationId) {
    console.log('\n✗ No test data available. Cannot continue tests.');
    return;
  }
  
  // Run tests
  const results = {
    qualityInspectionGet: false,
    customsDeclarationGet: false,
    auditTrailInspection: false,
    auditTrailClearance: false
  };
  
  console.log('\n📝 Step 3: Testing Individual GET Endpoints');
  results.qualityInspectionGet = await testQualityInspectionGet(tokens.ecta, testData.inspectionId);
  results.customsDeclarationGet = await testCustomsDeclarationGet(tokens.customs, testData.declarationId);
  
  console.log('\n📝 Step 4: Testing Audit Trail Endpoints');
  results.auditTrailInspection = await testAuditTrail(tokens.ecta, 'quality_inspection', testData.inspectionId);
  results.auditTrailDeclaration = await testAuditTrail(tokens.customs, 'customs_declaration', testData.declarationId);
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('  Test Results Summary');
  console.log('='.repeat(80));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✓' : '✗';
    const status = result ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${test}: ${status}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  console.log('='.repeat(80));
  
  if (passed === total) {
    console.log('\n🎉 All new endpoints are working correctly!');
  } else {
    console.log('\n⚠️  Some endpoints need attention.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n✗ Fatal error:', error.message);
  process.exit(1);
});
