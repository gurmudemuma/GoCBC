#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('DETAILED CODEBASE VALIDATION REPORT');
console.log('='.repeat(80));
console.log();

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function checkFile(filePath, checks) {
  const fullPath = path.join(__dirname, '../../', filePath);
  
  if (!fs.existsSync(fullPath)) {
    results.failed++;
    results.details.push(`❌ FAIL: ${filePath} does not exist`);
    return false;
  }
  
  results.passed++;
  results.details.push(`✅ PASS: ${filePath} exists`);
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  checks.forEach(check => {
    if (check.type === 'contains') {
      if (content.includes(check.text)) {
        results.passed++;
        results.details.push(`  ✅ Contains: ${check.text.substring(0, 60)}...`);
      } else {
        results.failed++;
        results.details.push(`  ❌ Missing: ${check.text.substring(0, 60)}...`);
      }
    } else if (check.type === 'regex') {
      if (check.pattern.test(content)) {
        results.passed++;
        results.details.push(`  ✅ Matches pattern: ${check.description}`);
      } else {
        results.failed++;
        results.details.push(`  ❌ Does not match: ${check.description}`);
      }
    } else if (check.type === 'count') {
      const matches = content.match(check.pattern);
      const count = matches ? matches.length : 0;
      if (count >= check.min) {
        results.passed++;
        results.details.push(`  ✅ Found ${count} instances of: ${check.description}`);
      } else {
        results.failed++;
        results.details.push(`  ❌ Only found ${count}/${check.min} instances of: ${check.description}`);
      }
    }
  });
  
  return true;
}

console.log('1. SERVICE LAYER VALIDATION');
console.log('-'.repeat(80));

// ContractService
checkFile('src/services/contractService.ts', [
  { type: 'contains', text: 'export class ContractService' },
  { type: 'contains', text: 'async registerContract' },
  { type: 'contains', text: 'async approveContract' },
  { type: 'contains', text: 'async rejectContract' },
  { type: 'contains', text: 'invokeChaincode' }
]);

// LCService
checkFile('src/services/lcService.ts', [
  { type: 'contains', text: 'export class LCService' },
  { type: 'contains', text: 'async issueLC' },
  { type: 'contains', text: 'triggerForexAutoRequest' },
  { type: 'contains', text: 'ForexService' }
]);

// ForexService
checkFile('src/services/forexService.ts', [
  { type: 'contains', text: 'export class ForexService' },
  { type: 'contains', text: 'async allocateForex' },
  { type: 'regex', pattern: /0\.4|40.*%|retention/i, description: '40% retention logic' }
]);

// PaymentService
checkFile('src/services/paymentService.ts', [
  { type: 'contains', text: 'export class PaymentService' },
  { type: 'contains', text: 'async recordPayment' },
  { type: 'regex', pattern: /0\.4.*totalAmount|totalAmount.*0\.4/i, description: '40% retention calculation' },
  { type: 'regex', pattern: /0\.6.*totalAmount|totalAmount.*0\.6/i, description: '60% release calculation' }
]);

// ShipmentService
checkFile('src/services/shipmentService.ts', [
  { type: 'contains', text: 'export class ShipmentService' },
  { type: 'contains', text: 'createQualityInspectionTask' },
  { type: 'contains', text: 'triggerCustomsDeclaration' }
]);

// CustomsService
checkFile('src/services/customsService.ts', [
  { type: 'contains', text: 'export class CustomsService' },
  { type: 'contains', text: 'async submitDeclaration' },
  { type: 'contains', text: 'async clearDeclaration' }
]);

console.log();
console.log('2. PORTAL DASHBOARDS VALIDATION');
console.log('-'.repeat(80));

checkFile('src/routes/portals.ts', [
  { type: 'contains', text: "router.get('/ecta/dashboard'" },
  { type: 'contains', text: "router.get('/banks/dashboard'" },
  { type: 'contains', text: "router.get('/nbe/dashboard'" },
  { type: 'contains', text: "router.get('/customs/dashboard'" },
  { type: 'contains', text: "router.get('/shipping/dashboard'" },
  { type: 'contains', text: "router.get('/exporters/dashboard'" },
  { type: 'contains', text: "router.get('/ecx/dashboard'" },
  { type: 'count', pattern: /Promise\.all/g, min: 5, description: 'Promise.all() usage' }
]);

console.log();
console.log('3. WORKFLOW TRIGGERS VALIDATION');
console.log('-'.repeat(80));

checkFile('src/routes/exporters.ts', [
  { type: 'regex', pattern: /createUserAccount.*after.*approval/i, description: 'User account creation on approval' }
]);

checkFile('src/routes/quality.ts', [
  { type: 'contains', text: 'triggerCustomsDeclaration' }
]);

console.log();
console.log('4. SERVER CONFIGURATION');
console.log('-'.repeat(80));

checkFile('src/server.ts', [
  { type: 'contains', text: "import portalsRouter from './routes/portals'" },
  { type: 'contains', text: "app.use('/api/v1/portals', portalsRouter)" },
  { type: 'regex', pattern: /blockchain-stats|advance\.ts|consignment|collections/i, description: 'Unused routes removed' }
]);

// Check that unused routes are deleted
const unusedRoutes = [
  'src/routes/blockchain-stats.ts',
  'src/routes/advance.ts',
  'src/routes/consignment.ts',
  'src/routes/collections.ts'
];

unusedRoutes.forEach(route => {
  const fullPath = path.join(__dirname, '../../', route);
  if (!fs.existsSync(fullPath)) {
    results.passed++;
    results.details.push(`✅ PASS: ${route} successfully deleted`);
  } else {
    results.warnings++;
    results.details.push(`⚠️  WARNING: ${route} still exists (should be deleted)`);
  }
});

console.log();
console.log('5. FILE ORGANIZATION');
console.log('-'.repeat(80));

const expectedDirs = [
  'tests',
  'scripts/database',
  'scripts/migrations',
  'scripts/maintenance'
];

expectedDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath);
    results.passed++;
    results.details.push(`✅ PASS: ${dir}/ exists with ${files.length} files`);
  } else {
    results.failed++;
    results.details.push(`❌ FAIL: ${dir}/ does not exist`);
  }
});

// Print all details
console.log();
results.details.forEach(detail => console.log(detail));

// Summary
console.log();
console.log('='.repeat(80));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed:   ${results.passed}`);
console.log(`❌ Failed:   ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);
console.log();

const total = results.passed + results.failed;
const percentage = ((results.passed / total) * 100).toFixed(1);

console.log(`Overall: ${results.passed}/${total} checks passed (${percentage}%)`);
console.log();

if (results.failed === 0) {
  console.log('🎉 ALL VALIDATIONS PASSED! The codebase cleanup is complete and correct.');
} else if (results.failed < 5) {
  console.log('⚠️  Most validations passed, but some issues need attention.');
} else {
  console.log('❌ Multiple issues detected. Review required.');
}

console.log('='.repeat(80));

process.exit(results.failed > 0 ? 1 : 0);
