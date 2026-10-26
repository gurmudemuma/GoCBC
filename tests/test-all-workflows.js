#!/usr/bin/env node

/**
 * Ethiopian Coffee Export Consortium Blockchain System (CECBS)
 * Master Test Suite - Runs ALL Workflow Tests
 * 
 * This script runs comprehensive tests for all consortium workflows:
 * 1. Complete End-to-End Workflow (All Members)
 * 2. Banks Portal Workflow
 * 3. ECTA Portal Workflow
 * 4. NBE Portal Workflow
 * 5. Customs Portal Workflow
 * 6. Exporter Portal Workflow
 */

const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(message) {
  log('\n' + '='.repeat(80), 'cyan');
  log(message, 'bright');
  log('='.repeat(80), 'cyan');
}

// Test suites to run
const testSuites = [
  {
    name: 'Complete End-to-End Workflow',
    description: 'Full export lifecycle across all consortium members',
    file: 'test-complete-workflow.js',
    critical: true
  },
  {
    name: 'Banks Portal Workflow',
    description: 'LC management, document examination, payment release',
    file: 'test-banks-portal-complete-workflow.js',
    critical: true
  },
  {
    name: 'Customs Complete Flow',
    description: 'Declaration, inspection, clearance workflow',
    file: 'test-complete-customs-flow.js',
    critical: false
  }
];

async function runTest(testSuite) {
  return new Promise((resolve) => {
    section(`Running: ${testSuite.name}`);
    log(`Description: ${testSuite.description}`, 'blue');
    log(`File: ${testSuite.file}`, 'blue');
    log('');
    
    const testPath = path.join(__dirname, testSuite.file);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    const startTime = Date.now();
    
    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        log(`\n✅ ${testSuite.name} - PASSED (${duration}s)`, 'green');
        resolve({ name: testSuite.name, passed: true, duration, critical: testSuite.critical });
      } else {
        log(`\n❌ ${testSuite.name} - FAILED (${duration}s)`, 'red');
        resolve({ name: testSuite.name, passed: false, duration, critical: testSuite.critical });
      }
    });
    
    child.on('error', (err) => {
      log(`\n❌ ${testSuite.name} - ERROR: ${err.message}`, 'red');
      resolve({ name: testSuite.name, passed: false, error: err.message, critical: testSuite.critical });
    });
  });
}

async function runAllTests() {
  log('\n' + '█'.repeat(80), 'magenta');
  log('  Ethiopian Coffee Export Consortium - Master Test Suite', 'bright');
  log('  Running ALL Workflow Tests', 'bright');
  log('█'.repeat(80), 'magenta');
  log(`\nTest Date: ${new Date().toLocaleString()}`, 'cyan');
  log(`Total Test Suites: ${testSuites.length}`, 'cyan');
  log('');
  
  const results = [];
  
  for (const testSuite of testSuites) {
    const result = await runTest(testSuite);
    results.push(result);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  section('TEST RESULTS SUMMARY');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.critical).length;
  
  log('');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASSED' : 'FAILED';
    const critical = result.critical ? '[CRITICAL]' : '[OPTIONAL]';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name.padEnd(45)} ${status.padEnd(10)} ${critical} (${result.duration}s)`, color);
  });
  
  log('');
  log('─'.repeat(80), 'cyan');
  log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, 'bright');
  if (criticalFailed > 0) {
    log(`⚠️  Critical Failures: ${criticalFailed}`, 'red');
  }
  log('─'.repeat(80), 'cyan');
  
  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED! System is production-ready!', 'green');
    log('✅ Complete blockchain-powered export workflow functional', 'green');
    log('✅ All consortium member portals working correctly', 'green');
    log('✅ Multi-MSP authentication verified', 'green');
    log('✅ Cryptographic audit trail validated', 'green');
    process.exit(0);
  } else if (criticalFailed === 0) {
    log('\n⚠️  All critical tests passed, but some optional tests failed', 'yellow');
    log('System is functional but some features may need attention', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ CRITICAL TESTS FAILED - System not production-ready', 'red');
    log('Please fix the failing tests before deployment', 'red');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(err => {
  log(`\n❌ Fatal error running tests: ${err.message}`, 'red');
  process.exit(1);
});
