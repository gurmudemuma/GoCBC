/**
 * Test ALL portal endpoints to find missing/incorrect data
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

const USERS = {
  exporter: { username: 'EXP4342570', password: 'password123' },
  ecta: { username: 'ectaAdmin', password: 'password123' },
  customs: { username: 'customsAdmin', password: 'password123' },
  bank: { username: 'bankAdmin', password: 'password123' },
  nbe: { username: 'nbeAdmin', password: 'password123' },
  shipping: { username: 'shippingAdmin', password: 'password123' }
};

let tokens = {};

async function login(userType) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, USERS[userType]);
    tokens[userType] = response.data.token || response.data.data?.token;
    return !!tokens[userType];
  } catch (error) {
    console.log(`✗ Login failed for ${userType}`);
    return false;
  }
}

function analyzeData(data, name) {
  const issues = [];
  const fields = Object.keys(data);
  
  fields.forEach(key => {
    const value = data[key];
    
    // Check for problematic values
    if (value === undefined) {
      issues.push(`${key}: undefined`);
    } else if (value === 'Invalid Date') {
      issues.push(`${key}: Invalid Date`);
    } else if (value === 'N/A' || value === 'n/a') {
      issues.push(`${key}: N/A`);
    } else if (typeof value === 'number' && value === 0) {
      // Only flag 0 for critical amount fields that should always have values
      // Don't flag optional amounts like advance, retention, duty, tax
      const criticalAmountFields = ['amount', 'totalValue', 'pricePerKg', 'quantity'];
      const optionalAmountFields = ['advanceamount', 'retainedamount', 'dutyamount', 'taxamount', 'convertedamount'];
      
      const keyLower = key.toLowerCase();
      const isCritical = criticalAmountFields.some(f => keyLower === f);
      const isOptional = optionalAmountFields.some(f => keyLower === f);
      
      if (isCritical && !isOptional) {
        issues.push(`${key}: 0 (might be wrong)`);
      }
    }
    // Don't flag null or empty strings - these are expected for optional/unset fields
  });
  
  return { name, fieldCount: fields.length, issues };
}

async function testContracts() {
  console.log('\n📋 TESTING CONTRACTS');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/contracts?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.exporter}` }
    });
    
    const contracts = resp.data.data?.contracts || resp.data.data || [];
    if (contracts.length > 0) {
      const result = analyzeData(contracts[0], 'Contract');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function testLCs() {
  console.log('\n📋 TESTING LETTER OF CREDITS');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/banking/lcs?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    const lcs = resp.data.data?.lcs || resp.data.data || [];
    if (lcs.length > 0) {
      const result = analyzeData(lcs[0], 'LC');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function testShipments() {
  console.log('\n📋 TESTING SHIPMENTS');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/shipments?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.shipping}` }
    });
    
    const shipments = resp.data.data?.shipments || resp.data.data || [];
    if (shipments.length > 0) {
      const result = analyzeData(shipments[0], 'Shipment');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function testPayments() {
  console.log('\n📋 TESTING PAYMENTS');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/payments?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    const payments = resp.data.data || [];
    if (payments.length > 0) {
      const result = analyzeData(payments[0], 'Payment');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function testQualityInspections() {
  console.log('\n📋 TESTING QUALITY INSPECTIONS');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/quality/inspections?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.ecta}` }
    });
    
    const inspections = resp.data.data?.inspections || resp.data.data || [];
    if (inspections.length > 0) {
      const result = analyzeData(inspections[0], 'Quality Inspection');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function testCustomsDeclarations() {
  console.log('\n📋 TESTING CUSTOMS DECLARATIONS');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/customs/declarations?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.customs}` }
    });
    
    const declarations = resp.data.data || [];
    if (declarations.length > 0) {
      const result = analyzeData(declarations[0], 'Customs Declaration');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function testCustomsClearances() {
  console.log('\n📋 TESTING CUSTOMS CLEARANCES');
  console.log('='.repeat(80));
  
  try {
    const resp = await axios.get(`${API_BASE}/customs/clearances?limit=1`, {
      headers: { Authorization: `Bearer ${tokens.customs}` }
    });
    
    const clearances = resp.data.data || [];
    if (clearances.length > 0) {
      const result = analyzeData(clearances[0], 'Customs Clearance');
      console.log(`Fields: ${result.fieldCount}`);
      if (result.issues.length > 0) {
        console.log('❌ Issues found:');
        result.issues.forEach(i => console.log(`   - ${i}`));
      } else {
        console.log('✅ All fields look good');
      }
      return result.issues.length;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
  }
  return 0;
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('  TESTING ALL PORTAL DATA - Finding Missing/Incorrect Fields');
  console.log('='.repeat(80));
  
  // Login all users
  console.log('\n🔐 Logging in...');
  await Promise.all([
    login('exporter'),
    login('ecta'),
    login('customs'),
    login('bank'),
    login('nbe'),
    login('shipping')
  ]);
  
  if (!tokens.exporter || !tokens.bank) {
    console.log('\n✗ Authentication failed');
    return;
  }
  console.log('✅ Authentication successful');
  
  // Run all tests
  let totalIssues = 0;
  totalIssues += await testContracts();
  totalIssues += await testLCs();
  totalIssues += await testShipments();
  totalIssues += await testPayments();
  totalIssues += await testQualityInspections();
  totalIssues += await testCustomsDeclarations();
  totalIssues += await testCustomsClearances();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('  SUMMARY');
  console.log('='.repeat(80));
  
  if (totalIssues === 0) {
    console.log('✅ ALL ENDPOINTS RETURN CLEAN DATA!');
  } else {
    console.log(`❌ Found ${totalIssues} issues across all endpoints`);
    console.log('⚠️  These need to be fixed!');
  }
}

runTests().catch(error => {
  console.error('\n✗ Fatal error:', error.message);
  process.exit(1);
});
