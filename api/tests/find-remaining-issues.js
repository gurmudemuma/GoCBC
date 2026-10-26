/**
 * Find Remaining Issues in GoCBC Workflow
 * Comprehensive analysis to identify any unfixed problems
 */

const fs = require('fs');
const path = require('path');

const issues = {
  critical: [],
  warnings: [],
  recommendations: [],
};

function checkFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

function checkExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

console.log('🔍 Scanning for remaining issues...\n');

// ============================================================================
// CHECK 1: Missing Service Files
// ============================================================================
console.log('📁 Checking service files...');

const requiredServices = [
  'contractService.ts',
  'lcService.ts',
  'forexService.ts',
  'shipmentService.ts',
  'paymentService.ts',
  'customsService.ts',
  'qualityService.ts',
];

requiredServices.forEach(service => {
  if (!checkExists(`../src/services/${service}`)) {
    issues.critical.push(`Missing service file: ${service}`);
  } else {
    console.log(`  ✅ ${service}`);
  }
});

// ============================================================================
// CHECK 2: Service Method Signatures
// ============================================================================
console.log('\n📝 Checking service method signatures...');

const contractService = checkFile('../src/services/contractService.ts');
if (contractService) {
  if (!contractService.includes('async registerContract(contractData:')) {
    issues.critical.push('ContractService.registerContract does not use object parameter');
  } else {
    console.log('  ✅ ContractService.registerContract');
  }
  
  if (!contractService.includes('async approveContract(approvalData:')) {
    issues.critical.push('ContractService.approveContract does not use object parameter');
  } else {
    console.log('  ✅ ContractService.approveContract');
  }
  
  if (!contractService.includes('async rejectContract(rejectionData:')) {
    issues.critical.push('ContractService.rejectContract does not use object parameter');
  } else {
    console.log('  ✅ ContractService.rejectContract');
  }
}

const lcService = checkFile('../src/services/lcService.ts');
if (lcService) {
  if (!lcService.includes('async issueLC(lcData:')) {
    issues.critical.push('LCService.issueLC does not use object parameter');
  } else {
    console.log('  ✅ LCService.issueLC');
  }
  
  // Check for 19 LC fields
  const lcFields = ['lcID', 'lcNumber', 'contractID', 'exporterID', 'issuingBank'];
  const missingFields = lcFields.filter(field => !lcService.includes(field));
  if (missingFields.length > 0) {
    issues.warnings.push(`LCService missing fields: ${missingFields.join(', ')}`);
  } else {
    console.log('  ✅ LCService has required fields');
  }
}

const forexService = checkFile('../src/services/forexService.ts');
if (forexService) {
  if (!forexService.includes('forexID?:') || !forexService.includes('forexId?:')) {
    issues.warnings.push('ForexService.allocateForex may not support both ID formats');
  } else {
    console.log('  ✅ ForexService.allocateForex (flexible IDs)');
  }
}

const shipmentService = checkFile('../src/services/shipmentService.ts');
if (shipmentService) {
  if (!shipmentService.includes('async createQualityInspectionTask(taskData:')) {
    issues.critical.push('ShipmentService.createQualityInspectionTask is not public');
  } else {
    console.log('  ✅ ShipmentService.createQualityInspectionTask');
  }
}

// ============================================================================
// CHECK 3: Workflow Triggers
// ============================================================================
console.log('\n🔥 Checking workflow triggers...');

if (lcService) {
  if (!lcService.includes('triggerForexAutoRequest')) {
    issues.critical.push('LC → Forex trigger missing');
  } else if (!lcService.includes('await this.triggerForexAutoRequest')) {
    issues.critical.push('LC → Forex trigger not called');
  } else {
    console.log('  ✅ LC → Forex trigger');
  }
}

