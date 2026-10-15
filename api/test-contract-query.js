#!/usr/bin/env node

/**
 * Test script to verify contract querying from blockchain
 */

const { FabricService } = require('./dist/services/fabricService');

async function testContractQuery() {
  console.log('=== Testing Contract Query ===\n');
  
  const fabricService = FabricService.getInstance();
  const exporterId = 'exp001'; // The test exporter
  
  try {
    console.log(`1. Testing QueryContractsByExporter for: ${exporterId}`);
    const result = await fabricService.queryContracts({ exporterId });
    
    console.log('\n2. Query Result:');
    console.log('   Success:', result.success);
    console.log('   Data:', JSON.stringify(result.data, null, 2));
    console.log('   Error:', result.error);
    
    if (result.success && result.data) {
      console.log(`\n3. Found ${result.data.length} contracts`);
      result.data.forEach((contract, index) => {
        console.log(`\n   Contract ${index + 1}:`);
        console.log(`   - ID: ${contract.contractId || contract.ContractID}`);
        console.log(`   - Exporter: ${contract.exporterId || contract.ExporterID}`);
        console.log(`   - Buyer: ${contract.buyerId || contract.BuyerID}`);
        console.log(`   - Status: ${contract.status || contract.Status}`);
      });
    } else {
      console.log('\n❌ No contracts found or query failed');
      console.log('Error details:', result.error);
    }
    
    // Test general query
    console.log('\n4. Testing general GetAllContracts query...');
    const allResult = await fabricService.invokeChaincode('GetAllContracts', []);
    console.log('   Success:', allResult.success);
    console.log('   Total contracts:', allResult.data ? allResult.data.length : 0);
    
  } catch (error) {
    console.error('\n❌ Error testing contract query:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testContractQuery();
