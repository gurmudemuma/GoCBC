#!/usr/bin/env node

/**
 * Quick verification test for full consensus (6 endorsers)
 * Submits a new transaction and verifies endorsement count
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Use admin credentials to check existing data first
const ADMIN_CREDS = { username: 'admin', password: 'admin123' };

async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);
    console.log(`✅ Logged in as: ${credentials.username}`);
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${credentials.username}:`, error.response?.data || error.message);
    throw error;
  }
}

async function getExistingLCs(token) {
  try {
    const response = await axios.get(`${API_BASE}/banking/letters-of-credit`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Failed to get LCs:', error.response?.data || error.message);
    return [];
  }
}

async function requestNewLC(token, contractId) {
  try {
    const response = await axios.post(
      `${API_BASE}/exporters/contracts/${contractId}/request-lc`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ New LC Requested: ${response.data.lcId}`);
    return response.data.lcId;
  } catch (error) {
    console.error('❌ LC Request failed:', error.response?.data || error.message);
    return null;
  }
}

async function approveLC(token, lcId) {
  try {
    const response = await axios.post(
      `${API_BASE}/banking/letters-of-credit/${lcId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ LC Approved: ${lcId}`);
    return response.data;
  } catch (error) {
    console.error('❌ LC Approval failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getBlockchainSignatures(token, entityId) {
  try {
    const response = await axios.get(
      `${API_BASE}/blockchain-signatures/lc/${entityId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data || [];
  } catch (error) {
    console.error('Failed to get signatures:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('🧪 ENDORSEMENT VERIFICATION TEST\n');
  console.log('Testing if new transactions collect 6/6 endorsements...\n');
  
  try {
    // Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminToken = await login(ADMIN_CREDS);
    
    // Get existing LCs to find one we can work with
    console.log('\n2️⃣ Checking existing LCs...');
    const lcs = await getExistingLCs(adminToken);
    console.log(`Found ${lcs.length} existing LCs`);
    
    // Find a REQUESTED LC (not yet approved) or use the first one for demo
    let testLC = lcs.find(lc => lc.status === 'REQUESTED');
    
    if (!testLC) {
      console.log('\n⚠️  No REQUESTED LCs found. Let me try to create a new one...');
      
      // Try to request a new LC using an existing contract
      const existingContract = 'CONTRACT1788435011592'; // From your data
      const exporterToken = await login({ username: 'EXP8958382', password: 'password123' });
      
      const newLcId = await requestNewLC(exporterToken, existingContract);
      if (!newLcId) {
        console.log('\n❌ Could not create new LC. Please manually:');
        console.log('   1. Login to UI as exporter (EXP8958382)');
        console.log('   2. Request a new LC from an existing contract');
        console.log('   3. Login as bank user and approve it');
        console.log('   4. Check the endorsement count in the LC details');
        return;
      }
      
      testLC = { lcId: newLcId, status: 'REQUESTED' };
    }
    
    console.log(`\n3️⃣ Using LC: ${testLC.lcId} (status: ${testLC.status})`);
    
    // If it's REQUESTED, approve it to trigger a new blockchain transaction
    if (testLC.status === 'REQUESTED') {
      console.log('\n4️⃣ Approving LC to trigger blockchain transaction...');
      await approveLC(adminToken, testLC.lcId);
      
      console.log('\n5️⃣ Waiting 5 seconds for blockchain propagation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('\n4️⃣ LC already approved, checking existing signatures...');
    }
    
    // Get blockchain signatures
    console.log('\n6️⃣ Fetching blockchain signatures...');
    const signatures = await getBlockchainSignatures(adminToken, testLC.lcId);
    
    if (signatures.length === 0) {
      console.log('\n⚠️  No signatures found. Transaction may still be processing.');
      console.log('Try checking the LC details in the UI after a few seconds.');
      return;
    }
    
    console.log(`\nFound ${signatures.length} signature(s)\n`);
    
    // Analyze endorsements
    console.log('=' .repeat(70));
    console.log('📊 ENDORSEMENT ANALYSIS');
    console.log('=' .repeat(70));
    
    let hasFullConsensus = false;
    
    signatures.forEach((sig, index) => {
      console.log(`\n[${index + 1}] ${sig.chaincodeFunction || 'Unknown Function'}`);
      console.log(`    Transaction ID: ${sig.txId}`);
      console.log(`    Timestamp: ${new Date(sig.timestamp).toLocaleString()}`);
      
      if (sig.endorsers && sig.endorsers.length > 0) {
        const endorserCount = sig.endorsers.length;
        console.log(`    Endorsers: ${endorserCount} of 6`);
        
        sig.endorsers.forEach(endorser => {
          console.log(`      ✓ ${endorser.mspId || endorser.mspid || 'Unknown MSP'}`);
        });
        
        if (endorserCount >= 6) {
          console.log(`    🎉 FULL CONSENSUS ACHIEVED!`);
          hasFullConsensus = true;
        } else if (endorserCount >= 4) {
          console.log(`    ✅ Meets MAJORITY policy (4+ endorsers)`);
        } else {
          console.log(`    ⚠️  Partial consensus (${endorserCount} endorsers)`);
        }
      } else {
        console.log(`    ⚠️  No endorser data available`);
      }
    });
    
    console.log('\n' + '=' .repeat(70));
    
    if (hasFullConsensus) {
      console.log('✅ SUCCESS: Full consensus (6/6) is working!');
    } else {
      console.log('⚠️  NOTICE: Transaction has fewer than 6 endorsers.');
      console.log('   This could mean:');
      console.log('   - This is historical data from before the fix');
      console.log('   - One or more peers were unavailable');
      console.log('   - The setEndorsingOrganizations needs debugging');
    }
    
    console.log('\nℹ️  To test with a brand new transaction:');
    console.log('   1. Login to UI and request a NEW LC');
    console.log('   2. Approve it as a bank user');
    console.log('   3. Check the blockchain signatures section');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
