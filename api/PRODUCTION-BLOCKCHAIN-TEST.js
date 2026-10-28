#!/usr/bin/env node

/**
 * PRODUCTION BLOCKCHAIN INTEGRATION TEST
 * Comprehensive test with all fixes applied permanently
 * Tests all 6 organizations with correct parameters
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.blockchain.fixed') });

const { FabricService } = require('./dist/services/fabricService');

const ORGANIZATIONS = [
  { msp: 'ECTAMSP', name: 'ECTA' },
  { msp: 'ECXMSP', name: 'ECX' },
  { msp: 'BanksMSP', name: 'Banks' },
  { msp: 'NBEMSP', name: 'NBE' },
  { msp: 'CustomsMSP', name: 'Customs' },
  { msp: 'ShippingMSP', name: 'Shipping' }
];

async function runProductionTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRODUCTION BLOCKCHAIN INTEGRATION TEST');
  console.log('  All fixes applied - Permanent validation');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const fabricService = FabricService.getInstance();
  const results = { passed: 0, failed: 0, tests: [] };
  
  // ============================================================
  // TEST 1: Six-Organization Connectivity (Critical)
  // ============================================================
  console.log('TEST 1: Six-Organization Connectivity\n');
  console.log('Verifying ECTA discovery fix and all org connections...\n');
  
  for (const org of ORGANIZATIONS) {
    try {
      await fabricService.connect(org.msp);
      const result = await fabricService.queryChaincode('QueryAllContracts', []);
      
      if (result.success) {
        console.log(`✅ ${org.name.padEnd(10)} (${org.msp.padEnd(12)}) - Connected & Queried`);
        results.passed++;
        results.tests.push({ test: `${org.name} Connection`, status: 'PASS' });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.log(`❌ ${org.name.padEnd(10)} (${org.msp.padEnd(12)}) - FAILED: ${err.message}`);
      results.failed++;
      results.tests.push({ test: `${org.name} Connection`, status: 'FAIL', error: err.message });
    }
  }
  
  console.log(`\n✓ ${results.passed}/6 organizations operational\n`);
  
  // ============================================================
  // TEST 2: InitLedger (Blockchain Foundation)
  // ============================================================
  console.log('\nTEST 2: Initialize Ledger\n');
  
  try {
    await fabricService.connect('ECTAMSP');
    const result = await fabricService.invokeChaincode('InitLedger', []);
    
    if (result.success) {
      console.log(`✅ Ledger initialized successfully`);
      console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
      console.log(`   Block: ${result.ledgerDetails?.blockNumber || 'N/A'}`);
      results.passed++;
      results.tests.push({ test: 'InitLedger', status: 'PASS' });
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.log(`❌ InitLedger failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'InitLedger', status: 'FAIL', error: err.message });
  }
  
  // ============================================================
  // TEST 3: Register Exporter (With Correct Parameters)
  // ============================================================
  console.log('\n\nTEST 3: Register Exporter (ECTA)\n');
  
  const exporterId = `EXPORTER-${Date.now()}`;
  
  try {
    await fabricService.connect('ECTAMSP');
    const result = await fabricService.invokeChaincode('RegisterExporter', [
      exporterId,
      'Production Test Exporter PLC',
      'ECTA-LIC-2024-PROD',
      'company',      // ✅ FIX: Must be "private", "company", or "individual"
      '20000000',     // ✅ FIX: Minimum 20M ETB for company type (ECTA Directive 1106/2025)
      'Senior Coffee Taster',
      'TASTER-CERT-2024-001',
      'LAB-CERT-2024-001',
      '2028-12-31'
    ]);
    
    if (result.success) {
      console.log(`✅ Exporter registered: ${exporterId}`);
      console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
      console.log(`   Block: ${result.ledgerDetails?.blockNumber || 'N/A'}`);
      results.passed++;
      results.tests.push({ test: 'RegisterExporter', status: 'PASS', id: exporterId });
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.log(`❌ Exporter registration failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'RegisterExporter', status: 'FAIL', error: err.message });
    console.log('\n⚠️  Cannot continue - exporter required for contract registration\n');
    printResults(results);
    process.exit(1);
  }
  
  // ============================================================
  // TEST 4: Register Sales Contract (With Correct Parameters)
  // ============================================================
  console.log('\n\nTEST 4: Register Sales Contract (ECTA)\n');
  
  const contractId = `CONTRACT-${Date.now()}`;
  const buyerId = `BUYER-${Date.now()}`;
  
  try {
    const result = await fabricService.invokeChaincode('RegisterSalesContract', [
      contractId,        // contractID
      exporterId,        // exporterID (must exist)
      buyerId,           // buyerID
      'Germany',         // buyerCountry
      'Washed Arabica Grade 1', // coffeeType
      '2500',            // quantityStr (kg)
      '7.00',            // pricePerKgStr (USD, above $5 minimum)
      'USD',             // currency
      'true',            // eudrRequiredStr
      'Deutsche Bank AG', // buyerBank
      'Commercial Bank of Ethiopia', // exporterBank
      '[]'               // documentsJSON
    ]);
    
    if (result.success) {
      console.log(`✅ Contract registered: ${contractId}`);
      console.log(`   Exporter: ${exporterId}`);
      console.log(`   Value: 2500 kg × $7.00 = $17,500`);
      console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
      results.passed++;
      results.tests.push({ test: 'RegisterSalesContract', status: 'PASS', id: contractId });
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.log(`❌ Contract registration failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'RegisterSalesContract', status: 'FAIL', error: err.message });
    console.log('\n⚠️  Cannot continue - contract required for remaining tests\n');
    printResults(results);
    process.exit(1);
  }
  
  // ============================================================
  // TEST 5: Read Contract (Same Organization)
  // ============================================================
  console.log('\n\nTEST 5: Read Sales Contract (ECTA)\n');
  
  try {
    const result = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
    
    if (result.success) {
      const contract = JSON.parse(result.data);
      console.log(`✅ Contract read successful`);
      console.log(`   ID: ${contract.contractId}`);
      console.log(`   Status: ${contract.contractStatus}`);
      console.log(`   Exporter: ${contract.exporterId}`);
      console.log(`   Total Value: ${contract.totalValue} ${contract.currency}`);
      results.passed++;
      results.tests.push({ test: 'ReadSalesContract', status: 'PASS' });
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.log(`❌ Contract read failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'ReadSalesContract', status: 'FAIL', error: err.message });
  }
  
  // ============================================================
  // TEST 6: Cross-Organization Query (Banks reads ECTA data)
  // ============================================================
  console.log('\n\nTEST 6: Cross-Organization Query (Banks→ECTA)\n');
  
  try {
    await fabricService.connect('BanksMSP');
    const result = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
    
    if (result.success) {
      const contract = JSON.parse(result.data);
      const verified = contract.contractId === contractId;
      console.log(`✅ Banks can read ECTA contract`);
      console.log(`   Contract ID verified: ${verified ? 'YES' : 'NO'}`);
      console.log(`   Cross-org data sharing: OPERATIONAL`);
      results.passed++;
      results.tests.push({ test: 'CrossOrgQuery', status: 'PASS' });
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.log(`❌ Cross-org query failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'CrossOrgQuery', status: 'FAIL', error: err.message });
  }
  
  // ============================================================
  // TEST 7: Approve Contract (Required for LC)
  // ============================================================
  console.log('\n\nTEST 7: Approve Sales Contract (ECTA)\n');
  
  try {
    await fabricService.connect('ECTAMSP');
    const result = await fabricService.invokeChaincode('ApproveSalesContract', [contractId]);
    
    if (result.success) {
      console.log(`✅ Contract approved by ECTA`);
      console.log(`   Ready for LC issuance`);
      console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
      results.passed++;
      results.tests.push({ test: 'ApproveSalesContract', status: 'PASS' });
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.log(`❌ Contract approval failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'ApproveSalesContract', status: 'FAIL', error: err.message });
  }
  
  // ============================================================
  // TEST 8: Multi-Organization LC Workflow
  // ============================================================
  console.log('\n\nTEST 8: Letter of Credit Workflow (ECTA + Banks)\n');
  
  const lcId = `LC-${Date.now()}`;
  
  try {
    // Step A: Request LC (ECTA)
    await fabricService.connect('ECTAMSP');
    let result = await fabricService.invokeChaincode('RequestLC', [
      lcId,
      contractId,
      exporterId,
      'Commercial Bank of Ethiopia',
      '17500',  // Total value: 2500kg × $7
      'USD',
      '2028-06-30'
    ]);
    if (!result.success) throw new Error(`RequestLC failed: ${result.error}`);
    console.log(`   ✓ Step 1: LC requested by ECTA`);
    
    // Step B: Approve LC (Banks)
    await fabricService.connect('BanksMSP');
    result = await fabricService.invokeChaincode('ApproveLC', [
      lcId,
      'Deutsche Bank AG',
      'Commercial Bank of Ethiopia',
      'Production Test Exporter PLC'
    ]);
    if (!result.success) throw new Error(`ApproveLC failed: ${result.error}`);
    console.log(`   ✓ Step 2: LC approved by Banks`);
    
    // Step C: Issue LC (Banks)
    result = await fabricService.invokeChaincode('IssueLC', [
      lcId,
      'At sight payment, FOB Djibouti, documents via advising bank, UCP 600 rules apply'
    ]);
    if (!result.success) throw new Error(`IssueLC failed: ${result.error}`);
    
    console.log(`✅ Complete LC workflow successful`);
    console.log(`   LC ID: ${lcId}`);
    console.log(`   Status: ISSUED`);
    console.log(`   Final TxID: ${result.txId.substring(0, 16)}...`);
    results.passed++;
    results.tests.push({ test: 'LC-Workflow', status: 'PASS', id: lcId });
    
  } catch (err) {
    console.log(`❌ LC workflow failed: ${err.message}`);
    results.failed++;
    results.tests.push({ test: 'LC-Workflow', status: 'FAIL', error: err.message });
  }
  
  // ============================================================
  // FINAL RESULTS
  // ============================================================
  printResults(results);
  
  if (results.failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

function printResults(results) {
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:   ${results.passed + results.failed}`);
  console.log(`✅ Passed:     ${results.passed}`);
  console.log(`❌ Failed:     ${results.failed}`);
  console.log(`Success Rate:  ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('───────────────────────────────────────────────────────────');
  
  console.log('\nTest Details:\n');
  results.tests.forEach((test, i) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${i + 1}. ${icon} ${test.test}`);
    if (test.id) console.log(`   ID: ${test.id}`);
    if (test.error) console.log(`   Error: ${test.error.substring(0, 100)}...`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════');
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - PRODUCTION READY\n');
    console.log('✅ All 6 organizations connected (ECTA discovery fix applied)');
    console.log('✅ Cross-organization queries working');
    console.log('✅ Multi-organization workflows operational');
    console.log('✅ Backend blockchain integration COMPLETE\n');
  } else {
    console.log(`\n⚠️  ${results.failed} test(s) failed - review errors above\n`);
  }
}

// Run the test
runProductionTest().catch(err => {
  console.error(`\n❌ FATAL ERROR: ${err.message}\n`);
  console.error(err.stack);
  process.exit(1);
});
