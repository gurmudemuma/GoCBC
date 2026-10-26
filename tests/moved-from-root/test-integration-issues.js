#!/usr/bin/env node

/**
 * INTEGRATION ISSUES VERIFICATION TEST
 * Specifically tests the issues identified:
 * 1. Document attachment during LC issuance
 * 2. Audit trail endpoints
 * 3. Blockchain TxID capture
 * 4. Data persistence via GET endpoints
 */

const axios = require('axios');

const API = 'http://localhost:3001/api/v1';

const log = (msg) => console.log(`→ ${msg}`);
const success = (msg) => console.log(`✅ ${msg}`);
const error = (msg) => console.log(`❌ ${msg}`);
const warn = (msg) => console.log(`⚠️  ${msg}`);

let tokens = {};
let data = {};
let issues = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0
};

async function login(role, username, password) {
  const res = await axios.post(`${API}/auth/login`, { username, password });
  tokens[role] = res.data.data.token;
}

async function testBlockchainTxID() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Blockchain Transaction ID Capture');
  console.log('='.repeat(80));
  
  issues.total++;
  
  try {
    // Create a contract
    const contractId = `CONTRACT${Date.now()}`;
    const res = await axios.post(`${API}/contracts`, {
      contractID: contractId,
      exporterID: 'EXP4342570',
      buyerID: `BUYER${Date.now()}`,
      buyerName: 'Test Buyer Corp',
      buyerCountry: 'USA',
      buyerBank: 'Test Bank',
      exporterBank: 'Commercial Bank of Ethiopia',
      coffeeType: 'Arabica',
      quantity: 10000,
      pricePerKg: 8.0,
      currency: 'USD',
      paymentMethod: 'LC',
      eudrRequired: true
    }, { headers: { Authorization: `Bearer ${tokens.exporter}` }});
    
    log(`Contract created: ${contractId}`);
    
    // Check if txId is returned in response
    if (res.data.txId || res.data.txID || res.data.transactionId) {
      const txId = res.data.txId || res.data.txID || res.data.transactionId;
      success(`✓ Blockchain TxID captured in response: ${txId.substring(0, 20)}...`);
      issues.passed++;
    } else {
      error(`✗ No TxID in response`);
      warn(`Response structure: ${JSON.stringify(Object.keys(res.data))}`);
      issues.failed++;
    }
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to get contract and check for blockchain metadata
    const getRes = await axios.get(`${API}/contracts/${contractId}`, {
      headers: { Authorization: `Bearer ${tokens.ecta}` }
    });
    
    if (getRes.data.success && getRes.data.data) {
      const contract = getRes.data.data;
      
      // Check for blockchain metadata
      const hasTxId = contract.txId || contract.txID || contract.transactionId;
      const hasBlockchain = contract.blockchainMetadata || contract.blockchain_metadata;
      
      if (hasTxId) {
        success(`✓ TxID persisted in database: ${hasTxId.substring(0, 20)}...`);
      } else if (hasBlockchain) {
        success(`✓ Blockchain metadata found: ${JSON.stringify(hasBlockchain).substring(0, 50)}...`);
      } else {
        warn(`⚠ No blockchain metadata found in GET response`);
        issues.warnings++;
      }
    }
    
    data.contractId = contractId;
    
  } catch (e) {
    error(`Test failed: ${e.message}`);
    issues.failed++;
  }
}

async function testAuditTrailEndpoints() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Audit Trail Endpoints');
  console.log('='.repeat(80));
  
  issues.total++;
  
  if (!data.contractId) {
    warn('Skipping - no contract ID available');
    return;
  }
  
  // Test 1: Blockchain audit endpoint
  log('Testing blockchain audit endpoint...');
  try {
    const res = await axios.get(`${API}/audit/blockchain/CONTRACT/${data.contractId}`, {
      headers: { Authorization: `Bearer ${tokens.ecta}` }
    });
    
    if (res.data.success && res.data.data) {
      success(`✓ Blockchain audit endpoint working`);
      log(`  Data returned: ${JSON.stringify(Object.keys(res.data.data))}`);
      issues.passed++;
    } else {
      warn(`⚠ Endpoint returns but no data found`);
      issues.warnings++;
    }
  } catch (e) {
    if (e.response?.status === 404) {
      error(`✗ Endpoint returns 404 - not implemented or route missing`);
      issues.failed++;
    } else {
      error(`✗ Error: ${e.message}`);
      issues.failed++;
    }
  }
  
  // Test 2: Audit trail endpoint
  issues.total++;
  log('Testing audit trail endpoint...');
  try {
    const res = await axios.get(`${API}/audit/trail/CONTRACT/${data.contractId}`, {
      headers: { Authorization: `Bearer ${tokens.ecta}` }
    });
    
    if (res.data.success && res.data.data) {
      success(`✓ Audit trail endpoint working - ${res.data.data.length} entries`);
      issues.passed++;
    } else {
      warn(`⚠ Endpoint returns but no trail data`);
      issues.warnings++;
    }
  } catch (e) {
    if (e.response?.status === 404) {
      error(`✗ Endpoint returns 404 - not implemented or route missing`);
      issues.failed++;
    } else {
      error(`✗ Error: ${e.message}`);
      issues.failed++;
    }
  }
}

