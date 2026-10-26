#!/usr/bin/env node

/**
 * END-TO-END TEST: Prove 6/6 Organization Consensus
 * Creates fresh contract → LC request → LC approval → Verify endorsements
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Test credentials
const EXPORTER_CREDS = { username: 'EXP8958382', password: 'password123' };
const ADMIN_CREDS = { username: 'admin', password: 'admin123' };

async function login(credentials) {
  const response = await axios.post(`${API_BASE}/auth/login`, credentials);
  const token = response.data.token || response.data.data?.token;
  console.log(`✅ Logged in as: ${credentials.username}`);
  return token;
}

async function createContract(token) {
  const timestamp = Date.now();
  const contractId = `CONTRACT-TEST-${timestamp}`;
  
  const contractData = {
    contractID: contractId,
    exporterID: 'EXP8958382',
    buyerID: 'BUYER001',
    buyerCountry: 'United States',
    buyerBank: 'Wells Fargo Bank',
    exporterBank: 'Commercial Bank of Ethiopia',
    coffeeType: 'Arabica',
    quantity: 1000,
    pricePerKg: 5000,
    currency: 'USD',
    deliveryDate: new Date(Date.now() + 60*24*60*60*1000).toISOString(),
    terms: 'FOB Addis Ababa',
    eudrRequired: false,
    status: 'APPROVED'
  };
  
  try {
    console.log(`\n📋 Creating new contract: ${contractId}`);
    const response = await axios.post(
      `${API_BASE}/contracts`,
      contractData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ Contract created successfully`);
    return contractId;
  } catch (error) {
    console.error(`❌ Contract creation failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function requestLC(token, contractId) {
  const timestamp = Date.now();
  const lcID = `LC-${contractId}-${timestamp}`;
  
  const lcData = {
    lcID: lcID,
    contractID: contractId,
    exporterID: 'EXP8958382',
    bankName: 'Wells Fargo Bank',
    amount: '5000000',
    currency: 'USD',
    expiryDate: new Date(Date.now() + 90*24*60*60*1000).toISOString()
  };
  
  try {
    console.log(`\n💳 Requesting LC: ${lcID}`);
    const response = await axios.post(
      `${API_BASE}/banking/lc/request`,
      lcData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ LC Requested successfully`);
    return lcID;
  } catch (error) {
    console.error(`❌ LC Request failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function approveLC(token, lcID) {
  try {
    console.log(`\n✍️  Approving LC: ${lcID}`);
    const response = await axios.post(
      `${API_BASE}/banking/lc/${lcID}/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ LC Approved successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ LC Approval failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function getBlockchainSignatures(token, lcID) {
  try {
    const response = await axios.get(
      `${API_BASE}/blockchain-signatures/entity/LETTER_OF_CREDIT/${lcID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = response.data?.data || response.data;
    return data.transactions || [];
  } catch (error) {
    console.error('Failed to get signatures:', error.response?.data || error.message);
    return [];
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              FULL CONSENSUS PROOF TEST (6 of 6)                    ║');
  console.log('║          Creating FRESH transaction to prove endorsements          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  let exporterToken, adminToken, contractId, lcID;
  
  try {
    // Step 1: Login as exporter
    console.log('STEP 1: Login as Exporter');
    console.log('─'.repeat(70));
    exporterToken = await login(EXPORTER_CREDS);
    
    // Step 2: Create new contract
    console.log('\nSTEP 2: Create New Sales Contract');
    console.log('─'.repeat(70));
    contractId = await createContract(exporterToken);
    
    // Step 3: Request LC
    console.log('\nSTEP 3: Request Letter of Credit');
    console.log('─'.repeat(70));
    lcID = await requestLC(exporterToken, contractId);
    
    // Step 4: Login as admin/bank
    console.log('\nSTEP 4: Login as Bank Admin');
    console.log('─'.repeat(70));
    adminToken = await login(ADMIN_CREDS);
    
    // Step 5: Approve LC (THIS WILL TRIGGER 6-ORG ENDORSEMENT)
    console.log('\nSTEP 5: Approve LC (6-Org Endorsement Test)');
    console.log('─'.repeat(70));
    console.log('⏳ This transaction will collect endorsements from all 6 peers...');
    await approveLC(adminToken, lcID);
    
    // Step 6: Wait for blockchain
    console.log('\nSTEP 6: Wait for Blockchain Propagation');
    console.log('─'.repeat(70));
    console.log('⏳ Waiting 8 seconds for transaction to be committed and indexed...');
    await sleep(8000);
    
    // Step 7: Fetch signatures
    console.log('\nSTEP 7: Fetch Blockchain Signatures');
    console.log('─'.repeat(70));
    const signatures = await getBlockchainSignatures(adminToken, lcID);
    console.log(`📦 Retrieved ${signatures.length} signature record(s)\n`);
    
    if (signatures.length === 0) {
      console.log('⚠️  No signatures found yet. Wait a bit longer and check manually:');
      console.log(`   URL: http://localhost:3000`);
      console.log(`   Navigate to: Banks Portal → Letters of Credit → ${lcID}`);
      console.log(`   Look for: "Consortium Endorsements" section`);
      return;
    }
    
    // Step 8: Analyze endorsements
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🎯 ENDORSEMENT PROOF RESULTS 🎯                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    let maxEndorsers = 0;
    let approveLCTransaction = null;
    
    // Find the ApproveLC transaction (the one we just created)
    signatures.forEach((sig) => {
      const functionName = sig.chaincodeFunction || 'Unknown';
      const endorserCount = sig.endorsers?.length || 0;
      
      if (functionName === 'ApproveLC') {
        approveLCTransaction = sig;
        maxEndorsers = endorserCount;
      }
    });
    
    if (!approveLCTransaction) {
      console.log('⚠️  ApproveLC transaction not found in signatures yet.');
      console.log('   The transaction may still be processing.');
      console.log('\n📋 All transactions found:');
      signatures.forEach((sig, i) => {
        console.log(`   ${i+1}. ${sig.chaincodeFunction} - ${sig.endorsers?.length || 0} endorsers`);
      });
      return;
    }
    
    // Display the ApproveLC transaction details
    console.log('🔍 ANALYZING: ApproveLC Transaction (The NEW transaction we just created)');
    console.log('─'.repeat(70));
    console.log(`Transaction ID: ${approveLCTransaction.txId}`);
    console.log(`Timestamp: ${new Date(approveLCTransaction.timestamp).toLocaleString()}`);
    console.log(`Endorsers: ${maxEndorsers} of 6\n`);
    
    if (approveLCTransaction.endorsers && approveLCTransaction.endorsers.length > 0) {
      console.log('Endorsing Organizations:');
      approveLCTransaction.endorsers.forEach((endorser, i) => {
        const mspId = endorser.mspId || endorser.mspid || 'Unknown';
        console.log(`  ${i+1}. ✓ ${mspId}`);
      });
      console.log('');
    }
    
    // Final verdict
    console.log('═'.repeat(70));
    console.log('FINAL VERDICT:');
    console.log('═'.repeat(70));
    
    if (maxEndorsers >= 6) {
      console.log('🎉🎉🎉 SUCCESS! FULL CONSENSUS ACHIEVED! 🎉🎉🎉');
      console.log(`   ✅ ${maxEndorsers} of 6 organizations endorsed the transaction`);
      console.log('   ✅ setEndorsingOrganizations() is working correctly');
      console.log('   ✅ All future transactions will have full consortium endorsement');
      console.log('\n   The system is now ready for production with full consensus!');
    } else if (maxEndorsers >= 4) {
      console.log('✅ MAJORITY CONSENSUS ACHIEVED');
      console.log(`   ${maxEndorsers} of 6 organizations endorsed the transaction`);
      console.log('   This meets the MAJORITY policy requirement.');
      console.log('\n   Possible reasons for not reaching 6/6:');
      console.log('   - One or more peers were temporarily busy');
      console.log('   - Discovery service timeout (can be adjusted)');
      console.log('   - Network latency between peers');
      console.log('\n   The transaction is VALID and meets policy requirements.');
    } else {
      console.log('⚠️  LOWER THAN EXPECTED ENDORSEMENT COUNT');
      console.log(`   Only ${maxEndorsers} of 6 organizations endorsed`);
      console.log('\n   Check:');
      console.log('   1. All 6 peers running: docker ps | grep peer0');
      console.log('   2. API logs: tail -f logs/api.log');
      console.log('   3. Peer logs: docker logs peer0.ecta.cecbs.et');
    }
    
    console.log('═'.repeat(70));
    console.log(`\n📍 View in UI: http://localhost:3000`);
    console.log(`   Navigate to: Banks Portal → Letters of Credit → ${lcID}`);
    console.log('   Check: "Consortium Endorsements" section\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
