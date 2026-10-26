/**
 * TEST: Create a NEW AllocateForex transaction NOW
 * to verify it gets 6 endorsers (not just ApproveLC)
 */

const axios = require('axios');
const { DatabaseService } = require('./api/dist/services/databaseService');

const API_BASE = 'http://localhost:3001/api/v1';

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TEST: AllocateForex with 6-Endorser System              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    // Login as admin (has all permissions)
    console.log('🔐 Logging in as admin...\n');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Logged in successfully\n');
    
    // Find an APPROVED LC without forex allocation
    console.log('🔍 Finding an APPROVED LC to allocate forex...\n');
    
    const lcsResponse = await axios.get(`${API_BASE}/banking/lc?status=APPROVED`, { headers });
    const lcs = lcsResponse.data.data || [];
    
    const lcWithoutForex = lcs.find(lc => !lc.forexId);
    
    if (!lcWithoutForex) {
      console.log('⚠️  No APPROVED LCs without forex found');
      console.log('   Creating a test LC first...\n');
      
      // Need to create test data - skip for now
      console.log('⚠️  Test requires manual LC creation first');
      console.log('   Please approve an LC in the UI, then run this test\n');
      process.exit(0);
    }
    
    console.log(`📋 Found LC: ${lcWithoutForex.lcId}`);
    console.log(`   Amount: $${lcWithoutForex.amount}`);
    console.log(`   Exporter: ${lcWithoutForex.exporterId}\n`);
    
    // Allocate forex
    console.log('💰 Allocating forex (this should get 6 endorsers)...\n');
    
    const forexData = {
      forexId: `FOREX_${lcWithoutForex.lcId}_${Date.now()}`,
      lcId: lcWithoutForex.lcId,
      amount: lcWithoutForex.amount,
      exchangeRate: 115.50,
      retentionRate: 40,
      officer: 'NBE Forex Officer',
      approvalRef: `NBE-FOREX-TEST-${Date.now()}`,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days
    };
    
    const allocateResponse = await axios.post(
      `${API_BASE}/forex/allocate`,
      forexData,
      { headers }
    );
    
    if (allocateResponse.data.success) {
      const result = allocateResponse.data.data;
      console.log('✅ Forex allocated successfully!\n');
      console.log(`   Forex ID: ${result.forexId}`);
      console.log(`   Blockchain TX: ${result.blockchainTxId?.substring(0, 30)}...\n`);
      
      // Wait a moment for database to update
      console.log('⏳ Waiting 3 seconds for blockchain sync...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check endorsers in database
      console.log('🔍 Checking endorsers in PostgreSQL...\n');
      
      const db = DatabaseService.getInstance();
      const endorsers = await db.all(
        `SELECT signer_org FROM blockchain_signatures 
         WHERE blockchain_tx_id = $1 
         ORDER BY signer_org`,
        [result.blockchainTxId]
      );
      
      console.log(`🏛️  ENDORSERS: ${endorsers.length}/6\n`);
      
      if (endorsers.length === 6) {
        console.log('✅ ALL 6 CONSORTIUM MEMBERS ENDORSED:\n');
        endorsers.forEach((e, i) => {
          console.log(`   ${i + 1}. ${e.signer_org}`);
        });
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  ✅ SUCCESS: AllocateForex gets 6 endorsers! ✅          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');
      } else {
        console.log('⚠️  ENDORSERS FOUND:\n');
        endorsers.forEach((e, i) => {
          console.log(`   ${i + 1}. ${e.signer_org}`);
        });
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  ❌ ISSUE: Only ' + endorsers.length + ' endorsers (expected 6)               ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');
      }
      
    } else {
      console.log('❌ Forex allocation failed:', allocateResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.response?.data || error.message);
  }
}

main();
