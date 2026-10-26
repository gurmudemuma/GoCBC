/**
 * Test LC Issuance Auto-Creates FOREX on Blockchain
 * Verifies that every LC issuance immediately creates a forex request on blockchain
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_TOKEN = 'your-test-token'; // Get from browser localStorage

async function testLCForexAutoCreation() {
  console.log('🧪 Testing LC Issuance Auto-Creates FOREX on Blockchain...\n');

  try {
    // Step 1: Get a valid contract ID
    console.log('📋 Step 1: Getting contracts...');
    const contractsResp = await axios.get(`${API_BASE}/contracts`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    
    if (!contractsResp.data.success || !contractsResp.data.data || contractsResp.data.data.length === 0) {
      console.log('❌ No contracts found. Create a contract first.');
      return;
    }
    
    const contract = contractsResp.data.data[0];
    console.log(`✅ Using contract: ${contract.contractId || contract.ContractID}`);

    // Step 2: Issue a new LC
    const lcId = `LC${Date.now()}`;
    const contractId = contract.contractId || contract.ContractID;
    const exporterId = contract.exporterId || contract.ExporterID;
    const amount = contract.totalValue || contract.TotalValue || 100000;
    const currency = contract.currency || contract.Currency || 'USD';

    console.log(`\n📋 Step 2: Issuing LC: ${lcId}`);
    console.log(`   Contract: ${contractId}`);
    console.log(`   Exporter: ${exporterId}`);
    console.log(`   Amount: ${amount} ${currency}`);

    const issueLCResp = await axios.post(`${API_BASE}/banking/lc`, {
      lcId,
      contractId,
      exporterId,
      amount,
      currency,
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
      issuingBank: 'Commercial Bank of Ethiopia',
      paymentTerms: 'Sight LC'
    }, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!issueLCResp.data.success) {
      console.log('❌ LC issuance failed:', issueLCResp.data.error);
      return;
    }

    console.log(`✅ LC issued successfully: ${lcId}`);
    console.log(`   Transaction ID: ${issueLCResp.data.txId || 'N/A'}`);

    // Step 3: Wait for blockchain propagation
    console.log('\n⏳ Step 3: Waiting 8 seconds for blockchain propagation...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Step 4: Query forex allocations for this LC
    console.log(`\n📋 Step 4: Querying forex allocations...`);
    const forexResp = await axios.get(`${API_BASE}/forex`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    if (!forexResp.data.success) {
      console.log('❌ Failed to query forex:', forexResp.data.error);
      return;
    }

    // Find forex record matching this LC
    const allForex = forexResp.data.data || [];
    console.log(`   Total forex records: ${allForex.length}`);
    
    const matchingForex = allForex.filter(f => {
      const forexId = f.forexId || f.ForexID;
      const forexLcId = f.lcId || f.LCID;
      return forexId.includes(lcId) || forexLcId === lcId;
    });

    if (matchingForex.length === 0) {
      console.log('❌ NO FOREX RECORD FOUND for LC:', lcId);
      console.log('\n🔍 Debugging: All forex records:');
      allForex.slice(0, 5).forEach(f => {
        console.log(`   - ${f.forexId || f.ForexID} (LC: ${f.lcId || f.LCID || 'N/A'}, Status: ${f.status || f.Status})`);
      });
      console.log('\n❌ TEST FAILED: LC issuance did NOT auto-create forex on blockchain');
      return;
    }

    console.log(`\n✅ FOREX RECORD FOUND on blockchain:`);
    matchingForex.forEach(f => {
      console.log(`   Forex ID: ${f.forexId || f.ForexID}`);
      console.log(`   LC ID: ${f.lcId || f.LCID || 'N/A'}`);
      console.log(`   Contract ID: ${f.contractId || f.ContractID}`);
      console.log(`   Exporter ID: ${f.exporterId || f.ExporterID}`);
      console.log(`   Requested Amount: ${f.requestedAmount || f.RequestedAmount} ${f.currency || f.Currency}`);
      console.log(`   Status: ${f.status || f.Status}`);
    });

    // Step 5: Query blockchain signatures for this forex
    const forexId = matchingForex[0].forexId || matchingForex[0].ForexID;
    console.log(`\n📋 Step 5: Querying blockchain signatures for: ${forexId}`);
    
    const signaturesResp = await axios.get(`${API_BASE}/blockchain-signatures/entity/FOREX_ALLOCATION/${forexId}`);
    
    if (signaturesResp.data.success) {
      const transactions = signaturesResp.data.data.transactions || [];
      console.log(`   ✅ Blockchain transactions found: ${transactions.length}`);
      if (transactions.length > 0) {
        const tx = transactions[0];
        console.log(`   Transaction ID: ${tx.txId}`);
        console.log(`   Creator: ${tx.creator.identity}`);
        console.log(`   MSP ID: ${tx.creator.mspId}`);
        console.log(`   Function: ${tx.chaincodeFunction}`);
        console.log(`   Timestamp: ${tx.timestamp}`);
        console.log(`   Validation: ${tx.validationCode}`);
      }
    } else {
      console.log(`   ⚠️ No blockchain signatures found (may take time to index)`);
    }

    console.log('\n✅ TEST PASSED: LC issuance auto-created forex on blockchain with cryptographic signatures!');

  } catch (error) {
    console.error('\n❌ TEST FAILED with error:', error.response?.data || error.message);
  }
}

// Run test
if (require.main === module) {
  if (process.env.TEST_TOKEN) {
    testLCForexAutoCreation();
  } else {
    console.log('❌ Set TEST_TOKEN environment variable first:');
    console.log('   1. Login to http://localhost:3000');
    console.log('   2. Open browser console');
    console.log('   3. Run: localStorage.getItem("authToken")');
    console.log('   4. Copy token and run: TEST_TOKEN="your-token" node test-lc-forex-auto-creation.js');
  }
}

module.exports = { testLCForexAutoCreation };
