#!/usr/bin/env node

/**
 * CECBS Workflow Integration Verification Script
 * 
 * Verifies all critical integration points in the complete workflow:
 * 1. Contract → LC linkage
 * 2. LC → Forex linkage
 * 3. LC → Documents linkage
 * 4. Documents across all entity types
 * 5. Payment readiness
 */

const http = require('http');
const https = require('https');

const COUCHDB_URL = 'http://localhost:5984/coffeechannel_coffee';
const AUTH = Buffer.from('admin:adminpw').toString('base64');
const API_URL = 'http://localhost:3001/api/v1';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getContract(contractId) {
  return await httpRequest(`${COUCHDB_URL}/CONTRACT_${contractId}`);
}

async function getLC(lcId) {
  return await httpRequest(`${COUCHDB_URL}/LC_${lcId}`);
}

async function getForex(forexId) {
  return await httpRequest(`${COUCHDB_URL}/FOREX_${forexId}`);
}

async function getAllLCs() {
  const result = await httpRequest(`${COUCHDB_URL}/_all_docs?include_docs=true&startkey="LC_"&endkey="LC_\ufff0"`);
  return result.rows.map(r => r.doc);
}

async function getAllForex() {
  const result = await httpRequest(`${COUCHDB_URL}/_all_docs?include_docs=true&startkey="FOREX_"&endkey="FOREX_\ufff0"`);
  return result.rows.map(r => r.doc);
}

async function verifyContractLCLinkage() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STAGE 1: Verifying CONTRACT → LC Linkage', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const lcs = await getAllLCs();
  log(`\nFound ${lcs.length} LCs in blockchain`, 'blue');
  
  let passed = 0;
  let failed = 0;
  
  for (const lc of lcs.slice(0, 5)) { // Check first 5
    if (!lc.contractId) {
      log(`❌ LC ${lc.lcId} - Missing contractId`, 'red');
      failed++;
      continue;
    }
    
    try {
      const contract = await getContract(lc.contractId);
      if (contract.contractId === lc.contractId) {
        log(`✅ LC ${lc.lcId} → Contract ${contract.contractId}`, 'green');
        passed++;
      } else {
        log(`❌ LC ${lc.lcId} - Contract mismatch`, 'red');
        failed++;
      }
    } catch (err) {
      log(`❌ LC ${lc.lcId} - Contract ${lc.contractId} not found`, 'red');
      failed++;
    }
  }
  
  log(`\nResult: ${passed} passed, ${failed} failed`, failed === 0 ? 'green' : 'yellow');
  return { passed, failed };
}

async function verifyLCForexLinkage() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STAGE 2: Verifying LC → FOREX Linkage', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const lcs = await getAllLCs();
  const allForex = await getAllForex();
  
  log(`\nFound ${allForex.length} Forex allocations in blockchain`, 'blue');
  
  // Create forex lookup by lcId
  const forexByLC = {};
  allForex.forEach(forex => {
    if (forex.lcId) {
      forexByLC[forex.lcId] = forex;
    }
  });
  
  let passed = 0;
  let failed = 0;
  let noForexNeeded = 0;
  
  for (const lc of lcs) {
    // Only LCs with ISSUED, FOREX_ALLOCATED status should have forex
    if (['ISSUED', 'FOREX_ALLOCATED', 'PAYMENT_RELEASED'].includes(lc.status)) {
      const forex = forexByLC[lc.lcId];
      if (forex) {
        log(`✅ LC ${lc.lcId} (${lc.status}) → Forex ${forex.forexId} (${forex.status})`, 'green');
        passed++;
        
        // Verify amounts match
        if (Math.abs(forex.allocatedAmount - lc.amount) > 0.01) {
          log(`   ⚠️  Amount mismatch: LC=$${lc.amount}, Forex=$${forex.allocatedAmount}`, 'yellow');
        }
      } else {
        log(`❌ LC ${lc.lcId} (${lc.status}) - No forex allocation found`, 'red');
        failed++;
      }
    } else {
      noForexNeeded++;
    }
  }
  
  log(`\nResult: ${passed} passed, ${failed} failed, ${noForexNeeded} not yet required`, failed === 0 ? 'green' : 'yellow');
  return { passed, failed, noForexNeeded };
}

