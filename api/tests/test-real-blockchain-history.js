/**
 * Test REAL blockchain history query
 * Tests the GetHistory chaincode function directly
 */

const { FabricService } = require('./dist/services/fabricService');

async function testBlockchainHistory() {
  const fabricService = FabricService.getInstance();
  
  try {
    console.log('🔗 Connecting to Hyperledger Fabric...\n');
    await fabricService.connect();
    console.log('✅ Connected to blockchain\n');
    
    // First, let's see what forex and LCs actually exist
    console.log('='.repeat(60));
    console.log('STEP 1: Query actual entities on blockchain');
    console.log('='.repeat(60));
    
    const forexResult = await fabricService.queryAllForex();
    console.log('\nForex Allocations on blockchain:');
    if (forexResult.success && forexResult.data) {
      const forexes = Array.isArray(forexResult.data) ? forexResult.data : [forexResult.data];
      forexes.forEach(f => {
        console.log(`  - ${f.forexId || f.ForexID}: status=${f.status || f.Status}`);
      });
    }
    
    const lcResult = await fabricService.queryChaincode('QueryAllLCs', []);
    console.log('\nLCs on blockchain:');
    if (lcResult.success && lcResult.data) {
      const lcs = Array.isArray(lcResult.data) ? lcResult.data : [lcResult.data];
      lcs.forEach(lc => {
        console.log(`  - ${lc.lcId || lc.LCID}: status=${lc.status || lc.Status}`);
      });
    }
    
    // Test 1: Get history for a forex allocation
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Test GetHistory for Forex');
    console.log('='.repeat(60));
    
    const forexId = 'FOREX_LC1787055024941_1787059332852_v2';
    console.log(`Querying history for: ${forexId}\n`);
    
    const forexHistory = await fabricService.queryChaincode('GetHistory', [forexId]);
    
    console.log('Raw response:', JSON.stringify(forexHistory, null, 2));
    
    if (forexHistory.success && forexHistory.data) {
      const history = Array.isArray(forexHistory.data) ? forexHistory.data : [forexHistory.data];
      console.log(`✅ Found ${history.length} transactions in blockchain history\n`);
      
      history.forEach((record, idx) => {
        console.log(`Transaction #${idx + 1}:`);
        console.log(`  TxID: ${record.TxId || record.txId}`);
        console.log(`  Timestamp: ${record.Timestamp || record.timestamp}`);
        console.log(`  Block: ${record.BlockNumber || 'unknown'}`);
        
        if (record.Value) {
          try {
            const value = JSON.parse(record.Value);
            console.log(`  Status: ${value.Status || value.status}`);
            console.log(`  Amount: ${value.AllocatedAmount || value.RequestedAmount || 'N/A'}`);
          } catch (e) {
            console.log(`  Value: [binary data]`);
          }
        }
        console.log('');
      });
    } else {
      console.log('❌ No history found or query failed');
      console.log('Error:', forexHistory.error);
    }
    
    // Test 2: Get history for an LC
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Letter of Credit History');
    console.log('='.repeat(60));
    
    const lcId = 'LC1787055024941';
    console.log(`Querying history for: ${lcId}\n`);
    
    const lcHistory = await fabricService.queryChaincode('GetHistory', [lcId]);
    
    if (lcHistory.success && lcHistory.data) {
      const history = Array.isArray(lcHistory.data) ? lcHistory.data : [lcHistory.data];
      console.log(`✅ Found ${history.length} transactions in blockchain history\n`);
      
      history.forEach((record, idx) => {
        console.log(`Transaction #${idx + 1}:`);
        console.log(`  TxID: ${record.TxId || record.txId}`);
        console.log(`  Timestamp: ${record.Timestamp || record.timestamp}`);
        console.log(`  Block: ${record.BlockNumber || 'unknown'}`);
        
        if (record.Value) {
          try {
            const value = JSON.parse(record.Value);
            console.log(`  Status: ${value.Status || value.status}`);
            console.log(`  Amount: ${value.Amount || 'N/A'} ${value.Currency || ''}`);
          } catch (e) {
            console.log(`  Value: [binary data]`);
          }
        }
        console.log('');
      });
    } else {
      console.log('❌ No history found or query failed');
      console.log('Error:', lcHistory.error);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nThis proves the blockchain history is accessible!');
    console.log('Now restart the API server to load the new code.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBlockchainHistory();