if (shipmentService) {
  if (!shipmentService.includes('createQualityInspectionTaskInternal') && 
      !shipmentService.includes('createQualityInspectionTask')) {
    issues.critical.push('Shipment → Quality trigger missing');
  } else {
    console.log('  ✅ Shipment → Quality trigger');
  }
  
  if (!shipmentService.includes('triggerCustomsDeclaration')) {
    issues.critical.push('Quality → Customs trigger missing from ShipmentService');
  } else {
    console.log('  ✅ Quality → Customs trigger');
  }
}

const qualityRoute = checkFile('../src/routes/quality.ts');
if (qualityRoute && shipmentService) {
  if (!qualityRoute.includes('triggerCustomsDeclaration')) {
    issues.warnings.push('Quality route does not call triggerCustomsDeclaration');
  } else {
    console.log('  ✅ Quality route calls customs trigger');
  }
}

// ============================================================================
// CHECK 4: 40% NBE Retention
// ============================================================================
console.log('\n💰 Checking 40% retention implementation...');

if (forexService) {
  if (!forexService.includes('retentionAmount') || !forexService.includes('releaseAmount')) {
    issues.critical.push('ForexService missing retention calculation');
  } else if (!forexService.includes('retention_amount') || !forexService.includes('release_amount')) {
    issues.warnings.push('ForexService may not store retention in database');
  } else {
    console.log('  ✅ Forex retention calculation');
  }
}

const paymentService = checkFile('../src/services/paymentService.ts');
if (paymentService) {
  if (!paymentService.includes('NBE_RETENTION_RATE')) {
    issues.critical.push('PaymentService missing NBE_RETENTION_RATE constant');
  } else if (!paymentService.match(/NBE_RETENTION_RATE\s*=\s*40/)) {
    issues.critical.push('NBE_RETENTION_RATE is not set to 40');
  } else {
    console.log('  ✅ Payment retention (40%)');
  }
  
  if (!paymentService.includes('retentionAmount') || !paymentService.includes('releaseAmount')) {
    issues.critical.push('PaymentService missing retention calculation');
  } else {
    console.log('  ✅ Payment retention calculation');
  }
}

// ============================================================================
// CHECK 5: Route Integration
// ============================================================================
console.log('\n🛣️  Checking route integration...');

const bankingRoute = checkFile('../src/routes/banking.ts');
if (bankingRoute) {
  if (!bankingRoute.includes('lcService.issueLC')) {
    issues.critical.push('Banking route does not call lcService.issueLC');
  } else {
    console.log('  ✅ Banking route calls lcService.issueLC');
  }
}

const forexRoute = checkFile('../src/routes/forex.ts');
if (forexRoute) {
  if (!forexRoute.includes('forexService.allocateForex')) {
    issues.critical.push('Forex route does not call forexService.allocateForex');
  } else {
    console.log('  ✅ Forex route calls forexService.allocateForex');
  }
}

const contractsRoute = checkFile('../src/routes/contracts.ts');
if (contractsRoute) {
  if (!contractsRoute.includes('contractService.registerContract')) {
    issues.critical.push('Contracts route does not call contractService.registerContract');
  } else {
    console.log('  ✅ Contracts route integration');
  }
}

// ============================================================================
// CHECK 6: TypeScript Compilation
// ============================================================================
console.log('\n🔨 Checking TypeScript configuration...');

const tsconfig = checkFile('../tsconfig.json');
if (!tsconfig) {
  issues.warnings.push('tsconfig.json not found');
} else {
  console.log('  ✅ tsconfig.json exists');
}

// ============================================================================
// CHECK 7: Database Schema Support
// ============================================================================
console.log('\n🗄️  Checking database schema references...');

if (contractService) {
  if (!contractService.includes('buyer_name')) {
    issues.warnings.push('ContractService may not use buyer_name column');
  }
  if (!contractService.includes('buyer_bank')) {
    issues.warnings.push('ContractService may not use buyer_bank column');
  }
  if (!contractService.includes('exporter_bank')) {
    issues.warnings.push('ContractService may not use exporter_bank column');
  }
  console.log('  ✅ Contract database fields checked');
}