async function testLCDocuments() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: LC Document Creation and Attachment');
  console.log('='.repeat(80));
  
  issues.total++;
  
  if (!data.contractId) {
    warn('Skipping - no contract ID available');
    return;
  }
  
  try {
    // Approve contract first
    await axios.post(`${API}/contracts/${data.contractId}/approve`, {
      approvalNotes: 'Test approval',
      nbeReferenceNumber: `NBE${Date.now()}`
    }, { headers: { Authorization: `Bearer ${tokens.ecta}` }});
    
    // Create LC
    const lcId = `LC${Date.now()}`;
    await axios.post(`${API}/banking/lc/request`, {
      lcID: lcId,
      contractID: data.contractId,
      exporterID: 'EXP4342570',
      bankName: 'Test Bank',
      amount: '80000',
      currency: 'USD',
      expiryDate: '2027-12-31'
    }, { headers: { Authorization: `Bearer ${tokens.exporter}` }});
    
    // Approve LC
    await axios.post(`${API}/banking/lc/${lcId}/approve`, {
      reviewNotes: 'Approved for test'
    }, { headers: { Authorization: `Bearer ${tokens.bank}` }});
    
    // Issue LC
    log(`Issuing LC: ${lcId}`);
    const issueRes = await axios.post(`${API}/banking/lc/${lcId}/issue`, {
      issuanceDate: new Date().toISOString().split('T')[0],
      swiftReference: `MT700${Date.now()}`,
      terms: 'Test LC terms'
    }, { headers: { Authorization: `Bearer ${tokens.bank}` }});
    
    log(`LC issued successfully`);
    
    // Wait for any document creation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get LC and check for documents
    const getRes = await axios.get(`${API}/banking/lc/${lcId}`, {
      headers: { Authorization: `Bearer ${tokens.bank}` }
    });
    
    if (getRes.data.success && getRes.data.data) {
      const lc = getRes.data.data;
      const docCount = lc.documents?.length || 0;
      
      if (docCount > 0) {
        success(`✓ LC has ${docCount} document(s) attached`);
        lc.documents.forEach(doc => {
          log(`  - ${doc.documentType || doc.document_type}: ${doc.status}`);
        });
        issues.passed++;
      } else {
        warn(`⚠ LC issued but no documents attached (0 documents)`);
        warn(`  Note: Documents may need to be uploaded separately via document upload endpoint`);
        issues.warnings++;
      }
      
      // Check if SWIFT reference is captured
      if (lc.swiftReference || lc.swift_reference) {
        success(`✓ SWIFT reference captured: ${lc.swiftReference || lc.swift_reference}`);
      } else {
        warn(`⚠ SWIFT reference not found in LC data`);
        issues.warnings++;
      }
    }
    
    data.lcId = lcId;
    
  } catch (e) {
    error(`Test failed: ${e.response?.data?.error?.message || e.message}`);
    issues.failed++;
  }
}

