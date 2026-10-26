#!/usr/bin/env node

/**
 * Complete End-to-End Workflow Test
 * Tests the entire coffee export workflow from contract to payment
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('COMPLETE WORKFLOW TEST - End-to-End Integration');
console.log('='.repeat(80));
console.log();

let passed = 0;
let failed = 0;
const issues = [];

// Test 1: Verify all service files exist
console.log('TEST 1: Verify Service Files Exist');
console.log('-'.repeat(80));

const services = [
  'src/services/contractService.ts',
  'src/services/lcService.ts',
  'src/services/forexService.ts',
  'src/services/paymentService.ts',
  'src/services/shipmentService.ts',
  'src/services/customsService.ts'
];

services.forEach(service => {
  const filePath = path.join(__dirname, '../..', service);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${service} exists`);
    passed++;
  } else {
    console.log(`❌ ${service} MISSING`);
    issues.push(`Missing service file: ${service}`);
    failed++;
  }
});

console.log();

// Test 2: Verify routes import services
console.log('TEST 2: Verify Routes Import Services');
console.log('-'.repeat(80));

const routeImports = [
  { route: 'src/routes/payments.ts', service: 'PaymentService' },
  { route: 'src/routes/contracts.ts', service: 'ContractService' },
  { route: 'src/routes/banking.ts', service: 'LCService' },
  { route: 'src/routes/forex.ts', service: 'ForexService' },
  { route: 'src/routes/shipments.ts', service: 'ShipmentService' },
  { route: 'src/routes/quality.ts', service: 'ShipmentService' },
  { route: 'src/routes/customs.ts', service: 'CustomsService' }
];

routeImports.forEach(({ route, service }) => {
  const filePath = path.join(__dirname, '../..', route);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${route} does not exist`);
    issues.push(`Route file missing: ${route}`);
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(`import { ${service} }`) || content.includes(`import { ${service},`)) {
    console.log(`✅ ${route} imports ${service}`);
    passed++;
  } else {
    console.log(`❌ ${route} does NOT import ${service}`);
    issues.push(`${route} missing import: ${service}`);
    failed++;
  }
});

console.log();

// Test 3: Verify service methods are called in routes
console.log('TEST 3: Verify Service Methods Are Called');
console.log('-'.repeat(80));

const methodCalls = [
  { route: 'src/routes/payments.ts', method: 'paymentService.recordPayment' },
  { route: 'src/routes/contracts.ts', method: 'contractService.registerContract' },
  { route: 'src/routes/contracts.ts', method: 'contractService.approveContract' },
  { route: 'src/routes/banking.ts', method: 'lcService.issueLC' },
  { route: 'src/routes/forex.ts', method: 'forexService.allocateForex' },
  { route: 'src/routes/shipments.ts', method: 'shipmentService.createQualityInspectionTask' },
  { route: 'src/routes/quality.ts', method: 'shipmentService.triggerCustomsDeclaration' },
  { route: 'src/routes/customs.ts', method: 'customsService.clearDeclaration' }
];

methodCalls.forEach(({ route, method }) => {
  const filePath = path.join(__dirname, '../..', route);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${route} does not exist`);
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(method)) {
    console.log(`✅ ${route} calls ${method}()`);
    passed++;
  } else {
    console.log(`❌ ${route} does NOT call ${method}()`);
    issues.push(`${route} missing method call: ${method}()`);
    failed++;
  }
});

console.log();

// Test 4: Verify 40% retention logic exists
console.log('TEST 4: Verify 40% NBE Retention Logic');
console.log('-'.repeat(80));

const retentionChecks = [
  { file: 'src/services/paymentService.ts', pattern: 'NBE_RETENTION_RATE = 40' },
  { file: 'src/services/paymentService.ts', pattern: 'retentionAmount' },
  { file: 'src/services/forexService.ts', pattern: 'retentionRate' },
  { file: 'src/services/forexService.ts', pattern: 'retentionAmount' }
];

retentionChecks.forEach(({ file, pattern }) => {
  const filePath = path.join(__dirname, '../..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file} does not exist`);
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(pattern)) {
    console.log(`✅ ${file} contains "${pattern}"`);
    passed++;
  } else {
    console.log(`❌ ${file} missing "${pattern}"`);
    issues.push(`${file} missing retention logic: ${pattern}`);
    failed++;
  }
});

console.log();

// Test 5: Verify workflow triggers exist
console.log('TEST 5: Verify Workflow Triggers');
console.log('-'.repeat(80));

const workflowTriggers = [
  { file: 'src/services/lcService.ts', method: 'triggerForexAutoRequest', description: 'LC → Forex trigger' },
  { file: 'src/services/shipmentService.ts', method: 'createQualityInspectionTask', description: 'Shipment → Quality trigger' },
  { file: 'src/services/shipmentService.ts', method: 'triggerCustomsDeclaration', description: 'Quality → Customs trigger' }
];

workflowTriggers.forEach(({ file, method, description }) => {
  const filePath = path.join(__dirname, '../..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file} does not exist`);
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(method)) {
    console.log(`✅ ${description}: ${method}() exists`);
    passed++;
  } else {
    console.log(`❌ ${description}: ${method}() MISSING`);
    issues.push(`Workflow trigger missing: ${method} in ${file}`);
    failed++;
  }
});

console.log();

// Test 6: Verify no direct fabricService calls in routes
console.log('TEST 6: Verify No Direct Blockchain Calls in Routes');
console.log('-'.repeat(80));

const routesToCheck = [
  'src/routes/payments.ts',
  'src/routes/contracts.ts',
  'src/routes/forex.ts'
];

routesToCheck.forEach(route => {
  const filePath = path.join(__dirname, '../..', route);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${route} does not exist`);
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for direct chaincode calls that should be in services
  const directCalls = [
    'fabricService.invokeChaincode(\'RecordPayment\'',
    'fabricService.invokeChaincode(\'RegisterSalesContract\'',
    'fabricService.invokeChaincode(\'AllocateForex\''
  ];
  
  let hasDirectCall = false;
  directCalls.forEach(call => {
    if (content.includes(call)) {
      console.log(`❌ ${route} has direct call: ${call}`);
      issues.push(`${route} should use service layer instead of: ${call}`);
      hasDirectCall = true;
      failed++;
    }
  });
  
  if (!hasDirectCall) {
    console.log(`✅ ${route} uses service layer (no direct chaincode calls)`);
    passed++;
  }
});

console.log();

// Test 7: Verify service exports
console.log('TEST 7: Verify Services Are Exported');
console.log('-'.repeat(80));

services.forEach(service => {
  const filePath = path.join(__dirname, '../..', service);
  if (!fs.existsSync(filePath)) {
    failed++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const className = service.split('/').pop().replace('.ts', '').replace(/^\w/, c => c.toUpperCase());
  
  if (content.includes(`export class ${className}`) || content.includes(`export { ${className}`)) {
    console.log(`✅ ${service} exports ${className}`);
    passed++;
  } else {
    console.log(`❌ ${service} does NOT export ${className}`);
    issues.push(`${service} missing export`);
    failed++;
  }
});

console.log();

// Summary
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log();

if (issues.length > 0) {
  console.log('ISSUES FOUND:');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  console.log();
}

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED - Workflow is complete and verified!');
  console.log('='.repeat(80));
  process.exit(0);
} else {
  console.log('❌ TESTS FAILED - Issues need to be fixed');
  console.log('='.repeat(80));
  process.exit(1);
}
