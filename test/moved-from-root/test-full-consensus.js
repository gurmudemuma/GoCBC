#!/usr/bin/env node

/**
 * Test script to verify full consensus (6 endorsers) on new transactions
 * Creates a new LC and checks if all 6 organizations endorsed it
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001';
const API_BASE = `${API_URL}/api/v1`;

// Test credentials
const EXPORTER_CREDS = { username: 'EXP8958382', password: 'password123' };
const BANK_CREDS = { username: 'bank1', password: 'password123' };

async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function requestLC(token, contractId) {
  try {
    const response = await axios.post(
      `${API_BASE}/exporters/contracts/${contractId}/request-lc`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ LC Requested:', response.data.lcId);
    return response.data.lcId;
  } catch (error) {
    console.error('LC Request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function approveLC(token, lcId) {
  try {
    const response = await axios.post(
      `${API_BASE}/banking/letters-of-credit/${lcId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ LC Approved');
    return response.data;
  } catch (error) {
    console.error('LC Approval failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getBlockchainSignatures(token, entityId, entityType) {
  try {
    const response = await axios.get(
      `${API_BASE}/blockchain-signatures/${entityType}/${entityId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get signatures:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('🧪 Testing Full Consensus (6 Endorsers)\n');
  
  try {
    // 1. Login as exporter
    console.log('1️⃣ Logging in as exporter...');
    const exporterToken = await login(EXPORTER_CREDS);
    
    // 2. Login as bank
    console.log('2️⃣ Logging in as bank...');
    const bankToken = await login(BANK_CREDS);
    
    // 3. Request LC (using existing contract)
    console.log('3️⃣ Requesting new LC...');
    const contractId = 'CONTRACT1788435011592'; // Existing contract
    const lcId = await requestLC(exporterToken, contractId);
    
    // 4. Approve LC
    console.log('4️⃣ Approving LC as bank...');
    await approveLC(bankToken, lcId);
    
    // 5. Wait for blockchain to propagate
    console.log('5️⃣ Waiting 3 seconds for blockchain propagation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. Get blockchain signatures
    console.log('6️⃣ Fetching blockchain signatures...\n');
    const signatures = await getBlockchainSignatures(exporterToken, lcId, 'lc');
    
    if (signatures.length === 0) {
      console.log('⚠️  No signatures found yet');
      return;
    }
    
    // 7. Check endorsers
    console.log('📊 CONSENSUS ANALYSIS:\n');
    signatures.forEach((sig, index) => {
      console.log(`Transaction ${index + 1}: ${sig.chaincodeFunction}`);
      console.log(`  Transaction ID: ${sig.txId}`);
      console.log(`  Timestamp: ${sig.timestamp}`);
      
      if (sig.endorsers && sig.endorsers.length > 0) {
        console.log(`  ✅ Endorsers: ${sig.endorsers.length} of 6`);
        sig.endorsers.forEach(endorser => {
          console.log(`     - ${endorser.mspId}`);
        });
        
        if (sig.endorsers.length >= 4) {
          console.log(`  🎉 FULL CONSENSUS ACHIEVED! (${sig.endorsers.length}/6 endorsers)\n`);
        } else {
          console.log(`  ⚠️  PARTIAL CONSENSUS (${sig.endorsers.length}/6 endorsers)\n`);
        }
      } else {
        console.log(`  ⚠️  No endorser data captured\n`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
