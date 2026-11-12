/**
 * COMPREHENSIVE TEST: All Chaincode Functions with 6-Endorser System
 * Tests: RequestLC, ApproveLC, IssueLC, RequestForex, AllocateForex
 * Directly calls fabricService to verify 6 endorsers for each function
 */

const { FabricService } = require('./api/dist/services/fabricService');
const { DatabaseService } = require('./api/dist/services/databaseService');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

async function testFunction(fabric, db, functionName, args, description) {
  console.log(`\n${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}Testing: ${functionName}${colors.reset}`);
  console.log(`Description: ${description}`);
  console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}\n`);
  
  try {
    console.log(`📤 Invoking ${functionName}...`);
    const result = await fabric.invokeChaincode(functionName, args);
    
    if (!result.success) {
      console.log(`${colors.red}❌ Function failed: ${result.error}${colors.reset}`);
      return { function: functionName, success: false, error: result.error };
    }
    
    console.log(`${colors.green}✅ Function succeeded${colors.reset}`);
    console.log(`   TX ID: ${result.txId?.substring(0, 40)}...`);
    
    // Check endorsers in the result
    if (result.endorsers && result.endorsers.length > 0) {
      console.log(`\n🏛️  Endorsers in Response: ${result.endorsers.length}/6`);
      result.endorsers.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.mspId}`);
      });
    }
    
    // Wait for database sync
    console.log(`\n⏳ Waiting 5 seconds for database sync...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check PostgreSQL
    console.log(`\n🔍 Checking PostgreSQL...`);
    const dbEndorsers = await db.all(
      'SELECT signer_org FROM blockchain_signatures WHERE blockchain_tx_id = $1 ORDER BY signer_org',
      [result.txId]
    );
    
    if (dbEndorsers.length > 0) {
      console.log(`\n💾 Endorsers in PostgreSQL: ${dbEndorsers.length}/6`);
      dbEndorsers.forEach((e, i) => {
        const emoji = i < 6 ? '✅' : '⚠️';
        console.log(`   ${emoji} ${i + 1}. ${e.signer_org}`);
      });
      
      if (dbEndorsers.length === 6) {
        console.log(`\n${colors.green}${colors.bright}✅ SUCCESS: ${functionName} has 6/6 endorsers!${colors.reset}`);
        return { function: functionName, success: true, endorsers: 6 };
      } else {
        console.log(`\n${colors.yellow}⚠️  WARNING: Only ${dbEndorsers.length} endorsers stored${colors.reset}`);
        return { function: functionName, success: true, endorsers: dbEndorsers.length };
      }
    } else {
      console.log(`\n${colors.yellow}⚠️  No endorsers found in PostgreSQL yet${colors.reset}`);
      return { function: functionName, success: true, endorsers: 0 };
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Test error: ${error.message}${colors.reset}`);
    return { function: functionName, success: false, error: error.message };
  }
}

