/**
 * Create a COMPLETE LC workflow with CORRECT actors
 * This proves the system now works correctly with proper segregation of duties
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function login(username, password) {
  const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
  return response.data.data.token;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Creating Complete LC Workflow with CORRECT Actors');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get an exporter with approved contract
    console.log('Step 1: Finding exporter with approved contract...\n');
    
    // First, get list of exporters with contracts
    const ectaToken = await login('ectaAdmin', 'password123');
    console.log('✅ Logged in as ectaAdmin to find exporters');
    
    const contractsResponse = await axios.get(
      `${API_BASE}/contracts`,
      { headers: { Authorization: `Bearer ${ectaToken}` } }
    );
    
    const approvedContract = contractsResponse.data.data?.find(c => c.status === 'APPROVED');
    
    if (!approvedContract) {
      console.log('\n⚠️  No approved contract found!');
      console.log('   Need to create and approve a contract first.');
      console.log('   Run this script after contracts exist in the system.\n');
      return;
    }
    
    console.log(`   Found contract: ${approvedContract.contractId}`);
    console.log(`   Exporter: ${approvedContract.exporterId}`);
    console.log(`   Amount: $${approvedContract.totalValue} ${approvedContract.currency}`);
    console.log(`   Status: ${approvedContract.status}\n`);
    
    // Step 2: Exporter requests LC (should use ExportersMSP)
    console.log('Step 2: Creating LC Request (API will use ExportersMSP)...\n');
    
    const newLcId = `LC-CORRECT-${Date.now()}`;
    const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    
    // NOTE: We're logged in as ECTA, but the API RBAC should block this
    // unless we have proper permissions. For testing, we'll use bank admin
    // who can create LCs on behalf of exporters in some systems
    
    const bankToken = await login('bankAdmin', 'password123');
    console.log('✅ Logged in as bankAdmin');
    
    // Try to request LC - this will test if connectAsOrg('ExportersMSP') works
    try {
      const lcRequestResponse = await axios.post(
        `${API_BASE}/banking/lc/request`,
        {
          lcId: newLcId,
          contractId: approvedContract.contractId,
          exporterId: approvedContract.exporterId,
          bankName: 'Commercial Bank of Ethiopia',
          amount: approvedContract.totalValue,
          currency: approvedContract.currency,
          expiryDate: expiryDate
        },
        { headers: { Authorization: `Bearer ${ectaToken}` } }  // Using ECTA token
      );
      
      console.log(`✅ LC Request successful: ${newLcId}`);
      console.log(`   Transaction ID: ${lcRequestResponse.data.txId || 'N/A'}`);
      console.log(`   Status: REQUESTED\n`);
      
    } catch (requestError) {
      if (requestError.response?.status === 403) {
        console.log(`✅ RBAC WORKING: ECTA blocked from requesting LC (HTTP 403)`);
        console.log(`   Error: ${requestError.response?.data?.error?.message}`);
        console.log(`\n   This is CORRECT behavior - only exporters should request LCs.`);
        console.log(`   The old test data shows ECTA doing this, which was a violation.\n`);
        console.log(`⚠️  To complete the test, we need an actual exporter user with credentials.\n`);
        return;
      }
      console.log(`❌ LC Request failed: ${requestError.response?.data?.error?.message || requestError.message}\n`);
      return;
    }
    
    // Wait for blockchain to process
    console.log('   Waiting for blockchain to process transaction...\n');
    await sleep(3000);
    
    // Step 3: Bank approves LC (should use BanksMSP)
    console.log('Step 3: Bank approving LC...\n');
    
    console.log('✅ Using bankAdmin credentials');
    
    try {
      const approveResponse = await axios.post(
        `${API_BASE}/banking/lc/${newLcId}/approve`,
        { beneficiary: approvedContract.exporterId },
        { headers: { Authorization: `Bearer ${bankToken}` } }
      );
      
      console.log(`✅ LC Approval successful`);
      console.log(`   Status: REQUESTED → APPROVED\n`);
      
    } catch (approveError) {
      console.log(`❌ LC Approval failed: ${approveError.response?.data?.error?.message || approveError.message}\n`);
      return;
    }
    
    // Wait for blockchain
    console.log('   Waiting for blockchain to process transaction...\n');
    await sleep(3000);
    
    // Step 4: Bank issues LC (should use BanksMSP)
    console.log('Step 4: Bank issuing LC...\n');
    
    try {
      const issueResponse = await axios.post(
        `${API_BASE}/banking/lc/${newLcId}/issue`,
        { terms: 'Standard UCP 600 terms' },
        { headers: { Authorization: `Bearer ${bankToken}` } }
      );
      
      console.log(`✅ LC Issue successful`);
      console.log(`   Status: APPROVED → ISSUED\n`);
      
    } catch (issueError) {
      console.log(`❌ LC Issue failed: ${issueError.response?.data?.error?.message || issueError.message}\n`);
      return;
    }
    
    // Wait for blockchain
    console.log('   Waiting for blockchain to process transaction...\n');
    await sleep(3000);
    
    // Step 5: Verify audit trail shows correct actors
    console.log('Step 5: Verifying audit trail...\n');
    
    try {
      const auditResponse = await axios.get(
        `${API_BASE}/audit/entity/LC/${newLcId}`,
        { headers: { Authorization: `Bearer ${bankToken}` } }
      );
      
      const auditLogs = auditResponse.data.data || [];
      
      if (auditLogs.length === 0) {
        console.log('⚠️  No audit logs found yet (blockchain may still be processing)\n');
        return;
      }
      
      console.log(`Found ${auditLogs.length} audit log(s):\n`);
      
      const results = {
        request: { expected: 'ExportersMSP', actual: null, correct: false },
        approve: { expected: 'BanksMSP', actual: null, correct: false },
        issue: { expected: 'BanksMSP', actual: null, correct: false },
      };
      
      auditLogs.forEach((log, index) => {
        const action = log.actionType;
        const actor = log.signature?.caller?.commonName || 'Unknown';
        const msp = log.signature?.caller?.mspId || 'Unknown';
        const status = log.statusBefore ? `${log.statusBefore} → ${log.statusAfter}` : log.statusAfter;
        
        console.log(`${index + 1}. ${action}`);
        console.log(`   Actor: ${actor}`);
        console.log(`   Organization: ${msp}`);
        console.log(`   Status: ${status}`);
        
        if (action === 'CREATE' || action === 'REQUEST') {
          results.request.actual = msp;
          results.request.correct = (msp === 'ExportersMSP');
          console.log(`   ${results.request.correct ? '✅ CORRECT' : '❌ WRONG'}: Should be ExportersMSP`);
        } else if (action === 'APPROVE') {
          results.approve.actual = msp;
          results.approve.correct = (msp === 'BanksMSP');
          console.log(`   ${results.approve.correct ? '✅ CORRECT' : '❌ WRONG'}: Should be BanksMSP`);
        } else if (action === 'ISSUE') {
          results.issue.actual = msp;
          results.issue.correct = (msp === 'BanksMSP');
          console.log(`   ${results.issue.correct ? '✅ CORRECT' : '❌ WRONG'}: Should be BanksMSP`);
        }
        console.log();
      });
      
      // Summary
      console.log('═══════════════════════════════════════════════════════');
      console.log('  Verification Summary');
      console.log('═══════════════════════════════════════════════════════\n');
      
      console.log(`LC Request (CREATE):`);
      console.log(`   Expected: ${results.request.expected}`);
      console.log(`   Actual: ${results.request.actual}`);
      console.log(`   ${results.request.correct ? '✅ CORRECT' : '❌ WRONG'}\n`);
      
      console.log(`LC Approve:`);
      console.log(`   Expected: ${results.approve.expected}`);
      console.log(`   Actual: ${results.approve.actual}`);
      console.log(`   ${results.approve.correct ? '✅ CORRECT' : '❌ WRONG'}\n`);
      
      console.log(`LC Issue:`);
      console.log(`   Expected: ${results.issue.expected}`);
      console.log(`   Actual: ${results.issue.actual}`);
      console.log(`   ${results.issue.correct ? '✅ CORRECT' : '❌ WRONG'}\n`);
      
      const allCorrect = results.request.correct && results.approve.correct && results.issue.correct;
      
      if (allCorrect) {
        console.log('🎉 SUCCESS! All actors are correct!');
        console.log('   The system is now working properly with correct segregation of duties.\n');
        console.log(`📋 View this LC in the UI:`);
        console.log(`   http://localhost:3000 → Banks Portal → Letters of Credit → ${newLcId}\n`);
        console.log(`   The Activity Timeline should show NO violations for this LC.\n`);
      } else {
        console.log('❌ FAILURE! Some actors are still wrong.');
        console.log('   The connectAsOrg() fix may not be working correctly.\n');
        console.log('   Check API logs for connection issues:\n');
        console.log('   tail -f api/api.log | grep "Connected as"\n');
      }
      
    } catch (auditError) {
      console.log(`❌ Failed to fetch audit logs: ${auditError.message}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
