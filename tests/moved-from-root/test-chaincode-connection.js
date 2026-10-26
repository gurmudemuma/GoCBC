#!/usr/bin/env node
// Test chaincode connection from API

const { FabricService } = require('./api/dist/services/fabricService');

async function testChaincode() {
  console.log('🧪 Testing chaincode connection...\n');
  
  try {
    const fabricService = FabricService.getInstance();
    
    // Test simple read operation
    console.log('1. Testing QueryAllContracts (read operation)...');
    const result = await fabricService.queryAllSalesContracts();
    
    if (result.success) {
      console.log(`✅ Chaincode connection SUCCESS!`);
      console.log(`   Found ${result.data?.length || 0} contracts`);
      console.log(`   Blockchain is WORKING!\n`);
      process.exit(0);
    } else {
      console.log(`❌ Query failed: ${result.error}`);
      console.log(`   Chaincode may not be running\n`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log(`   Chaincode is NOT accessible\n`);
    process.exit(1);
  }
}

testChaincode();