async function main() {
  console.log(`\n${colors.bright}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║                                                               ║${colors.reset}`);
  console.log(`${colors.bright}║   COMPREHENSIVE 6-ENDORSER TEST FOR ALL FUNCTIONS            ║${colors.reset}`);
  console.log(`${colors.bright}║                                                               ║${colors.reset}`);
  console.log(`${colors.bright}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const fabric = FabricService.getInstance();
  const db = DatabaseService.getInstance();
  
  // Connect to Fabric
  console.log('🔗 Connecting to Hyperledger Fabric...\n');
  await fabric.connect('ECTAMSP');
  console.log(`${colors.green}✅ Connected to Fabric network${colors.reset}\n`);
  
  const results = [];
  const timestamp = Date.now();
  
  // Test 1: RequestLC
  results.push(await testFunction(
    fabric, db,
    'RequestLC',
    [
      `LC-TEST-ENDORSER-${timestamp}`,           // lcId
      `CONTRACT-TEST-${timestamp}`,              // contractId
      'EXP8958382',                              // exporterId
      '5000000',                                 // amount
      'USD',                                     // currency
      'TEST_BUYER_123',                          // buyerId
      'Test International Buyer',                // buyerName
      'Wells Fargo Bank',                        // buyerBank
      new Date().toISOString(),                  // applicationDate
      JSON.stringify({                           // lcTerms
        paymentTerms: 'At Sight',
        shipmentDate: new Date(Date.now() + 60*24*60*60*1000).toISOString(),
        expiryDate: new Date(Date.now() + 90*24*60*60*1000).toISOString()
      })
    ],
    'Request Letter of Credit from exporter'
  ));
  
  // Test 2: ApproveLC (on the LC we just created)
  results.push(await testFunction(
    fabric, db,
    'ApproveLC',
    [
      `LC-TEST-ENDORSER-${timestamp}`,           // lcId
      'Bank Officer Test',                       // officer
      `APPROVAL-${timestamp}`,                   // approvalRef
      new Date().toISOString()                   // approvalDate
    ],
    'Approve Letter of Credit by bank'
  ));
  
  // Test 3: RequestForex
  const forexId = `FOREX-TEST-${timestamp}`;
  results.push(await testFunction(
    fabric, db,
    'RequestForex',
    [
      forexId,                                   // forexId
      `CONTRACT-TEST-${timestamp}`,              // contractId
      'EXP8958382',                              // exporterId
      '5000000',                                 // amount
      'USD',                                     // currency
      new Date().toISOString()                   // requestDate
    ],
    'Request Forex allocation for export'
  ));
  
  // Test 4: AllocateForex
  results.push(await testFunction(
    fabric, db,
    'AllocateForex',
    [
      forexId,                                   // forexId
      `LC-TEST-ENDORSER-${timestamp}`,           // lcId
      '5000000',                                 // amount
      '115.50',                                  // exchangeRate
      '40',                                      // retentionRate
      'NBE Test Officer',                        // officer
      `NBE-APPROVAL-${timestamp}`,               // approvalRef
      new Date(Date.now() + 180*24*60*60*1000).toISOString() // expiryDate
    ],
    'Allocate Forex by NBE'
  ));
  
  // Test 5: IssueLC
  results.push(await testFunction(
    fabric, db,
    'IssueLC',
    [
      `LC-ISSUE-TEST-${timestamp}`,              // lcId
      `CONTRACT-TEST-${timestamp}`,              // contractId
      'EXP8958382',                              // exporterId
      'Commercial Bank Test',                    // issuingBank
      '5000000',                                 // amount
      'USD',                                     // currency
      new Date().toISOString(),                  // issueDate
      new Date(Date.now() + 90*24*60*60*1000).toISOString() // expiryDate
    ],
    'Issue Letter of Credit'
  ));
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  FINAL RESULTS${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
  
  const successful = results.filter(r => r.success && r.endorsers === 6);
  const partial = results.filter(r => r.success && r.endorsers > 0 && r.endorsers < 6);
  const failed = results.filter(r => !r.success);
  
  console.log(`${colors.green}✅ Functions with 6/6 endorsers: ${successful.length}${colors.reset}`);
  successful.forEach(r => {
    console.log(`   • ${r.function}`);
  });
  
  if (partial.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Functions with partial endorsers: ${partial.length}${colors.reset}`);
    partial.forEach(r => {
      console.log(`   • ${r.function} (${r.endorsers}/6 endorsers)`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n${colors.red}❌ Failed functions: ${failed.length}${colors.reset}`);
    failed.forEach(r => {
      console.log(`   • ${r.function}: ${r.error}`);
    });
  }
  
  console.log(`\n${colors.bright}Total Tested: ${results.length}${colors.reset}\n`);
  
  if (successful.length === results.length) {
    console.log(`${colors.green}${colors.bright}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║                                                               ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║  ✅ ALL FUNCTIONS GET 6/6 ENDORSERS - SYSTEM WORKING! ✅     ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║                                                               ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}${colors.bright}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}${colors.bright}║                                                               ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bright}║  ⚠️  SOME FUNCTIONS NEED ATTENTION                           ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bright}║                                                               ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bright}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  }
  
  process.exit(successful.length === results.length ? 0 : 1);
}

main().catch(err => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
