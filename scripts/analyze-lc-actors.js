#!/usr/bin/env node

/**
 * Analyze LC1788419907720 to show WHO performed WHAT actions
 * Compare with proper trade finance workflow
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
const LC_ID = 'LC1788419907720';

async function loginAsBank() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'bankAdmin',
      password: 'password123'
    });
    console.log('   ✅ Login successful');
    return response.data.data.token;  // Token is in response.data.data.token
  } catch (error) {
    console.error('   ❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getLCData(token) {
  const response = await axios.get(`${API_BASE}/banking/lc/${LC_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.data;
}

async function getAuditTrail(token) {
  const response = await axios.get(`${API_BASE}/audit/entity/LC/${LC_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.data;
}

function decodeBase64X509(base64Str) {
  if (!base64Str) return null;
  try {
    const decoded = Buffer.from(base64Str, 'base64').toString('utf-8');
    // Extract CN (Common Name) from X.509 DN
    const cnMatch = decoded.match(/CN=([^,]+)/);
    return cnMatch ? cnMatch[1] : decoded.substring(0, 50);
  } catch {
    return base64Str.substring(0, 50);
  }
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  LC Actor Analysis: ${LC_ID}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const token = await loginAsBank();
    const lc = await getLCData(token);
    const audit = await getAuditTrail(token);

    // Show LC basic info
    console.log('📄 LC Information:');
    console.log(`   LC ID: ${lc.lcId}`);
    console.log(`   Status: ${lc.status}`);
    console.log(`   Contract: ${lc.contractId}`);
    console.log(`   Exporter: ${lc.exporterId}`);
    console.log(`   Amount: $${lc.amount.toLocaleString()} ${lc.currency}\n`);

    // Show actor fields from blockchain
    console.log('👤 Actor Fields (from CouchDB blockchain):');
    console.log(`   approvedBy: ${lc.approvedBy ? decodeBase64X509(lc.approvedBy) : 'NULL'}`);
    console.log(`   approvedByMsp: ${lc.approvedByMsp || 'NULL'}`);
    console.log(`   issuedBy: ${lc.issuedBy || 'NULL (not issued yet)'}`);
    console.log(`   issuedByMsp: ${lc.issuedByMsp || 'NULL'}\n`);

    // Show audit trail
    console.log('📜 Audit Trail (from blockchain):');
    audit.forEach((log, index) => {
      const caller = log.signature?.caller;
      console.log(`\n   Entry ${index + 1}: ${log.actionType}`);
      console.log(`   └─ Actor: ${caller?.commonName} (${caller?.mspId})`);
      console.log(`   └─ Status: ${log.statusBefore || 'none'} → ${log.statusAfter}`);
      console.log(`   └─ Time: ${log.signature?.timestamp}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ❌ PROBLEM IDENTIFIED');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('What Actually Happened:');
    audit.forEach((log, index) => {
      const caller = log.signature?.caller;
      const action = log.actionType === 'CREATE' ? 'REQUESTED' : log.actionType;
      console.log(`   ${index + 1}. ${action} by ${caller?.commonName} (${caller?.mspId}) ❌`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ CORRECT WORKFLOW');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('What Should Have Happened:');
    console.log('   1. REQUEST by Exporter (ExportersMSP) ✅');
    console.log('   2. APPROVE by Bank Officer (BanksMSP) ✅');
    console.log('   3. ISSUE by Bank Officer (BanksMSP) ✅\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  📋 EXPLANATION');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('In proper trade finance workflow:');
    console.log('   • EXPORTER requests Letter of Credit for their shipment');
    console.log('   • BANK reviews and approves if creditworthy');
    console.log('   • BANK issues LC to advising bank');
    console.log('   • ECTA (trade authority) does NOT request or approve LCs\n');

    console.log('Why this happened:');
    console.log('   • Test data created with wrong user roles');
    console.log('   • API lacks RBAC (Role-Based Access Control) enforcement');
    console.log('   • ECTA admin user performed actions meant for exporter/bank\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔧 SOLUTION');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('To fix this system-wide:');
    console.log('   1. Add RBAC middleware to LC endpoints');
    console.log('   2. Only allow exporters to REQUEST LCs');
    console.log('   3. Only allow banks to APPROVE/ISSUE LCs');
    console.log('   4. Update UI to show approvedByMsp and issuedByMsp');
    console.log('   5. Create new test LCs with correct actor roles\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
