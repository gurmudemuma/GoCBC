#!/usr/bin/env node

/**
 * Create a proper LC workflow with CORRECT actors:
 * 1. EXPORTER requests LC (ExportersMSP)
 * 2. BANK approves LC (BanksMSP)
 * 3. BANK issues LC (BanksMSP)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Step 1: Login as Exporter
async function loginAsExporter() {
  console.log('\n✅ Step 1: Login as Exporter (EXP4886039)');
  
  // Try multiple possible exporter credentials
  const credentials = [
    { username: 'EXP4886039', password: 'password123' },
    { username: 'EXP4886039', password: 'Password123!' },
    { username: 'testexporter', password: 'password123' },
    { username: 'exporter1', password: 'Exporter123!' }
  ];
  
  for (const cred of credentials) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, cred);
      console.log(`   ✅ Logged in as: ${cred.username}`);
      console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
      return { token: response.data.token, username: cred.username };
    } catch (error) {
      // Try next credential
      continue;
    }
  }
  
  throw new Error('Could not login with any exporter credentials');
}

// Step 2: Exporter requests LC
async function exporterRequestLC(tokenData, contractId) {
  console.log('\n✅ Step 2: Exporter requests Letter of Credit');
  
  // Get exporter ID from username or use logged in user's ID
  const exporterId = tokenData.username.startsWith('EXP') ? tokenData.username : 'EXP4886039';
  
  const lcData = {
    contractId,
    exporterId,
    issuingBank: 'Commercial Bank of Ethiopia',
    advisingBank: 'Bank of America',
    beneficiary: exporterId,
    amount: 500000,
    currency: 'USD',
    expiryDate: '2026-12-31',
    terms: 'Payment against shipping documents as per UCP 600',
    documents: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'CERTIFICATE_OF_ORIGIN']
  };

  const response = await axios.post(`${API_BASE}/banking/lc`, lcData, {
    headers: { Authorization: `Bearer ${tokenData.token}` }
  });

  console.log(`   LC ID: ${response.data.data.lcId}`);
  console.log(`   Status: ${response.data.data.status}`);
  console.log(`   Requested by: ${tokenData.username} (ExportersMSP)`);
  
  return response.data.data.lcId;
}

// Step 3: Login as Bank
async function loginAsBank() {
  console.log('\n✅ Step 3: Login as Bank Officer');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'bankAdmin',
    password: 'password123'
  });
  console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
  return response.data.token;
}

// Step 4: Bank approves LC
async function bankApproveLC(token, lcId) {
  console.log('\n✅ Step 4: Bank approves Letter of Credit');
  
  const response = await axios.put(
    `${API_BASE}/banking/lc/${lcId}/approve`,
    { approvalNotes: 'LC approved by bank after credit check' },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log(`   LC ID: ${lcId}`);
  console.log(`   Status: ${response.data.data.status}`);
  console.log(`   Approved by: BanksMSP (Bank)`);
}

// Step 5: Bank issues LC
async function bankIssueLC(token, lcId) {
  console.log('\n✅ Step 5: Bank issues Letter of Credit');
  
  const response = await axios.put(
    `${API_BASE}/banking/lc/${lcId}/issue`,
    { issueNotes: 'LC issued and sent to advising bank' },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log(`   LC ID: ${lcId}`);
  console.log(`   Status: ${response.data.data.status}`);
  console.log(`   Issued by: BanksMSP (Bank)`);
}

// Step 6: Check audit trail
async function checkAuditTrail(token, lcId) {
  console.log('\n✅ Step 6: Verify Audit Trail');
  
  const response = await axios.get(`${API_BASE}/audit/entity/LC/${lcId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const logs = response.data.data;
  console.log(`\n   === Audit Trail (${logs.length} entries) ===`);
  
  logs.forEach((log, index) => {
    console.log(`\n   Entry ${index + 1}: ${log.actionType}`);
    console.log(`     Caller: ${log.signature.caller.commonName} (${log.signature.caller.mspId})`);
    console.log(`     Status: ${log.statusBefore || 'none'} → ${log.statusAfter}`);
    console.log(`     Time: ${log.signature.timestamp}`);
  });
  
  console.log(`\n   ✅ VERIFICATION:`);
  console.log(`      - Entry 1 should show ExportersMSP (REQUEST)`);
  console.log(`      - Entry 2 should show BanksMSP (APPROVE)`);
  console.log(`      - Entry 3 should show BanksMSP (ISSUE)`);
}

// Step 7: Check LC data for approvedBy/issuedBy fields
async function checkLCData(token, lcId) {
  console.log('\n✅ Step 7: Verify LC Data Fields');
  
  const response = await axios.get(`${API_BASE}/banking/lc/${lcId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const lc = response.data.data;
  console.log(`\n   === LC Data ===`);
  console.log(`   approvedBy: ${lc.approvedBy ? lc.approvedBy.substring(0, 50) + '...' : 'NULL'}`);
  console.log(`   approvedByMsp: ${lc.approvedByMsp || 'NULL'}`);
  console.log(`   issuedBy: ${lc.issuedBy ? lc.issuedBy.substring(0, 50) + '...' : 'NULL'}`);
  console.log(`   issuedByMsp: ${lc.issuedByMsp || 'NULL'}`);
  
  console.log(`\n   ✅ VERIFICATION:`);
  console.log(`      - approvedByMsp should be BanksMSP`);
  console.log(`      - issuedByMsp should be BanksMSP`);
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PROPER LC WORKFLOW TEST: Correct Actor Roles');
    console.log('═══════════════════════════════════════════════════════');

    // Use existing contract
    const contractId = 'CONTRACT1786343272751';

    const exporterData = await loginAsExporter();
    const lcId = await exporterRequestLC(exporterData, contractId);

    const bankToken = await loginAsBank();
    await bankApproveLC(bankToken, lcId);
    await bankIssueLC(bankToken, lcId);

    await checkAuditTrail(bankToken, lcId);
    await checkLCData(bankToken, lcId);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ TEST COMPLETE');
    console.log(`  LC ID: ${lcId}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
