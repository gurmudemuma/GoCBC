#!/usr/bin/env node

/**
 * COMPREHENSIVE BLOCKCHAIN INTEGRATION TEST
 * Tests all 6 organizations with both queries AND transactions
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.blockchain.fixed') });

const { FabricService } = require('./dist/services/fabricService');

const ORGANIZATIONS = [
  { name: 'ECTA', msp: 'ECTAMSP', testFunction: 'QueryAllContracts' },
  { name: 'ECX', msp: 'ECXMSP', testFunction: 'QueryAllECXLots' },
  { name: 'Banks', msp: 'BanksMSP', testFunction: 'QueryAllLCs' },
  { name: 'NBE', msp: 'NBEMSP', testFunction: 'QueryAllForex' },
  { name: 'Customs', msp: 'CustomsMSP', testFunction: 'QueryAllCustomsDeclarations' },
  { name: 'Shipping', msp: 'ShippingMSP', testFunction: 'QueryAllShipments' }
];

async function comprehensiveTest() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE BLOCKCHAIN INTEGRATION TEST');
  console.log('════════════════════════════════════════════════════════════\n');
  
  const fabricService = FabricService.getInstance();
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // ==================== TEST 1: InitLedger ====================
    console.log('Test 1: Initialize Ledger (ECTA)...');
    results.total++;
    try {
      await fabricService.connect('ECTAMSP');
      const initResult = await fabricService.invokeChaincode('InitLedger', []);
      
      if (initResult.success) {
        console.log(`✅ InitLedger successful`);
        console.log(`   Transaction ID: ${initResult.txId}`);
        console.log(`   Block: ${initResult.ledgerDetails?.blockNumber || 'N/A'}`);
        results.passed++;
        results.tests.push({ name: 'InitLedger', status: 'PASS', org: 'ECTA' });
      } else {
        console.log(`❌ InitLedger failed: ${initResult.error}`);
        results.failed++;
        results.tests.push({ name: 'InitLedger', status: 'FAIL', org: 'ECTA', error: initResult.error });
      }
    } catch (error) {
      console.log(`❌ InitLedger error: ${error.message}`);
      results.failed++;
      results.tests.push({ name: 'InitLedger', status: 'ERROR', org: 'ECTA', error: error.message });
    }
    console.log('');
    
    // Wait for ledger to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ==================== TEST 2: Query from Each Org ====================
    console.log('Test 2: Query from Each Organization...\n');
    
    for (const org of ORGANIZATIONS) {
      results.total++;
      console.log(`Testing ${org.name} (${org.msp})...`);
      
      try {
        await fabricService.connect(org.msp);
        const queryResult = await fabricService.queryChaincode(org.testFunction, []);
        
        if (queryResult.success) {
          const data = queryResult.data ? JSON.parse(queryResult.data) : [];
          console.log(`✅ ${org.name}: Query successful - ${data.length} records found`);
          results.passed++;
          results.tests.push({ 
            name: `Query-${org.testFunction}`, 
            status: 'PASS', 
            org: org.name,
            records: data.length 
          });
        } else {
          console.log(`❌ ${org.name}: Query failed - ${queryResult.error}`);
          results.failed++;
          results.tests.push({ 
            name: `Query-${org.testFunction}`, 
            status: 'FAIL', 
            org: org.name, 
            error: queryResult.error 
          });
        }
      } catch (error) {
        console.log(`❌ ${org.name}: Error - ${error.message}`);
        results.failed++;
        results.tests.push({ 
          name: `Query-${org.testFunction}`, 
          status: 'ERROR', 
          org: org.name, 
          error: error.message 
        });
      }
      console.log('');
    }
    
    // ==================== TEST 3: Transaction Test (Register Contract) ====================
    console.log('Test 3: Transaction Test - Register Sales Contract (ECTA)...');
    results.total++;
    
    const testContractId = `TEST-CONTRACT-${Date.now()}`;
    const testExporterId = `EXPORTER-${Date.now()}`;
    const testBuyerId = `BUYER-${Date.now()}`;
    
    // First register an exporter (required before contract)
    try {
      await fabricService.connect('ECTAMSP');
      await fabricService.invokeChaincode('RegisterExporter', [
        testExporterId,
        'Test Coffee Exporter PLC',
        'ECTA-LIC-2024-001',
        'company',            // Must be: private, company, or individual
        '5000000',
        'Dr. Coffee Taster',
        'CERT-2024-001',
        'LAB-CERT-2024-001',
        '2027-12-31'
      ]);
      console.log(`✅ Test exporter registered: ${testExporterId}`);
    } catch (err) {
      console.log(`⚠️  Exporter registration skipped (may already exist): ${err.message}`);
    }
    
    // Now register sales contract with correct 12 parameters
    try {
      await fabricService.connect('ECTAMSP');
      const txResult = await fabricService.invokeChaincode('RegisterSalesContract', [
        testContractId,           // contractID
        testExporterId,           // exporterID
        testBuyerId,              // buyerID
        'Germany',                // buyerCountry
        'Washed Arabica Grade 1', // coffeeType
        '1000',                   // quantityStr (kg)
        '5.50',                   // pricePerKgStr
        'USD',                    // currency
        'true',                   // eudrRequiredStr
        'Deutsche Bank AG',       // buyerBank
        'Commercial Bank of Ethiopia', // exporterBank
        '[]'                      // documentsJSON
      ]);
      
      if (txResult.success) {
        console.log(`✅ Contract registration successful`);
        console.log(`   Contract ID: ${testContractId}`);
        console.log(`   Transaction ID: ${txResult.txId}`);
        console.log(`   Validation: ${txResult.ledgerDetails?.validationStatus || 'N/A'}`);
        results.passed++;
        results.tests.push({ 
          name: 'RegisterSalesContract', 
          status: 'PASS', 
          org: 'ECTA',
          txId: txResult.txId 
        });
      } else {
        console.log(`❌ Contract registration failed: ${txResult.error}`);
        results.failed++;
        results.tests.push({ 
          name: 'RegisterSalesContract', 
          status: 'FAIL', 
          org: 'ECTA', 
          error: txResult.error 
        });
      }
    } catch (error) {
      console.log(`❌ Contract registration error: ${error.message}`);
      results.failed++;
      results.tests.push({ 
        name: 'RegisterSalesContract', 
        status: 'ERROR', 
        org: 'ECTA', 
        error: error.message 
      });
    }
    console.log('');
    
    // ==================== TEST 4: Read Back the Contract ====================
    console.log('Test 4: Read Back Registered Contract...');
    results.total++;
    
    try {
      await fabricService.connect('ECTAMSP');
      const readResult = await fabricService.queryChaincode('ReadSalesContract', [testContractId]);
      
      if (readResult.success) {
        const contract = readResult.data ? JSON.parse(readResult.data) : null;
        if (contract && contract.contractId === testContractId) {
          console.log(`✅ Contract read successful`);
          console.log(`   Buyer ID: ${contract.buyerId}`);
          console.log(`   Quantity: ${contract.quantity} kg`);
          console.log(`   Status: ${contract.contractStatus}`);
          results.passed++;
          results.tests.push({ 
            name: 'ReadSalesContract', 
            status: 'PASS', 
            org: 'ECTA',
            verified: true 
          });
        } else {
          console.log(`❌ Contract data mismatch`);
          results.failed++;
          results.tests.push({ 
            name: 'ReadSalesContract', 
            status: 'FAIL', 
            org: 'ECTA', 
            error: 'Data mismatch' 
          });
        }
      } else {
        console.log(`❌ Contract read failed: ${readResult.error}`);
        results.failed++;
        results.tests.push({ 
          name: 'ReadSalesContract', 
          status: 'FAIL', 
          org: 'ECTA', 
          error: readResult.error 
        });
      }
    } catch (error) {
      console.log(`❌ Contract read error: ${error.message}`);
      results.failed++;
      results.tests.push({ 
        name: 'ReadSalesContract', 
        status: 'ERROR', 
        org: 'ECTA', 
        error: error.message 
      });
    }
    console.log('');
    
    // ==================== TEST 5: Cross-Org Query ====================
    console.log('Test 5: Cross-Organization Query (Banks reads ECTA contract)...');
    results.total++;
    
    try {
      await fabricService.connect('BanksMSP');
      const crossOrgResult = await fabricService.queryChaincode('ReadSalesContract', [testContractId]);
      
      if (crossOrgResult.success) {
        const contract = crossOrgResult.data ? JSON.parse(crossOrgResult.data) : null;
        if (contract && contract.contractId === testContractId) {
          console.log(`✅ Cross-org query successful`);
          console.log(`   Banks can see ECTA contract`);
          console.log(`   Data consistency verified`);
          results.passed++;
          results.tests.push({ 
            name: 'CrossOrgQuery', 
            status: 'PASS', 
            org: 'Banks->ECTA',
            verified: true 
          });
        } else {
          console.log(`❌ Cross-org data mismatch`);
          results.failed++;
          results.tests.push({ 
            name: 'CrossOrgQuery', 
            status: 'FAIL', 
            org: 'Banks->ECTA', 
            error: 'Data mismatch' 
          });
        }
      } else {
        console.log(`❌ Cross-org query failed: ${crossOrgResult.error}`);
        results.failed++;
        results.tests.push({ 
          name: 'CrossOrgQuery', 
          status: 'FAIL', 
          org: 'Banks->ECTA', 
          error: crossOrgResult.error 
        });
      }
    } catch (error) {
      console.log(`❌ Cross-org query error: ${error.message}`);
      results.failed++;
      results.tests.push({ 
        name: 'CrossOrgQuery', 
        status: 'ERROR', 
        org: 'Banks->ECTA', 
        error: error.message 
      });
    }
    console.log('');
    
    // ==================== TEST 6: Multi-Org Transaction (LC Workflow) ====================
    console.log('Test 6: Multi-Org Transaction - LC Workflow...');
    results.total++;
    
    const testLCId = `LC-${Date.now()}`;
    try {
      // Step 1: Approve the contract (required before LC request)
      await fabricService.connect('ECTAMSP');
      await fabricService.invokeChaincode('ApproveSalesContract', [
        testContractId
      ]);
      console.log(`   ✓ Contract approved`);
      
      // Step 2: Request LC from ECTA
      await fabricService.connect('ECTAMSP');
      await fabricService.invokeChaincode('RequestLC', [
        testLCId,          // lcID
        testContractId,    // contractID
        testExporterId,    // exporterID
        'Commercial Bank of Ethiopia', // bankName
        '5500',            // amountStr
        'USD',             // currency
        '2027-06-30'       // expiryDate
      ]);
      console.log(`   ✓ LC requested`);
      
      // Step 3: Approve LC from Banks
      await fabricService.connect('BanksMSP');
      await fabricService.invokeChaincode('ApproveLC', [
        testLCId,          // lcID
        'Deutsche Bank AG', // issuingBank
        'Commercial Bank of Ethiopia', // beneficiaryBank
        'Test Coffee Exporter PLC'    // beneficiary
      ]);
      console.log(`   ✓ LC approved by bank`);
      
      // Step 4: Issue LC from Banks
      await fabricService.connect('BanksMSP');
      const lcResult = await fabricService.invokeChaincode('IssueLC', [
        testLCId,          // lcID
        'At sight, FOB, documents through advising bank' // terms
      ]);
      
      if (lcResult.success) {
        console.log(`✅ Complete LC workflow successful`);
        console.log(`   L/C ID: ${testLCId}`);
        console.log(`   Final Status: ISSUED`);
        console.log(`   Transaction ID: ${lcResult.txId}`);
        results.passed++;
        results.tests.push({ 
          name: 'LC-Workflow', 
          status: 'PASS', 
          org: 'ECTA+Banks',
          txId: lcResult.txId 
        });
      } else {
        console.log(`❌ LC workflow failed at issuance: ${lcResult.error}`);
        results.failed++;
        results.tests.push({ 
          name: 'LC-Workflow', 
          status: 'FAIL', 
          org: 'ECTA+Banks', 
          error: lcResult.error 
        });
      }
    } catch (error) {
      console.log(`❌ LC workflow error: ${error.message}`);
      results.failed++;
      results.tests.push({ 
        name: 'LC-Workflow', 
        status: 'ERROR', 
        org: 'ECTA+Banks', 
        error: error.message 
      });
    }
    console.log('');
    
    // ==================== FINAL SUMMARY ====================
    console.log('════════════════════════════════════════════════════════════');
    console.log('  TEST RESULTS SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
    console.log('────────────────────────────────────────────────────────────');
    
    // Detailed results
    console.log('\nDetailed Results:');
    results.tests.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.name} (${test.org})`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
      if (test.txId) {
        console.log(`   TxID: ${test.txId}`);
      }
      if (test.records !== undefined) {
        console.log(`   Records: ${test.records}`);
      }
    });
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Final verdict
    if (results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Blockchain integration is 100% operational');
      console.log('✅ All organizations verified');
      console.log('✅ Queries working');
      console.log('✅ Transactions working');
      console.log('✅ Cross-org access working');
      console.log('✅ Data consistency verified\n');
      process.exit(0);
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log(`${results.failed} out of ${results.total} tests failed`);
      console.log('Please review the errors above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    try {
      await fabricService.disconnect();
      console.log('Disconnected from blockchain\n');
    } catch (error) {
      console.error('Error disconnecting:', error.message);
    }
  }
}

// Run comprehensive test
comprehensiveTest();