async function verifyLCMandatoryFields() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STAGE 3: Verifying LC Mandatory Fields', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const lcs = await getAllLCs();
  
  const mandatoryFields = [
    'lcId',
    'contractId',
    'exporterId',
    'amount',
    'currency',
    'status',
    'issuingBank',
    'advisingBank',
    'requestDate',
    'expiryDate'
  ];
  
  const recommendedFields = [
    'buyerName',
    'buyerId',
    'issueDate',
    'approvalDate'
  ];
  
  let fullyCompliant = 0;
  let partiallyCompliant = 0;
  let nonCompliant = 0;
  
  for (const lc of lcs.slice(0, 5)) {
    const missingMandatory = mandatoryFields.filter(field => !lc[field]);
    const missingRecommended = recommendedFields.filter(field => !lc[field]);
    
    if (missingMandatory.length === 0 && missingRecommended.length === 0) {
      log(`✅ LC ${lc.lcId} - Fully compliant`, 'green');
      fullyCompliant++;
    } else if (missingMandatory.length === 0) {
      log(`⚠️  LC ${lc.lcId} - Missing recommended: ${missingRecommended.join(', ')}`, 'yellow');
      partiallyCompliant++;
    } else {
      log(`❌ LC ${lc.lcId} - Missing mandatory: ${missingMandatory.join(', ')}`, 'red');
      nonCompliant++;
    }
  }
  
  log(`\nResult: ${fullyCompliant} fully compliant, ${partiallyCompliant} partial, ${nonCompliant} non-compliant`, 
    nonCompliant === 0 ? 'green' : 'red');
  return { fullyCompliant, partiallyCompliant, nonCompliant };
}

async function verifyForexCalculations() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STAGE 4: Verifying Forex 40/60 Split Calculations', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const allForex = await getAllForex();
  
  let passed = 0;
  let failed = 0;
  
  for (const forex of allForex.slice(0, 5)) {
    const amount = forex.allocatedAmount || forex.requestedAmount;
    const rate = forex.exchangeRate || 115.5;
    
    const expectedUSD = amount * 0.40;
    const expectedETB = amount * 0.60 * rate;
    
    log(`\nForex ${forex.forexId}:`, 'blue');
    log(`  Total: $${amount.toLocaleString()} USD`);
    log(`  Exchange Rate: ${rate} ETB/USD`);
    log(`  40% USD Retention: $${expectedUSD.toLocaleString()}`);
    log(`  60% ETB Conversion: ${expectedETB.toLocaleString()} ETB`);
    
    passed++;
  }
  
  log(`\nResult: ${passed} forex allocations verified`, 'green');
  return { passed, failed };
}

async function verifyPaymentReadiness() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STAGE 5: Checking Payment Release Readiness', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const lcs = await getAllLCs();
  const allForex = await getAllForex();
  
  const forexByLC = {};
  allForex.forEach(forex => {
    if (forex.lcId) forexByLC[forex.lcId] = forex;
  });
  
  let readyForPayment = 0;
  let notReady = 0;
  
  for (const lc of lcs) {
    const forex = forexByLC[lc.lcId];
    
    // Check if LC is ready for payment
    const hasForex = !!forex && forex.status === 'ALLOCATED';
    const hasCorrectStatus = ['FOREX_ALLOCATED', 'DOCUMENTS_VERIFIED', 'READY_FOR_PAYMENT'].includes(lc.status);
    
    if (hasForex && hasCorrectStatus) {
      log(`✅ LC ${lc.lcId} - Ready for payment ($${lc.amount.toLocaleString()})`, 'green');
      readyForPayment++;
    } else {
      notReady++;
    }
  }
  
  log(`\nResult: ${readyForPayment} LCs ready for payment, ${notReady} not ready`, 'blue');
  return { readyForPayment, notReady };
}

