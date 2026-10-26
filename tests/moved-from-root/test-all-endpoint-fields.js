/**
 * Comprehensive test to verify ALL fields are returned properly
 * Tests both LIST and individual GET endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Test credentials
const USERS = {
  ecta: { username: 'ectaAdmin', password: 'password123' },
  customs: { username: 'customsAdmin', password: 'password123' },
  bank: { username: 'bankAdmin', password: 'password123' }
};

let tokens = {};

async function login(userType) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, USERS[userType]);
    const token = response.data.token || response.data.data?.token;
    if (token) {
      tokens[userType] = token;
      return true;
    }
    return false;
  } catch (error) {
    console.log(`✗ Login error for ${userType}:`, error.response?.data || error.message);
    return false;
  }
}

function checkFields(obj, requiredFields, entityName) {
  const missing = [];
  const nullOrUndefined = [];
  const present = [];
  
  requiredFields.forEach(field => {
    if (!(field in obj)) {
      missing.push(field);
    } else if (obj[field] === null || obj[field] === undefined) {
      nullOrUndefined.push(field);
    } else {
      present.push(field);
    }
  });
  
  return { missing, nullOrUndefined, present, entityName };
}

async function testQualityInspections() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING QUALITY INSPECTIONS');
  console.log('='.repeat(80));
  
  try {
    // Test LIST endpoint
    console.log('\n📋 Testing GET /quality/inspections (LIST)');
    const listResponse = await axios.get(
      `${API_BASE}/quality/inspections?limit=1`,
      { headers: { Authorization: `Bearer ${tokens.ecta}` } }
    );
    
    const inspections = listResponse.data.data?.inspections || listResponse.data.data || [];
    if (inspections.length > 0) {
      const inspection = inspections[0];
      const requiredFields = [
        'inspectionID', 'shipmentID', 'contractID', 'exporterID', 'coffeeType',
        'quantity', 'sampleSize', 'status', 'grade', 'passed', 'cupQuality',
        'moistureContent', 'defectCount', 'screenSize', 'inspectorName',
        'certificationNumber', 'blockchainTxId', 'createdAt', 'updatedAt'
      ];
      
      const result = checkFields(inspection, requiredFields, 'Quality Inspection (LIST)');
      console.log(`✓ Fields present (${result.present.length}/${requiredFields.length}):`, result.present.slice(0, 5).join(', '), '...');
      if (result.missing.length > 0) {
        console.log(`✗ Missing fields (${result.missing.length}):`, result.missing.join(', '));
      }
      if (result.nullOrUndefined.length > 0) {
        console.log(`⚠ Null/undefined fields (${result.nullOrUndefined.length}):`, result.nullOrUndefined.join(', '));
      }
      
      // Test individual GET endpoint
      console.log(`\n📋 Testing GET /quality/inspections/${inspection.inspectionID} (INDIVIDUAL)`);
      const getResponse = await axios.get(
        `${API_BASE}/quality/inspections/${inspection.inspectionID}`,
        { headers: { Authorization: `Bearer ${tokens.ecta}` } }
      );
      
      const individual = getResponse.data.data;
      const getResult = checkFields(individual, requiredFields, 'Quality Inspection (GET)');
      console.log(`✓ Fields present (${getResult.present.length}/${requiredFields.length}):`, getResult.present.slice(0, 5).join(', '), '...');
      if (getResult.missing.length > 0) {
        console.log(`✗ Missing fields (${getResult.missing.length}):`, getResult.missing.join(', '));
      }
      
      return {
        list: { total: requiredFields.length, present: result.present.length, missing: result.missing.length },
        get: { total: requiredFields.length, present: getResult.present.length, missing: getResult.missing.length }
      };
    }
  } catch (error) {
    console.log('✗ Error:', error.response?.data || error.message);
    return { list: { total: 0, present: 0, missing: 0 }, get: { total: 0, present: 0, missing: 0 } };
  }
}

async function testCustomsDeclarations() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CUSTOMS DECLARATIONS');
  console.log('='.repeat(80));
  
  try {
    // Test LIST endpoint
    console.log('\n📋 Testing GET /customs/declarations (LIST)');
    const listResponse = await axios.get(
      `${API_BASE}/customs/declarations`,
      { headers: { Authorization: `Bearer ${tokens.customs}` } }
    );
    
    const declarations = listResponse.data.data || [];
    if (declarations.length > 0) {
      const declaration = declarations[0];
      const requiredFields = [
        'declarationId', 'declarationNumber', 'shipmentID', 'contractID', 'exporterID',
        'declarationType', 'hsCode', 'quantity', 'value', 'customsValueUSD', 'currency',
        'destination', 'portOfExit', 'eudrCompliant', 'status', 'customsOfficer',
        'inspectionRequired', 'blockchainTxId', 'createdAt', 'updatedAt'
      ];
      
      const result = checkFields(declaration, requiredFields, 'Customs Declaration (LIST)');
      console.log(`✓ Fields present (${result.present.length}/${requiredFields.length}):`, result.present.slice(0, 5).join(', '), '...');
      if (result.missing.length > 0) {
        console.log(`✗ Missing fields (${result.missing.length}):`, result.missing.join(', '));
      }
      if (result.nullOrUndefined.length > 0) {
        console.log(`⚠ Null/undefined fields (${result.nullOrUndefined.length}):`, result.nullOrUndefined.join(', '));
      }
      
      // Test individual GET endpoint
      console.log(`\n📋 Testing GET /customs/declarations/${declaration.declarationId} (INDIVIDUAL)`);
      const getResponse = await axios.get(
        `${API_BASE}/customs/declarations/${declaration.declarationId}`,
        { headers: { Authorization: `Bearer ${tokens.customs}` } }
      );
      
      const individual = getResponse.data.data;
      const getResult = checkFields(individual, requiredFields, 'Customs Declaration (GET)');
      console.log(`✓ Fields present (${getResult.present.length}/${requiredFields.length}):`, getResult.present.slice(0, 5).join(', '), '...');
      if (getResult.missing.length > 0) {
        console.log(`✗ Missing fields (${getResult.missing.length}):`, getResult.missing.join(', '));
      }
      
      return {
        list: { total: requiredFields.length, present: result.present.length, missing: result.missing.length },
        get: { total: requiredFields.length, present: getResult.present.length, missing: getResult.missing.length }
      };
    }
  } catch (error) {
    console.log('✗ Error:', error.response?.data || error.message);
    return { list: { total: 0, present: 0, missing: 0 }, get: { total: 0, present: 0, missing: 0 } };
  }
}

async function testCustomsClearances() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CUSTOMS CLEARANCES');
  console.log('='.repeat(80));
  
  try {
    // Test LIST endpoint
    console.log('\n📋 Testing GET /customs/clearances (LIST)');
    const listResponse = await axios.get(
      `${API_BASE}/customs/clearances`,
      { headers: { Authorization: `Bearer ${tokens.customs}` } }
    );
    
    const clearances = listResponse.data.data || [];
    if (clearances.length > 0) {
      const clearance = clearances[0];
      const requiredFields = [
        'clearanceID', 'clearanceId', 'clearanceNumber', 'shipmentID', 'declarationNumber',
        'status', 'clearedBy', 'clearedDate', 'dutyAmount', 'taxAmount', 'exitPoint',
        'customsValueUSD', 'quantity', 'currency', 'hsCode', 'destination',
        'blockchainTxId', 'createdAt', 'updatedAt'
      ];
      
      const result = checkFields(clearance, requiredFields, 'Customs Clearance (LIST)');
      console.log(`✓ Fields present (${result.present.length}/${requiredFields.length}):`, result.present.slice(0, 5).join(', '), '...');
      if (result.missing.length > 0) {
        console.log(`✗ Missing fields (${result.missing.length}):`, result.missing.join(', '));
      }
      if (result.nullOrUndefined.length > 0) {
        console.log(`⚠ Null/undefined fields (${result.nullOrUndefined.length}):`, result.nullOrUndefined.join(', '));
      }
      
      return {
        list: { total: requiredFields.length, present: result.present.length, missing: result.missing.length }
      };
    }
  } catch (error) {
    console.log('✗ Error:', error.response?.data || error.message);
    return { list: { total: 0, present: 0, missing: 0 } };
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('  COMPREHENSIVE FIELD VERIFICATION TEST');
  console.log('='.repeat(80));
  
  // Login
  console.log('\n📝 Authenticating...');
  await login('ecta');
  await login('customs');
  await login('bank');
  
  if (!tokens.ecta || !tokens.customs) {
    console.log('\n✗ Authentication failed. Cannot continue tests.');
    return;
  }
  console.log('✓ Authentication successful');
  
  // Run tests
  const results = {};
  
  results.qualityInspections = await testQualityInspections();
  results.customsDeclarations = await testCustomsDeclarations();
  results.customsClearances = await testCustomsClearances();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('  SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n📊 Quality Inspections:');
  console.log(`   LIST:  ${results.qualityInspections.list.present}/${results.qualityInspections.list.total} fields present`);
  console.log(`   GET:   ${results.qualityInspections.get.present}/${results.qualityInspections.get.total} fields present`);
  
  console.log('\n📊 Customs Declarations:');
  console.log(`   LIST:  ${results.customsDeclarations.list.present}/${results.customsDeclarations.list.total} fields present`);
  console.log(`   GET:   ${results.customsDeclarations.get.present}/${results.customsDeclarations.get.total} fields present`);
  
  console.log('\n📊 Customs Clearances:');
  console.log(`   LIST:  ${results.customsClearances.list.present}/${results.customsClearances.list.total} fields present`);
  
  // Calculate overall score
  const totalFields = 
    results.qualityInspections.list.total + 
    results.qualityInspections.get.total +
    results.customsDeclarations.list.total +
    results.customsDeclarations.get.total +
    results.customsClearances.list.total;
    
  const presentFields = 
    results.qualityInspections.list.present + 
    results.qualityInspections.get.present +
    results.customsDeclarations.list.present +
    results.customsDeclarations.get.present +
    results.customsClearances.list.present;
  
  const percentage = Math.round((presentFields / totalFields) * 100);
  
  console.log('\n' + '='.repeat(80));
  console.log(`Overall: ${presentFields}/${totalFields} fields present (${percentage}%)`);
  console.log('='.repeat(80));
  
  if (percentage === 100) {
    console.log('\n🎉 PERFECT! All fields are properly returned from all endpoints!');
  } else if (percentage >= 90) {
    console.log('\n✓ EXCELLENT! Most fields are properly returned.');
  } else if (percentage >= 75) {
    console.log('\n⚠️  GOOD! But some fields are missing.');
  } else {
    console.log('\n✗ NEEDS ATTENTION! Many fields are missing.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n✗ Fatal error:', error.message);
  process.exit(1);
});