async function testDataPersistence() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Data Persistence via GET Endpoints');
  console.log('='.repeat(80));
  
  // Test quality inspection GET
  issues.total++;
  log('Testing quality inspection GET endpoint...');
  
  try {
    // Create shipment
    const shipmentId = `SHIP${Date.now()}`;
    await axios.post(`${API}/shipments`, {
      shipmentID: shipmentId,
      contractID: data.contractId,
      exporterID: 'EXP4342570',
      buyerID: `BUYER${Date.now()}`,
      origin: 'Test Origin',
      quantity: 10000,
      grade: 'Grade 1',
      icoNumber: `ICO${Date.now()}`,
      ecxLotNumber: `ECX${Date.now()}`,
      channel: 'ECX',
      forexRate: 121.5,
      valueUSD: 80000,
      eudrCompliant: true
    }, { headers: { Authorization: `Bearer ${tokens.exporter}` }});
    
    // Create inspection
    const inspectionId = `INSP${Date.now()}`;
    await axios.post(`${API}/quality/inspections`, {
      inspectionID: inspectionId,
      shipmentID: shipmentId,
      contractID: data.contractId,
      exporterID: 'EXP4342570',
      coffeeType: 'Arabica',
      quantity: 10000,
      sampleSize: 100,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }, { headers: { Authorization: `Bearer ${tokens.ecta}` }});
    
    log(`Inspection created: ${inspectionId}`);
    
    // Test individual GET
    try {
      const getRes = await axios.get(`${API}/quality/inspections/${inspectionId}`, {
        headers: { Authorization: `Bearer ${tokens.ecta}` }
      });
      
      if (getRes.data.success && getRes.data.data) {
        success(`✓ Individual inspection GET endpoint works`);
        issues.passed++;
      } else {
        warn(`⚠ Endpoint exists but returns no data`);
        issues.warnings++;
      }
    } catch (getErr) {
      if (getErr.response?.status === 404) {
        error(`✗ Individual inspection GET endpoint not implemented (404)`);
        issues.failed++;
        
        // Try list endpoint as fallback
        log(`Trying list endpoint as alternative...`);
        try {
          const listRes = await axios.get(`${API}/quality/inspections?shipmentID=${shipmentId}`, {
            headers: { Authorization: `Bearer ${tokens.ecta}` }
          });
          
          if (listRes.data.success && listRes.data.data) {
            const found = listRes.data.data.find(i => 
              i.inspectionID === inspectionId || i.inspection_id === inspectionId
            );
            
            if (found) {
              success(`✓ Data retrievable via list endpoint (workaround available)`);
            } else {
              warn(`⚠ List endpoint works but inspection not found`);
            }
          }
        } catch (listErr) {
          error(`✗ List endpoint also failed`);
        }
      }
    }
    
  } catch (e) {
    error(`Test setup failed: ${e.message}`);
    issues.failed++;
  }
  
  // Test customs declaration GET
  issues.total++;
  log('\nTesting customs declaration GET endpoint...');
  
  try {
    const declId = `DECL${Date.now()}`;
    
    // Note: This requires a shipment, skipping full setup for brevity
    warn(`⚠ Customs GET test requires full workflow setup - marking as needs verification`);
    issues.warnings++;
    
  } catch (e) {
    error(`Test failed: ${e.message}`);
    issues.failed++;
  }
}

async function test() {
  console.log('\n' + '='.repeat(80));
  console.log('  INTEGRATION ISSUES VERIFICATION TEST');
  console.log('  Identifying specific failures and their root causes');
  console.log('='.repeat(80) + '\n');

  // Login
  log('Authenticating...');
  await login('exporter', 'EXP4342570', 'password123');
  await login('ecta', 'ectaAdmin', 'password123');
  await login('bank', 'bankAdmin', 'password123');
  await login('nbe', 'nbeAdmin', 'password123');
  await login('customs', 'customsAdmin', 'password123');
  success('Authentication complete\n');

  // Run tests
  await testBlockchainTxID();
  await testAuditTrailEndpoints();
  await testLCDocuments();
  await testDataPersistence();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal Tests: ${issues.total}`);
  console.log(`✅ Passed: ${issues.passed}`);
  console.log(`❌ Failed: ${issues.failed}`);
  console.log(`⚠️  Warnings: ${issues.warnings}`);
  
  const passRate = issues.total > 0 ? ((issues.passed / issues.total) * 100).toFixed(1) : 0;
  console.log(`\nPass Rate: ${passRate}%`);
  
  console.log('\n' + '='.repeat(80));
  console.log('ISSUES IDENTIFIED:');
  console.log('='.repeat(80));
  
  if (issues.failed > 0) {
    console.log('\n❌ CRITICAL ISSUES (Must Fix):');
    console.log('  1. Audit trail endpoints may be returning 404');
    console.log('  2. Individual GET endpoints for some entities not implemented');
    console.log('  3. Check route registration in API server');
  }
  
  if (issues.warnings > 0) {
    console.log('\n⚠️  WARNINGS (Should Improve):');
    console.log('  1. LC document attachment: Documents may need separate upload workflow');
    console.log('  2. Blockchain metadata: May need time to sync or different field names');
    console.log('  3. Data retrieval: Some entities only accessible via list endpoints');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

test().catch(e => {
  console.error('\n❌ Test execution failed:', e.message);
  process.exit(1);
});
