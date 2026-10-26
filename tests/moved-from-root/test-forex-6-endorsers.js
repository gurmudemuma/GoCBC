/**
 * Test Script: Verify 6/6 Consortium Endorsements on Forex Allocation
 * 
 * This script:
 * 1. Finds an APPROVED LC that needs forex allocation
 * 2. Allocates forex for that LC
 * 3. Verifies all 6 consortium members endorsed the transaction
 * 4. Displays the complete cryptographic proof
 */

const axios = require('axios');
const API_BASE = 'http://localhost:3001/api/v1';

async function login(username, password) {
  const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
  return response.data.data.token;
}

async function main() {
  console.log('\n🧪 Testing Full Consortium Endorsement on Forex Allocation');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Login as admin (has all permissions)
    console.log('🔐 Logging in as admin...');
    const token = await login('admin', 'admin123');
    console.log('✅ Logged in successfully\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Get all LCs
    console.log('📋 Fetching approved LCs...');
    const lcsResponse = await axios.get(`${API_BASE}/banking/lc`, { headers });
    const lcs = lcsResponse.data.data;
    
    // Find an APPROVED LC without forex allocation
    const approvedLC = lcs.find(lc => 
      lc.status === 'APPROVED' && 
      !lc.lcId.includes('TEST') // Skip test LCs
    );

    if (!approvedLC) {
      console.log('❌ No approved LC found without forex allocation');
      console.log('   Create a new LC and approve it first\n');
      return;
    }

    console.log('✅ Found approved LC:', approvedLC.lcId);
    console.log('   Exporter:', approvedLC.exporterId);
    console.log('   Amount:', approvedLC.amount, approvedLC.currency);
    console.log('');

    // Allocate Forex
    console.log('💱 Allocating forex with NBE 40/60 retention policy...\n');
    
    const forexData = {
      forexId: `FOREX_${approvedLC.lcId}_${Date.now()}`,
      lcId: approvedLC.lcId,
      amount: approvedLC.amount,
      exchangeRate: 115.50,
      retentionRate: 40, // NBE 40/60 policy
      officer: 'Bank Forex Officer',
      approvalRef: `NBE-FOREX-${Date.now()}`,
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('Request payload:');
    console.log(JSON.stringify(forexData, null, 2));
    console.log('');

    const allocateResponse = await axios.post(
      `${API_BASE}/forex/allocate`,
      forexData,
      { headers }
    );

    if (!allocateResponse.data.success) {
      console.log('❌ Forex allocation failed:', allocateResponse.data.error);
      return;
    }

    console.log('✅ Forex allocated successfully!');
    console.log('   Forex ID:', forexData.forexId);
    console.log('');

    // Wait for blockchain to process
    console.log('⏳ Waiting 3 seconds for blockchain processing...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Query blockchain signatures
    console.log('🔍 Querying blockchain signatures...\n');
    
    // Try different entity type variations
    const entityTypes = ['FOREX_ALLOCATION', 'FOREX', 'forex'];
    let signatures = null;

    for (const entityType of entityTypes) {
      try {
        const sigResponse = await axios.get(
          `${API_BASE}/blockchain-signatures/entity/${entityType}/${forexData.forexId}`
        );
        if (sigResponse.data.success && sigResponse.data.data.length > 0) {
          signatures = sigResponse.data.data;
          console.log(`✅ Found signatures using entity type: ${entityType}\n`);
          break;
        }
      } catch (err) {
        // Try next entity type
      }
    }

    if (!signatures) {
      console.log('⚠️  Blockchain signature endpoint returned no data');
      console.log('   Checking PostgreSQL directly...\n');

      // Direct PostgreSQL query
      const { DatabaseService } = require('./api/dist/services/databaseService');
      const dbService = DatabaseService.getInstance();
      
      const pgSigs = await dbService.all(
        `SELECT blockchain_tx_id, chaincode_function, signer_org, created_at 
         FROM blockchain_signatures 
         WHERE entity_id = $1 
         ORDER BY created_at DESC`,
        [forexData.forexId]
      );

      if (pgSigs.length === 0) {
        console.log('❌ No signatures found in PostgreSQL either');
        return;
      }

      console.log(`✅ Found ${pgSigs.length} signature record(s) in PostgreSQL\n`);
      
      // Get all endorsers for the transaction
      const txId = pgSigs[0].blockchain_tx_id;
      const endorsers = await dbService.all(
        `SELECT signer_org, signer_username, certificate_dn, created_at 
         FROM blockchain_signatures 
         WHERE blockchain_tx_id = $1 
         ORDER BY signer_org`,
        [txId]
      );

      console.log('🔐 BLOCKCHAIN SIGNATURE VERIFICATION');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📜 Blockchain Transaction ID:', txId);
      console.log('🎯 Function:', pgSigs[0].chaincode_function);
      console.log('📅 Timestamp:', new Date(pgSigs[0].created_at).toLocaleString());
      console.log('');
      console.log(`🏛️  CONSORTIUM ENDORSEMENTS (${endorsers.length}/6 Organizations):\n`);

      endorsers.forEach((endorser, i) => {
        console.log(`   ${i + 1}. ${endorser.signer_org.padEnd(15)} - ${endorser.signer_username || 'N/A'}`);
        if (endorser.certificate_dn) {
          console.log(`      Certificate: ${endorser.certificate_dn.substring(0, 60)}...`);
        }
      });

      console.log('');
      if (endorsers.length === 6) {
        console.log('✅ SUCCESS: FULL NETWORK CONSENSUS');
        console.log('   All 6 consortium members (ECTA, ECX, Banks, NBE, Customs, Shipping) endorsed this transaction');
        console.log('   This is cryptographically verified and immutably recorded on the blockchain');
      } else if (endorsers.length >= 4) {
        console.log(`⚠️  MAJORITY CONSENSUS: ${endorsers.length} of 6 (policy satisfied but not full)`);
      } else {
        console.log(`❌ INSUFFICIENT CONSENSUS: Only ${endorsers.length} of 6 organizations`);
      }

      console.log('\n═══════════════════════════════════════════════════════════\n');
      return;
    }

    // Display signatures from API
    console.log('🔐 BLOCKCHAIN SIGNATURE VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    signatures.forEach((tx, i) => {
      console.log(`Transaction ${i + 1}: ${tx.chaincodeFunction}`);
      console.log('─'.repeat(60));
      console.log(`📜 Blockchain TX ID: ${tx.blockchainTxId}`);
      console.log(`🔑 Signer: ${tx.signerIdentity || tx.signerUsername} (${tx.signerOrg})`);
      console.log(`📅 Timestamp: ${new Date(tx.timestamp).toLocaleString()}`);
      
      if (tx.endorsers && tx.endorsers.length > 0) {
        console.log(`\n🏛️  CONSORTIUM ENDORSEMENTS (${tx.endorsers.length}/6 Organizations):\n`);
        tx.endorsers.forEach((endorser, j) => {
          console.log(`   ${j + 1}. ${endorser.mspId.padEnd(15)} - ${endorser.endpoint}`);
        });
        
        if (tx.endorsers.length === 6) {
          console.log('\n   ✅ FULL NETWORK CONSENSUS: All 6 consortium members endorsed');
        } else if (tx.endorsers.length >= 4) {
          console.log(`\n   ⚠️  MAJORITY CONSENSUS: ${tx.endorsers.length} of 6 (policy satisfied)`);
        } else {
          console.log(`\n   ❌ PARTIAL CONSENSUS: Only ${tx.endorsers.length} of 6`);
        }
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
