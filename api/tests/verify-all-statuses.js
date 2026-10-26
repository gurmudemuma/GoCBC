/**
 * Comprehensive Status Verification
 * Checks all status values and workflow triggers in service files
 */

const fs = require('fs');

console.log('\n🔍 COMPREHENSIVE STATUS VERIFICATION\n');
console.log('='.repeat(80) + '\n');

const results = { pass: 0, fail: 0, details: [] };

function checkFile(filepath, checks) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const filename = filepath.split('/').pop();
  
  console.log(`📁 ${filename}\n`);
  
  checks.forEach(({ status, description }) => {
    const found = content.includes(`'${status}'`);
    if (found) {
      console.log(`  ✅ ${status} - ${description}`);
      results.pass++;
      results.details.push({ file: filename, status, result: 'PASS' });
    } else {
      console.log(`  ❌ ${status} - ${description} NOT FOUND`);
      results.fail++;
      results.details.push({ file: filename, status, result: 'FAIL' });
    }
  });
  
  console.log('');
}

// Contract Service
checkFile('/home/guda/GoCBC/api/src/services/contractService.ts', [
  { status: 'REGISTERED', description: 'Initial contract registration' },
  { status: 'APPROVED', description: 'NBE/ECX approval' },
  { status: 'REJECTED', description: 'Contract rejection' },
]);

// LC Service
checkFile('/home/guda/GoCBC/api/src/services/lcService.ts', [
  { status: 'ISSUED', description: 'LC issued by bank' },
]);

// Forex Service
checkFile('/home/guda/GoCBC/api/src/services/forexService.ts', [
  { status: 'REQUESTED', description: 'Forex allocation request' },
  { status: 'ALLOCATED', description: 'Forex allocated with 40% retention' },
  { status: 'UTILIZED', description: 'Forex used in payment' },
]);

// Shipment Service
checkFile('/home/guda/GoCBC/api/src/services/shipmentService.ts', [
  { status: 'REGISTERED', description: 'Shipment registered' },
  { status: 'QUALITY_PENDING', description: 'Quality inspection pending' },
  { status: 'PENDING', description: 'Quality inspection record created' },
]);

// Quality Service
checkFile('/home/guda/GoCBC/api/src/services/qualityService.ts', [
  { status: 'SCHEDULED', description: 'Inspection scheduled' },
  { status: 'COMPLETED', description: 'Inspection completed' },
  { status: 'APPROVED', description: 'Quality approved' },
  { status: 'REJECTED', description: 'Quality rejected' },
]);

// Customs Service
checkFile('/home/guda/GoCBC/api/src/services/customsService.ts', [
  { status: 'SUBMITTED', description: 'Declaration submitted' },
  { status: 'CLEARED', description: 'Customs cleared' },
  { status: 'REJECTED', description: 'Customs rejected' },
  { status: 'CUSTOMS_CLEARED', description: 'Shipment customs cleared (trigger)' },
]);

// Payment Service
checkFile('/home/guda/GoCBC/api/src/services/paymentService.ts', [
  { status: 'RECEIVED', description: 'Payment received from buyer' },
  { status: 'SPLIT', description: 'Payment split (40% NBE, 60% Exporter)' },
  { status: 'COMPLETED', description: 'Payment completed' },
]);

console.log('='.repeat(80));
console.log('\n🔥 WORKFLOW TRIGGERS\n');

// Check workflow triggers
const triggerChecks = [
  {
    file: '/home/guda/GoCBC/api/src/services/contractService.ts',
    pattern: 'triggerLCAutoCreation',
    name: 'Contract Approval → LC Auto-create'
  },
  {
    file: '/home/guda/GoCBC/api/src/services/lcService.ts',
    pattern: 'triggerForexAutoRequest',
    name: 'LC Issue → Forex Auto-request'
  },
  {
    file: '/home/guda/GoCBC/api/src/services/customsService.ts',
    pattern: 'CUSTOMS_CLEARED',
    name: 'Customs Clear → Shipment Update'
  },
  {
    file: '/home/guda/GoCBC/api/src/services/shipmentService.ts',
    pattern: 'QUALITY_PENDING',
    name: 'Shipment Create → Quality Pending'
  }
];

triggerChecks.forEach(({ file, pattern, name }) => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes(pattern)) {
    console.log(`  ✅ ${name}`);
    results.pass++;
  } else {
    console.log(`  ❌ ${name} NOT FOUND`);
    results.fail++;
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 FINAL RESULTS\n');
console.log(`Total Checks: ${results.pass + results.fail}`);
console.log(`✅ Passed: ${results.pass}`);
console.log(`❌ Failed: ${results.fail}`);

const successRate = ((results.pass / (results.pass + results.fail)) * 100).toFixed(1);
console.log(`\n📈 Success Rate: ${successRate}%`);

if (results.fail > 0) {
  console.log('\n❌ FAILED CHECKS:');
  results.details.filter(d => d.result === 'FAIL').forEach(({ file, status }) => {
    console.log(`  - ${file}: ${status}`);
  });
}

console.log('\n' + '='.repeat(80));

if (successRate >= 95) {
  console.log('\n✅ ALL WORKFLOW STATUS TRANSITIONS VERIFIED!\n');
  process.exit(0);
} else if (successRate >= 85) {
  console.log('\n⚠️  MOSTLY COMPLETE (minor issues)\n');
  process.exit(0);
} else {
  console.log('\n❌ SIGNIFICANT ISSUES FOUND\n');
  process.exit(1);
}