if (forexService) {
  if (!forexService.includes('retention_rate')) {
    issues.warnings.push('Forex database may not have retention_rate column');
  }
  console.log('  ✅ Forex database fields checked');
}

if (paymentService) {
  if (!paymentService.includes('retention_rate')) {
    issues.warnings.push('Payment database may not have retention_rate column');
  }
  console.log('  ✅ Payment database fields checked');
}

// ============================================================================
// CHECK 8: Error Handling
// ============================================================================
console.log('\n⚠️  Checking error handling...');

const servicesToCheck = [
  { name: 'ContractService', content: contractService },
  { name: 'LCService', content: lcService },
  { name: 'ForexService', content: forexService },
  { name: 'ShipmentService', content: shipmentService },
  { name: 'PaymentService', content: paymentService },
];

servicesToCheck.forEach(({ name, content }) => {
  if (content) {
    const tryCount = (content.match(/try\s*\{/g) || []).length;
    const catchCount = (content.match(/catch\s*\(/g) || []).length;
    
    if (tryCount === 0 && catchCount === 0) {
      issues.warnings.push(`${name} has no error handling`);
    } else if (tryCount !== catchCount) {
      issues.warnings.push(`${name} has mismatched try-catch blocks`);
    } else {
      console.log(`  ✅ ${name} error handling`);
    }
  }
});

// ============================================================================
// CHECK 9: Duplicate Code
// ============================================================================
console.log('\n📋 Checking for duplicate code...');

const routesToCheck = [
  { name: 'banking.ts', content: bankingRoute },
  { name: 'forex.ts', content: forexRoute },
];

routesToCheck.forEach(({ name, content }) => {
  if (content) {
    const responseCount = (content.match(/res\.status\(201\)\.json/g) || []).length;
    if (responseCount > 10) {
      issues.warnings.push(`${name} may have duplicate response blocks (${responseCount} found)`);
    } else {
      console.log(`  ✅ ${name} (no excessive duplicates)`);
    }
  }
});

// ============================================================================
// CHECK 10: Missing Imports
// ============================================================================
console.log('\n📦 Checking imports...');

if (bankingRoute && !bankingRoute.includes('LCService')) {
  issues.critical.push('Banking route missing LCService import');
}

if (forexRoute && !forexRoute.includes('ForexService')) {
  issues.critical.push('Forex route missing ForexService import');
}

console.log('  ✅ Import checks complete');

// ============================================================================
// GENERATE REPORT
// ============================================================================
console.log('\n' + '═'.repeat(80));
console.log('📊 ANALYSIS COMPLETE');
console.log('═'.repeat(80));

console.log(`\n🔴 Critical Issues: ${issues.critical.length}`);
issues.critical.forEach((issue, i) => {
  console.log(`  ${i + 1}. ${issue}`);
});

console.log(`\n🟡 Warnings: ${issues.warnings.length}`);
issues.warnings.forEach((issue, i) => {
  console.log(`  ${i + 1}. ${issue}`);
});

console.log(`\n💡 Recommendations: ${issues.recommendations.length}`);
issues.recommendations.forEach((issue, i) => {
  console.log(`  ${i + 1}. ${issue}`);
});

// Save report
const report = {
  timestamp: new Date().toISOString(),
  critical: issues.critical,
  warnings: issues.warnings,
  recommendations: issues.recommendations,
  summary: {
    criticalCount: issues.critical.length,
    warningsCount: issues.warnings.length,
    recommendationsCount: issues.recommendations.length,
  }
};

fs.writeFileSync(
  path.join(__dirname, '../../REMAINING-ISSUES-REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📄 Report saved to: REMAINING-ISSUES-REPORT.json');

// Exit code
if (issues.critical.length > 0) {
  console.log('\n❌ CRITICAL ISSUES FOUND - Must be fixed before production');
  process.exit(1);
} else if (issues.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS FOUND - Should be reviewed');
  process.exit(0);
} else {
  console.log('\n✅ NO ISSUES FOUND - All checks passed!');
  process.exit(0);
}