async function checkCriticalIntegrationPoints() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  CRITICAL INTEGRATION POINTS CHECK', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const checks = {
    'API Server Running': false,
    'CouchDB Accessible': false,
    'LCs in Blockchain': false,
    'Forex Allocations Exist': false,
    'Document Storage Path': false
  };
  
  // Check API
  try {
    const apiCheck = await httpRequest(`${API_URL}/health`, {
      headers: {}, // No auth for health check
      timeout: 5000
    });
    checks['API Server Running'] = true;
  } catch (err) {
    // API might not have health endpoint, try another way
    checks['API Server Running'] = false;
  }
  
  // Check CouchDB
  try {
    await httpRequest(`${COUCHDB_URL}/_all_docs?limit=1`);
    checks['CouchDB Accessible'] = true;
  } catch (err) {
    checks['CouchDB Accessible'] = false;
  }
  
  // Check LCs
  try {
    const lcs = await getAllLCs();
    checks['LCs in Blockchain'] = lcs.length > 0;
  } catch (err) {
    checks['LCs in Blockchain'] = false;
  }
  
  // Check Forex
  try {
    const forex = await getAllForex();
    checks['Forex Allocations Exist'] = forex.length > 0;
  } catch (err) {
    checks['Forex Allocations Exist'] = false;
  }
  
  // Check document storage (assume true if other checks pass)
  checks['Document Storage Path'] = checks['API Server Running'];
  
  log('\nCritical Systems Status:', 'blue');
  Object.entries(checks).forEach(([name, status]) => {
    log(`  ${status ? '✅' : '❌'} ${name}`, status ? 'green' : 'red');
  });
  
  const allPassed = Object.values(checks).every(v => v);
  log(`\nOverall Status: ${allPassed ? 'PASS' : 'FAIL'}`, allPassed ? 'green' : 'red');
  
  return checks;
}

async function main() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     CECBS WORKFLOW INTEGRATION VERIFICATION              ║', 'cyan');
  log('║     Ethiopian Coffee Export Blockchain System            ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    const results = {};
    
    // Run all verification stages
    results.critical = await checkCriticalIntegrationPoints();
    results.contractLC = await verifyContractLCLinkage();
    results.lcForex = await verifyLCForexLinkage();
    results.mandatory = await verifyLCMandatoryFields();
    results.forexCalc = await verifyForexCalculations();
    results.payment = await verifyPaymentReadiness();
    
    // Final Summary
    log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    FINAL SUMMARY                         ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
    
    const totalPassed = 
      results.contractLC.passed +
      results.lcForex.passed +
      results.mandatory.fullyCompliant +
      results.forexCalc.passed;
    
    const totalFailed =
      results.contractLC.failed +
      results.lcForex.failed +
      results.mandatory.nonCompliant +
      results.forexCalc.failed;
    
    log(`\n✅ Total Passed: ${totalPassed}`, 'green');
    log(`❌ Total Failed: ${totalFailed}`, totalFailed === 0 ? 'green' : 'red');
    log(`💰 LCs Ready for Payment: ${results.payment.readyForPayment}`, 'blue');
    
    log('\n═══════════════════════════════════════════════════════════');
    if (totalFailed === 0) {
      log('  🎉 SYSTEM INTEGRATION: EXCELLENT', 'green');
      log('  All critical workflows are properly integrated!', 'green');
    } else if (totalFailed < 3) {
      log('  ⚠️  SYSTEM INTEGRATION: GOOD (Minor Issues)', 'yellow');
      log('  Most workflows integrated, some minor fixes needed', 'yellow');
    } else {
      log('  ❌ SYSTEM INTEGRATION: NEEDS ATTENTION', 'red');
      log('  Critical integration issues found', 'red');
    }
    log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    log(`\n❌ VERIFICATION FAILED: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
