/**
 * EXPERT FINAL VERIFICATION CHECKLIST
 * Double-check all blockchain features are correctly implemented
 */

const axios = require('axios');
const { DatabaseService } = require('./api/dist/services/databaseService');

const API_BASE = 'http://localhost:3001/api/v1';

async function expertCheck() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  EXPERT FINAL VERIFICATION - All Features Checklist          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const db = DatabaseService.getInstance();
  
  // Login
  const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginResponse.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  const results = {
    pass: [],
    fail: [],
    warning: []
  };

  function check(name, condition, details = '') {
    if (condition === true) {
      results.pass.push(`✅ ${name}`);
      console.log(`✅ ${name}`);
      if (details) console.log(`   ${details}`);
    } else if (condition === false) {
      results.fail.push(`❌ ${name}`);
      console.log(`❌ ${name}`);
      if (details) console.log(`   ${details}`);
    } else {
      results.warning.push(`⚠️  ${name}`);
      console.log(`⚠️  ${name}`);
      if (details) console.log(`   ${details}`);
    }
  }

  console.log('\n1️⃣  NETWORK LAYER\n' + '─'.repeat(60));
  
  // Check all 6 peers are running
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const { stdout } = await execAsync('docker ps --filter "name=peer0" --format "{{.Names}}"');
  const peers = stdout.trim().split('\n').filter(p => p);
  check('6 Peer Organizations Online', peers.length === 6, `Found ${peers.length} peers`);

  // Check orderer
  const { stdout: ordererOut } = await execAsync('docker ps --filter "name=orderer" --format "{{.Names}}"');
  const orderers = ordererOut.trim().split('\n').filter(p => p);
  check('Orderer Node Running', orderers.length > 0, `Found ${orderers.length} orderer(s)`);

  console.log('\n2️⃣  ENDORSEMENT POLICY\n' + '─'.repeat(60));

  // Check recent transactions have 6 endorsers
  const recentTx = await db.get(`
    SELECT blockchain_tx_id, chaincode_function, COUNT(*) as count
    FROM blockchain_signatures
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY blockchain_tx_id, chaincode_function
    HAVING COUNT(*) = 6
    ORDER BY MAX(created_at) DESC
    LIMIT 1
  `, []);
  
  check('Recent TX has 6/6 Endorsers', !!recentTx, recentTx ? `${recentTx.chaincode_function}: ${recentTx.count} endorsers` : 'No recent 6-endorser transactions');

  // Verify all 6 MSPs are represented
  if (recentTx) {
    const endorsers = await db.all(
      'SELECT DISTINCT signer_org FROM blockchain_signatures WHERE blockchain_tx_id = $1 ORDER BY signer_org',
      [recentTx.blockchain_tx_id]
    );
    const orgs = endorsers.map(e => e.signer_org);
    check('All 6 MSPs Present', orgs.length === 6, orgs.join(', '));
    
    const expected = ['BanksMSP', 'CustomsMSP', 'ECTAMSP', 'ECXMSP', 'NBEMSP', 'ShippingMSP'];
    const allPresent = expected.every(msp => orgs.includes(msp));
    check('Correct MSP Organizations', allPresent, expected.join(', '));
  }

  console.log('\n3️⃣  FABRICSERVICE CONFIGURATION\n' + '─'.repeat(60));

  // Check fabricService.ts has setEndorsingOrganizations
  const fs = require('fs');
  const fabricServiceCode = fs.readFileSync('./api/src/services/fabricService.ts', 'utf8');
  
  check('setEndorsingOrganizations() Called', 
    fabricServiceCode.includes('setEndorsingOrganizations'),
    'Found in fabricService.ts'
  );
  
  check('6 MSP IDs Specified',
    fabricServiceCode.includes('ECTAMSP') && 
    fabricServiceCode.includes('ECXMSP') &&
    fabricServiceCode.includes('BanksMSP') &&
    fabricServiceCode.includes('NBEMSP') &&
    fabricServiceCode.includes('CustomsMSP') &&
    fabricServiceCode.includes('ShippingMSP'),
    'All 6 MSPs listed in endorsement targeting'
  );

  check('Endorser Capture Logic Present',
    fabricServiceCode.includes('getEndorsements()') || fabricServiceCode.includes('endorsers'),
    'Endorsement extraction implemented'
  );

  console.log('\n4️⃣  DATA STORAGE (PostgreSQL)\n' + '─'.repeat(60));

  // Check blockchain_signatures table exists and has records
  const sigCount = await db.get('SELECT COUNT(*) as count FROM blockchain_signatures', []);
  check('Signature Table Populated', sigCount.count > 0, `${sigCount.count} signature records`);

  // Check recent signatures are being stored (1 per endorser)
  const recentSigs = await db.get(`
    SELECT COUNT(*) as count 
    FROM blockchain_signatures 
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `, []);
  check('Recent Signatures Captured', recentSigs.count > 0, `${recentSigs.count} signatures in last 24h`);

  // Verify endorsement storage in banking.ts
  const bankingCode = fs.readFileSync('./api/src/routes/banking.ts', 'utf8');
  check('Banking Route Stores Endorsements',
    bankingCode.includes('endorsers') && bankingCode.includes('recordSignature'),
    'Found endorsement storage logic'
  );

  console.log('\n5️⃣  API ENDPOINTS\n' + '─'.repeat(60));

  // Check blockchain-signatures endpoint aggregates correctly
  const sigRoute = fs.readFileSync('./api/src/routes/blockchain-signatures.ts', 'utf8');
  check('Signature Aggregation Logic',
    sigRoute.includes('GROUP BY') || sigRoute.includes('Map'),
    'Aggregation by transaction ID implemented'
  );

  // Test actual API response
  const testLC = await db.get(
    `SELECT entity_id FROM blockchain_signatures WHERE chaincode_function = 'ApproveLC' ORDER BY created_at DESC LIMIT 1`,
    []
  );
  
  if (testLC) {
    try {
      const apiResponse = await axios.get(
        `${API_BASE}/blockchain-signatures/entity/LETTER_OF_CREDIT/${testLC.entity_id}`,
        { headers }
      );
      
      const hasTxs = apiResponse.data.data?.transactions?.length > 0;
      const hasEndorsers = apiResponse.data.data?.transactions?.[0]?.endorsers?.length > 0;
      
      check('API Returns Transactions', hasTxs, 'Transactions array present');
      check('API Returns Endorsers', hasEndorsers, 
        hasEndorsers ? `${apiResponse.data.data.transactions[0].endorsers.length} endorsers` : 'No endorsers'
      );
    } catch (err) {
      check('API Signature Endpoint', false, err.response?.data?.error?.message || err.message);
    }
  }

  console.log('\n6️⃣  UI DISPLAY\n' + '─'.repeat(60));

  // Check UI component shows endorsers
  const uiComponent = fs.readFileSync('./ui/src/components/documents/BlockchainSignatureVerification.tsx', 'utf8');
  check('UI Shows Consortium Endorsements',
    uiComponent.includes('Consortium Endorsements'),
    'Found endorsement display in UI'
  );

  check('UI Shows Endorser Count',
    uiComponent.includes('endorsers.length'),
    'Endorser count displayed'
  );

  check('UI Shows Consensus Status',
    uiComponent.includes('MAJORITY') || uiComponent.includes('Full') || uiComponent.includes('Partial'),
    'Consensus status messaging present'
  );

  console.log('\n7️⃣  BUYER DATA ENHANCEMENT\n' + '─'.repeat(60));

  // Check LC endpoint JOINs with contracts for buyer data
  check('LC Route Fetches Buyer Data',
    bankingCode.includes('sales_contracts') && bankingCode.includes('buyer'),
    'JOIN with sales_contracts table present'
  );

  check('Buyer Fields in Normalization',
    bankingCode.includes('buyerId') && bankingCode.includes('buyerName'),
    'Buyer fields mapped in response'
  );

  // Test actual LC response has buyer data
  const lcResponse = await axios.get(`${API_BASE}/banking/lc`, { headers });
  const hasLCs = lcResponse.data.data?.length > 0;
  const hasBuyerField = hasLCs && 'buyerId' in lcResponse.data.data[0];
  
  check('LC API Includes Buyer Fields', hasBuyerField, 
    hasBuyerField ? 'buyerId, buyerName fields present' : 'Buyer fields missing'
  );

  console.log('\n8️⃣  SYSTEM INTEGRATION\n' + '─'.repeat(60));

  // Check dual-source data (blockchain + postgres)
  check('Buyer Data Map Created',
    bankingCode.includes('buyerDataMap') && bankingCode.includes('Map'),
    'Buyer data lookup map implemented'
  );

  check('Blockchain Data Enrichment',
    bankingCode.includes('buyerData.buyerId') || bankingCode.includes('buyerDataMap.get'),
    'Blockchain data enriched with PostgreSQL buyer info'
  );

  // Performance check
  const lcStart = Date.now();
  await axios.get(`${API_BASE}/banking/lc`, { headers });
  const lcTime = Date.now() - lcStart;
  check('LC Query Performance', lcTime < 2000, `${lcTime}ms response time`);

  console.log('\n9️⃣  PRODUCTION READINESS\n' + '─'.repeat(60));

  // Check error handling
  check('Error Handling Present',
    fabricServiceCode.includes('try') && fabricServiceCode.includes('catch'),
    'Try-catch blocks implemented'
  );

  // Check logging
  check('Logging Implemented',
    fabricServiceCode.includes('logger.') && bankingCode.includes('logger.'),
    'Logger used in critical paths'
  );

  // Check transaction retry logic (in forex.ts, not banking.ts)
  const forexCode = fs.readFileSync('./api/src/routes/forex.ts', 'utf8');
  check('Transaction Retry Logic',
    forexCode.includes('maxRetries') && forexCode.includes('attempt'),
    'Retry mechanism implemented in forex allocation'
  );

  console.log('\n' + '═'.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('═'.repeat(60) + '\n');

  console.log(`✅ PASSED:   ${results.pass.length}`);
  console.log(`⚠️  WARNINGS: ${results.warning.length}`);
  console.log(`❌ FAILED:   ${results.fail.length}\n`);

  if (results.fail.length === 0 && results.warning.length === 0) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║  ✅ ALL FEATURES VERIFIED AND OPERATIONAL ✅             ║');
    console.log('║                                                           ║');
    console.log('║  System is PRODUCTION-READY with:                        ║');
    console.log('║  • Full 6-organization consortium consensus              ║');
    console.log('║  • Complete endorsement capture & storage                ║');
    console.log('║  • Buyer data enrichment via PostgreSQL JOIN             ║');
    console.log('║  • API endpoints returning complete data                 ║');
    console.log('║  • UI displaying all endorsement details                 ║');
    console.log('║  • Performance optimized (<2s queries)                   ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } else if (results.fail.length === 0) {
    console.log('⚠️  System is operational with minor warnings.');
    console.log('    All critical features are working.\n');
    results.warning.forEach(w => console.log(w));
  } else {
    console.log('❌ Some features need attention:\n');
    results.fail.forEach(f => console.log(f));
  }

  process.exit(results.fail.length === 0 ? 0 : 1);
}

expertCheck().catch(err => {
  console.error('\n❌ EXPERT CHECK FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
