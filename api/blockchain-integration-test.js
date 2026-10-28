#!/usr/bin/env node

/**
 * EXPERT-LEVEL BLOCKCHAIN INTEGRATION TEST
 * Tests all 6 organizations with proper error handling and validation
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.blockchain.fixed') });

const { FabricService } = require('./dist/services/fabricService');

const ORGS = ['ECTAMSP', 'ECXMSP', 'BanksMSP', 'NBEMSP', 'CustomsMSP', 'ShippingMSP'];

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  BLOCKCHAIN INTEGRATION TEST - EXPERT MODE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const fabricService = FabricService.getInstance();
  let passed = 0;
  let failed = 0;
  
  try {
    // TEST 1: Connection test for all 6 orgs
    console.log('TEST 1: Six-Organization Connectivity\n');
    for (const msp of ORGS) {
      try {
        await fabricService.connect(msp);
        const result = await fabricService.queryChaincode('QueryAllContracts', []);
        if (result.success) {
          console.log(`✅ ${msp.padEnd(12)} - Connected & Queried`);
          passed++;
        } else {
          console.log(`❌ ${msp.padEnd(12)} - Query failed: ${result.error}`);
          failed++;
        }
      } catch (err) {
        console.log(`❌ ${msp.padEnd(12)} - Error: ${err.message}`);
        failed++;
      }
    }
    
    // TEST 2: Register exporter
    console.log('\n\nTEST 2: Register Exporter (ECTA)\n');
    const exporterId = `EXP-${Date.now()}`;
    try {
      await fabricService.connect('ECTAMSP');
      const result = await fabricService.invokeChaincode('RegisterExporter', [
        exporterId,
        'Expert Test Exporter Ltd',
        'ECTA-2024-TEST',
        'company',  // Valid: private, company, individual
        '20000000', // Minimum 20M ETB for company
        'Professional Taster',
        'TASTER-CERT-001',
        'LAB-CERT-001',
        '2028-12-31'
      ]);
      
      if (result.success) {
        console.log(`✅ Exporter registered: ${exporterId}`);
        console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
        passed++;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.log(`❌ Exporter registration failed: ${err.message}`);
      failed++;
      return; // Cannot continue without exporter
    }
    
    // TEST 3: Register contract
    console.log('\n\nTEST 3: Register Sales Contract (ECTA)\n');
    const contractId = `CONTRACT-${Date.now()}`;
    const buyerId = `BUYER-${Date.now()}`;
    try {
      const result = await fabricService.invokeChaincode('RegisterSalesContract', [
        contractId,        // contractID
        exporterId,        // exporterID
        buyerId,           // buyerID
        'Germany',         // buyerCountry
        'Washed Arabica',  // coffeeType
        '2000',            // quantityStr (kg)
        '6.50',            // pricePerKgStr (USD)
        'USD',             // currency
        'true',            // eudrRequiredStr
        'Deutsche Bank',   // buyerBank
        'Commercial Bank of Ethiopia', // exporterBank
        '[]'               // documentsJSON
      ]);
      
      if (result.success) {
        console.log(`✅ Contract registered: ${contractId}`);
        console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
        passed++;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.log(`❌ Contract registration failed: ${err.message}`);
      failed++;
      return;
    }
    
    // TEST 4: Read contract from ECTA
    console.log('\n\nTEST 4: Read Contract (ECTA)\n');
    try {
      const result = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
      if (result.success) {
        const contract = JSON.parse(result.data);
        console.log(`✅ Contract read successful`);
        console.log(`   ID: ${contract.contractId}`);
        console.log(`   Status: ${contract.contractStatus}`);
        console.log(`   Value: ${contract.totalValue} ${contract.currency}`);
        passed++;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.log(`❌ Contract read failed: ${err.message}`);
      failed++;
    }
    
    // TEST 5: Cross-org read (Banks reads ECTA contract)
    console.log('\n\nTEST 5: Cross-Organization Query (Banks→ECTA)\n');
    try {
      await fabricService.connect('BanksMSP');
      const result = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
      if (result.success) {
        const contract = JSON.parse(result.data);
        console.log(`✅ Banks can read ECTA contract`);
        console.log(`   Verified: ${contract.contractId === contractId}`);
        passed++;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.log(`❌ Cross-org query failed: ${err.message}`);
      failed++;
    }
    
    // TEST 6: Approve contract
    console.log('\n\nTEST 6: Approve Contract (ECTA)\n');
    try {
      await fabricService.connect('ECTAMSP');
      const result = await fabricService.invokeChaincode('ApproveSalesContract', [contractId]);
      if (result.success) {
        console.log(`✅ Contract approved`);
        console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
        passed++;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.log(`❌ Contract approval failed: ${err.message}`);
      failed++;
      return;
    }
    
    // TEST 7: LC Workflow
    console.log('\n\nTEST 7: Letter of Credit Workflow (Multi-Org)\n');
    const lcId = `LC-${Date.now()}`;
    try {
      // Step A: Request LC
      await fabricService.connect('ECTAMSP');
      let result = await fabricService.invokeChaincode('RequestLC', [
        lcId,
        contractId,
        exporterId,
        'Commercial Bank of Ethiopia',
        '13000',  // 2000kg * 6.50
        'USD',
        '2028-06-30'
      ]);
      if (!result.success) throw new Error(`RequestLC: ${result.error}`);
      console.log(`   ✓ LC requested`);
      
      // Step B: Approve LC
      await fabricService.connect('BanksMSP');
      result = await fabricService.invokeChaincode('ApproveLC', [
        lcId,
        'Deutsche Bank',
        'Commercial Bank of Ethiopia',
        'Expert Test Exporter Ltd'
      ]);
      if (!result.success) throw new Error(`ApproveLC: ${result.error}`);
      console.log(`   ✓ LC approved`);
      
      // Step C: Issue LC
      result = await fabricService.invokeChaincode('IssueLC', [
        lcId,
        'At sight, FOB Djibouti, documents via advising bank'
      ]);
      if (!result.success) throw new Error(`IssueLC: ${result.error}`);
      console.log(`✅ Complete LC workflow successful`);
      console.log(`   LC ID: ${lcId}`);
      console.log(`   TxID: ${result.txId.substring(0, 16)}...`);
      passed++;
    } catch (err) {
      console.log(`❌ LC workflow failed: ${err.message}`);
      failed++;
    }
    
    // FINAL RESULTS
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('  FINAL RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Tests:   ${passed + failed}`);
    console.log(`✅ Passed:     ${passed}`);
    console.log(`❌ Failed:     ${failed}`);
    console.log(`Success Rate:  ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED - BLOCKCHAIN 100% OPERATIONAL\n');
      console.log('✅ All 6 organizations connected');
      console.log('✅ Transactions working across organizations');
      console.log('✅ Multi-org workflows operational');
      console.log('✅ Backend integration complete\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ${failed} TEST(S) FAILED\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(`\n❌ UNHANDLED ERROR: ${err.message}\n`);
  process.exit(1);
});
