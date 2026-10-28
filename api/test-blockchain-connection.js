#!/usr/bin/env node

/**
 * GoCBC Blockchain Connection Test
 * 
 * Tests connection to Hyperledger Fabric network and verifies
 * that all blockchain operations are working correctly.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Fabric service (compiled TypeScript)
const { FabricService } = require('./dist/services/fabricService');

async function testBlockchainConnection() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  GoCBC BLOCKCHAIN CONNECTION TEST');
  console.log('════════════════════════════════════════════════════════════\n');
  
  const fabricService = FabricService.getInstance();
  let testsPass = 0;
  let testsFailed = 0;
  
  try {
    // ==================== Test 1: Connect to blockchain ====================
    console.log('Test 1: Connecting to blockchain as ECTA...');
    try {
      await fabricService.connect('ECTAMSP');
      console.log('✅ Connected successfully as ECTAMSP');
      console.log(`   Connection status: ${fabricService.isConnected()}\n`);
      testsPass++;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      testsFailed++;
      throw error; // Stop if connection fails
    }
    
    // ==================== Test 2: Query blockchain ====================
    console.log('Test 2: Querying all contracts...');
    try {
      const queryResult = await fabricService.queryChaincode('QueryAllContracts', []);
      if (queryResult.success) {
        const contracts = queryResult.data ? JSON.parse(queryResult.data) : [];
        console.log('✅ Query successful');
        console.log(`   Contracts found: ${contracts.length}`);
        if (contracts.length > 0) {
          console.log(`   Sample contract ID: ${contracts[0].contractId || contracts[0].id || 'N/A'}`);
        }
        testsPass++;
      } else {
        console.error('❌ Query failed:', queryResult.error);
        testsFailed++;
      }
      console.log('');
    } catch (error) {
      console.error('❌ Query error:', error.message);
      testsFailed++;
      console.log('');
    }
    
    // ==================== Test 3: Initialize ledger ====================
    console.log('Test 3: Invoking InitLedger...');
    try {
      const invokeResult = await fabricService.invokeChaincode('InitLedger', []);
      if (invokeResult.success) {
        console.log('✅ Invocation successful');
        console.log(`   Transaction ID: ${invokeResult.txId}`);
        console.log(`   Block number: ${invokeResult.ledgerDetails?.blockNumber || 'N/A'}`);
        console.log(`   Validation status: ${invokeResult.ledgerDetails?.validationStatus || 'N/A'}`);
        testsPass++;
      } else {
        console.error('❌ Invocation failed:', invokeResult.error);
        testsFailed++;
      }
      console.log('');
    } catch (error) {
      console.error('❌ Invocation error:', error.message);
      testsFailed++;
      console.log('');
    }
    
    // ==================== Test 4: Query after init ====================
    console.log('Test 4: Re-querying contracts after InitLedger...');
    try {
      const queryResult = await fabricService.queryChaincode('QueryAllContracts', []);
      if (queryResult.success) {
        const contracts = queryResult.data ? JSON.parse(queryResult.data) : [];
        console.log('✅ Query successful');
        console.log(`   Contracts found: ${contracts.length}`);
        testsPass++;
      } else {
        console.error('❌ Query failed:', queryResult.error);
        testsFailed++;
      }
      console.log('');
    } catch (error) {
      console.error('❌ Query error:', error.message);
      testsFailed++;
      console.log('');
    }
    
    // ==================== Test 5: Test Banks organization ====================
    console.log('Test 5: Testing Banks organization connection...');
    try {
      await fabricService.connectAsOrg('BanksMSP');
      console.log('✅ Connected as BanksMSP');
      
      const banksQuery = await fabricService.queryChaincode('QueryAllLCs', []);
      if (banksQuery.success) {
        const lcs = banksQuery.data ? JSON.parse(banksQuery.data) : [];
        console.log('✅ Banks query successful');
        console.log(`   L/Cs found: ${lcs.length}`);
        testsPass++;
      } else {
        console.error('❌ Banks query failed:', banksQuery.error);
        testsFailed++;
      }
      console.log('');
    } catch (error) {
      console.error('❌ Banks connection error:', error.message);
      testsFailed++;
      console.log('');
    }
    
    // ==================== Test 6: Query shipments ====================
    console.log('Test 6: Querying all shipments...');
    try {
      await fabricService.connect('ECTAMSP');
      const shipmentsQuery = await fabricService.queryChaincode('QueryAllShipments', []);
      if (shipmentsQuery.success) {
        const shipments = shipmentsQuery.data ? JSON.parse(shipmentsQuery.data) : [];
        console.log('✅ Shipments query successful');
        console.log(`   Shipments found: ${shipments.length}`);
        testsPass++;
      } else {
        console.error('❌ Shipments query failed:', shipmentsQuery.error);
        testsFailed++;
      }
      console.log('');
    } catch (error) {
      console.error('❌ Shipments query error:', error.message);
      testsFailed++;
      console.log('');
    }
    
    // ==================== Test 7: Query payments ====================
    console.log('Test 7: Querying all payments...');
    try {
      const paymentsQuery = await fabricService.queryChaincode('QueryAllPayments', []);
      if (paymentsQuery.success) {
        const payments = paymentsQuery.data ? JSON.parse(paymentsQuery.data) : [];
        console.log('✅ Payments query successful');
        console.log(`   Payments found: ${payments.length}`);
        testsPass++;
      } else {
        console.error('❌ Payments query failed:', paymentsQuery.error);
        testsFailed++;
      }
      console.log('');
    } catch (error) {
      console.error('❌ Payments query error:', error.message);
      testsFailed++;
      console.log('');
    }
    
    // ==================== Summary ====================
    console.log('════════════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`✅ Tests passed: ${testsPass}`);
    console.log(`❌ Tests failed: ${testsFailed}`);
    console.log(`📊 Success rate: ${Math.round((testsPass / (testsPass + testsFailed)) * 100)}%`);
    console.log('════════════════════════════════════════════════════════════\n');
    
    if (testsFailed === 0) {
      console.log('🎉 All blockchain tests passed!');
      console.log('Your backend is ready to integrate with the blockchain.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    try {
      await fabricService.disconnect();
      console.log('✅ Disconnected from blockchain\n');
    } catch (error) {
      console.error('Error disconnecting:', error.message);
    }
  }
}

// Run tests
console.log('\nStarting blockchain connection tests...\n');
testBlockchainConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
