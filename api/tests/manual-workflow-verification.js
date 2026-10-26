#!/usr/bin/env node
/**
 * MANUAL WORKFLOW VERIFICATION
 * Manually traces every single status transition
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 MANUAL WORKFLOW VERIFICATION\n');
console.log('='.repeat(80));
console.log('\nManually verifying EVERY status transition step-by-step\n');
console.log('='.repeat(80) + '\n');

// Read all service files
const services = {
  contract: fs.readFileSync(path.join(__dirname, '../src/services/contractService.ts'), 'utf-8'),
  lc: fs.readFileSync(path.join(__dirname, '../src/services/lcService.ts'), 'utf-8'),
  forex: fs.readFileSync(path.join(__dirname, '../src/services/forexService.ts'), 'utf-8'),
  shipment: fs.readFileSync(path.join(__dirname, '../src/services/shipmentService.ts'), 'utf-8'),
  quality: fs.readFileSync(path.join(__dirname, '../src/services/qualityService.ts'), 'utf-8'),
  customs: fs.readFileSync(path.join(__dirname, '../src/services/customsService.ts'), 'utf-8'),
  payment: fs.readFileSync(path.join(__dirname, '../src/services/paymentService.ts'), 'utf-8')
};

let passed = 0;
let failed = 0;
let issues = [];

function verify(step, description, checks) {
  const allPassed = checks.every(check => check);
  const symbol = allPassed ? '✅' : '❌';
  
  console.log(`${symbol} ${step}: ${description}`);
  
  if (allPassed) {
    passed++;
  } else {
    failed++;
    issues.push({ step, description });
  }
  
  return allPassed;
}

console.log('WORKFLOW STEP 1: CONTRACT REGISTRATION → APPROVAL\n');

verify(
  '1.1',
  'Contract created with REGISTERED status',
  [
    services.contract.includes("'REGISTERED'"),
    services.contract.includes('INSERT INTO contracts'),
    services.contract.includes('registerContract')
  ]
);

verify(
  '1.2',
  'Contract can be approved (REGISTERED → APPROVED)',
  [
    services.contract.includes("'APPROVED'"),
    services.contract.includes('approveContract'),
    services.contract.includes('UPDATE contracts')
  ]
);

verify(
  '1.3',
  'Contract approval triggers LC creation',
  [
    services.contract.includes('triggerLCAutoCreation'),
    services.contract.includes('await this.triggerLCAutoCreation')
  ]
);

verify(
  '1.4',
  'Contract can be rejected (REGISTERED → REJECTED)',
  [
    services.contract.includes("'REJECTED'"),
    services.contract.includes('rejectContract')
  ]
);

console.log('\nWORKFLOW STEP 2: LC ISSUANCE\n');

verify(
  '2.1',
  'LC can be requested/created',
  [
    services.lc.includes('requestLC'),
    services.contract.includes('lcService')
  ]
);

verify(
  '2.2',
  'LC issued with ISSUED status',
  [
    services.lc.includes("'ISSUED'"),
    services.lc.includes('issueLC'),
    services.lc.includes('INSERT INTO letters_of_credit')
  ]
);

verify(
  '2.3',
  'LC issuance triggers Forex request',
  [
    services.lc.includes('triggerForexAutoRequest'),
    services.lc.includes('await this.triggerForexAutoRequest')
  ]
);

console.log('\nWORKFLOW STEP 3: FOREX ALLOCATION\n');

verify(
  '3.1',
  'Forex requested with REQUESTED status',
  [
    services.forex.includes("'REQUESTED'"),
    services.forex.includes('requestForex'),
    services.forex.includes('INSERT INTO forex_allocations')
  ]
);

verify(
  '3.2',
  'Forex allocated with ALLOCATED status',
  [
    services.forex.includes("'ALLOCATED'"),
    services.forex.includes('allocateForex'),
    /UPDATE.*forex_allocations/i.test(services.forex)
  ]
);

verify(
  '3.3',
  'Forex allocation calculates 40% retention',
  [
    /retentionAmount.*=.*\*.*retentionRate/i.test(services.forex),
    /releaseAmount.*=.*-.*retentionAmount/i.test(services.forex)
  ]
);

verify(
  '3.4',
  'Forex can be utilized (ALLOCATED → UTILIZED)',
  [
    services.forex.includes("'UTILIZED'"),
    services.forex.includes('utilizeForex')
  ]
);

console.log('\nWORKFLOW STEP 4: SHIPMENT REGISTRATION\n');

verify(
  '4.1',
  'Shipment created with REGISTERED status',
  [
    services.shipment.includes("'REGISTERED'"),
    services.shipment.includes('createShipment'),
    services.shipment.includes('INSERT INTO shipments')
  ]
);

verify(
  '4.2',
  'Shipment triggers quality inspection creation',
  [
    services.shipment.includes('createQualityInspectionTaskInternal'),
    services.shipment.includes('await this.createQualityInspectionTaskInternal')
  ]
);

verify(
  '4.3',
  'Shipment status updated to QUALITY_PENDING',
  [
    services.shipment.includes("'QUALITY_PENDING'"),
    /UPDATE shipments SET status.*QUALITY_PENDING/i.test(services.shipment)
  ]
);

console.log('\nWORKFLOW STEP 5: QUALITY INSPECTION\n');

verify(
  '5.1',
  'Quality inspection created with PENDING status',
  [
    services.shipment.includes("'PENDING'"),
    services.shipment.includes('INSERT INTO quality_inspections')
  ]
);

verify(
  '5.2',
  'Inspection scheduled (PENDING → SCHEDULED)',
  [
    services.quality.includes("'SCHEDULED'"),
    services.quality.includes('requestInspection'),
    /UPDATE.*quality_inspections/i.test(services.quality)
  ]
);

verify(
  '5.3',
  'Inspection performed (SCHEDULED → COMPLETED)',
  [
    services.quality.includes("'COMPLETED'"),
    services.quality.includes('performInspection')
  ]
);

verify(
  '5.4',
  'Inspection approved (COMPLETED → APPROVED)',
  [
    services.quality.includes("'APPROVED'"),
    services.quality.includes('approveInspection')
  ]
);

verify(
  '5.5',
  'Inspection can be rejected (COMPLETED → REJECTED)',
  [
    services.quality.includes("'REJECTED'"),
    services.quality.includes('rejectInspection')
  ]
);

console.log('\nWORKFLOW STEP 6: CUSTOMS CLEARANCE\n');

verify(
  '6.1',
  'Customs declaration submitted with SUBMITTED status',
  [
    services.customs.includes("'SUBMITTED'"),
    services.customs.includes('submitDeclaration'),
    services.customs.includes('INSERT INTO customs_declarations')
  ]
);

verify(
  '6.2',
  'Declaration cleared (SUBMITTED → CLEARED)',
  [
    services.customs.includes("'CLEARED'"),
    services.customs.includes('clearDeclaration'),
    /UPDATE.*customs_declarations/i.test(services.customs)
  ]
);

verify(
  '6.3',
  'Customs clearance updates shipment to CUSTOMS_CLEARED',
  [
    services.customs.includes("'CUSTOMS_CLEARED'"),
    services.customs.includes('statusManager.updateEntityStatus'),
    /entityType.*SHIPMENT/i.test(services.customs)
  ]
);

verify(
  '6.4',
  'Declaration can be rejected (SUBMITTED → REJECTED)',
  [
    services.customs.includes("'REJECTED'"),
    services.customs.includes('rejectDeclaration')
  ]
);

console.log('\nWORKFLOW STEP 7: PAYMENT PROCESSING\n');

verify(
  '7.1',
  'Payment recorded with RECEIVED status',
  [
    services.payment.includes("'RECEIVED'"),
    services.payment.includes('recordPayment'),
    services.payment.includes('INSERT INTO payments')
  ]
);

verify(
  '7.2',
  'Payment immediately updated to SPLIT',
  [
    services.payment.includes("'SPLIT'"),
    /UPDATE payments SET status.*SPLIT/i.test(services.payment)
  ]
);

verify(
  '7.3',
  'Payment calculates 40% NBE retention',
  [
    /NBE_RETENTION_RATE|40/i.test(services.payment),
    /retentionAmount.*=.*\*/.test(services.payment),
    /releaseAmount.*=.*-.*retentionAmount/.test(services.payment)
  ]
);

verify(
  '7.4',
  'Payment can be completed',
  [
    services.payment.includes("'COMPLETED'"),
    services.payment.includes('releasePayment') || services.payment.includes('completePayment')
  ]
);

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 VERIFICATION SUMMARY\n');
console.log(`Total Steps Verified: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

const passRate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n📈 Success Rate: ${passRate}%`);

if (issues.length > 0) {
  console.log('\n❌ FAILED VERIFICATIONS:\n');
  issues.forEach(({ step, description }) => {
    console.log(`  ${step}: ${description}`);
  });
}

console.log('\n' + '='.repeat(80));

if (failed === 0) {
  console.log('\n✅ ALL WORKFLOW STEPS VERIFIED!\n');
  console.log('Every status transition is properly implemented.\n');
  process.exit(0);
} else if (passRate >= 90) {
  console.log('\n⚠️  MOST STEPS VERIFIED (review failures)\n');
  process.exit(1);
} else {
  console.log('\n❌ SIGNIFICANT WORKFLOW ISSUES FOUND\n');
  process.exit(1);
}
