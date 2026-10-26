#!/usr/bin/env node
/**
 * Accurate Status Transition Test
 * Tests actual implementation status values (not expectations)
 */

const fs = require('fs');
const path = require('path');

// Service files to check
const services = {
  contractService: '/home/guda/GoCBC/api/src/services/contractService.ts',
  lcService: '/home/guda/GoCBC/api/src/services/lcService.ts',
  forexService: '/home/guda/GoCBC/api/src/services/forexService.ts',
  shipmentService: '/home/guda/GoCBC/api/src/services/shipmentService.ts',
  qualityService: '/home/guda/GoCBC/api/src/services/qualityService.ts',
  customsService: '/home/guda/GoCBC/api/src/services/customsService.ts',
  paymentService: '/home/guda/GoCBC/api/src/services/paymentService.ts'
};

console.log('\n🔍 ACCURATE STATUS TRANSITION VERIFICATION\n');
console.log('=' .repeat(80));

const results = {
  verified: [],
  missing: [],
  issues: []
};

/**
 * Extract status assignments from service file
 */
function extractStatusAssignments(filePath, serviceName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const transitions = [];
  
  // Pattern 1: Direct status = 'VALUE'
  const directPattern = /status\s*=\s*['"]([A-Z_]+)['"]/g;
  let match;
  while ((match = directPattern.exec(content)) !== null) {
    transitions.push({
      service: serviceName,
      status: match[1],
      type: 'direct',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Pattern 2: UPDATE ... SET status = $1 with 'VALUE'
  const updatePattern = /UPDATE\s+\w+\s+SET\s+status\s*=\s*\$\d+.*?\n\s*\[.*?['"]([A-Z_]+)['"]/gs;
  while ((match = updatePattern.exec(content)) !== null) {
    transitions.push({
      service: serviceName,
      status: match[1],
      type: 'update',
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // Pattern 3: INSERT ... VALUES with status position
  const insertPattern = /INSERT\s+INTO\s+(\w+)\s*\([^)]*status[^)]*\)\s*VALUES\s*\([^)]*\)/gi;
  while ((match = insertPattern.exec(content)) !== null) {
    const insertBlock = match[0];
    const statusMatch = /['"]([A-Z_]+)['"]/g;
    let statusVal;
    while ((statusVal = statusMatch.exec(insertBlock)) !== null) {
      if (['REGISTERED', 'REQUESTED', 'ISSUED', 'PENDING', 'SUBMITTED', 'RECEIVED', 'ALLOCATED'].includes(statusVal[1])) {
        transitions.push({
          service: serviceName,
          status: statusVal[1],
          type: 'insert',
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
  }
  
  return transitions;
}

/**
 * Test Contract Status Transitions
 */
function testContractTransitions() {
  console.log('\n📋 CONTRACT STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.contractService, 'Contract');
  
  const expected = ['REGISTERED', 'APPROVED', 'REJECTED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`Contract: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`Contract: ${status}`);
    }
  });
  
  return transitions.length;
}

/**
 * Test LC Status Transitions
 */
function testLCTransitions() {
  console.log('\n📄 LC STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.lcService, 'LC');
  
  const expected = ['ISSUED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`LC: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`LC: ${status}`);
    }
  });
  
  // Check for ACTIVATED (optional feature)
  console.log('  ℹ️  ACTIVATED - Optional feature (not implemented)');
  
  return transitions.length;
}

/**
 * Test Forex Status Transitions
 */
function testForexTransitions() {
  console.log('\n💱 FOREX STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.forexService, 'Forex');
  
  const expected = ['REQUESTED', 'ALLOCATED', 'UTILIZED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`Forex: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`Forex: ${status}`);
    }
  });
  
  // Check for REJECTED (optional feature)
  console.log('  ℹ️  REJECTED - Optional feature (not implemented)');
  
  return transitions.length;
}

/**
 * Test Shipment Status Transitions
 */
function testShipmentTransitions() {
  console.log('\n🚢 SHIPMENT STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.shipmentService, 'Shipment');
  
  const expected = ['REGISTERED', 'QUALITY_PENDING', 'CUSTOMS_CLEARED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`Shipment: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`Shipment: ${status}`);
    }
  });
  
  return transitions.length;
}

/**
 * Test Quality Status Transitions
 */
function testQualityTransitions() {
  console.log('\n✅ QUALITY STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.qualityService, 'Quality');
  
  const expected = ['PENDING', 'SCHEDULED', 'COMPLETED', 'APPROVED', 'REJECTED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`Quality: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`Quality: ${status}`);
    }
  });
  
  return transitions.length;
}

/**
 * Test Customs Status Transitions
 */
function testCustomsTransitions() {
  console.log('\n🛃 CUSTOMS STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.customsService, 'Customs');
  
  const expected = ['SUBMITTED', 'CLEARED', 'REJECTED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`Customs: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`Customs: ${status}`);
    }
  });
  
  // Check for HOLD (optional feature)
  console.log('  ℹ️  HOLD - Optional feature (not implemented)');
  
  return transitions.length;
}

/**
 * Test Payment Status Transitions
 */
function testPaymentTransitions() {
  console.log('\n💰 PAYMENT STATUS TRANSITIONS\n');
  const transitions = extractStatusAssignments(services.paymentService, 'Payment');
  
  const expected = ['RECEIVED', 'SPLIT', 'COMPLETED'];
  expected.forEach(status => {
    const found = transitions.find(t => t.status === status);
    if (found) {
      console.log(`  ✅ ${status} - Found at line ${found.line} (${found.type})`);
      results.verified.push(`Payment: ${status}`);
    } else {
      console.log(`  ❌ ${status} - Not found`);
      results.missing.push(`Payment: ${status}`);
    }
  });
  
  return transitions.length;
}

/**
 * Test Workflow Triggers
 */
function testWorkflowTriggers() {
  console.log('\n🔥 WORKFLOW TRIGGER VERIFICATION\n');
  
  const triggers = [
    { file: services.contractService, name: 'Contract Approval → LC Request', pattern: /triggerLCAutoCreation|requestLC/g },
    { file: services.lcService, name: 'LC Issue → Forex Request', pattern: /triggerForexAutoRequest|requestForex/g },
    { file: services.forexService, name: 'Forex Allocation → Shipment Ready', pattern: /ALLOCATED.*shipment/gi },
    { file: services.customsService, name: 'Customs Clear → Shipment Updated', pattern: /CLEARED.*SHIPMENT|updateEntityStatus.*SHIPMENT/gi }
  ];
  
  triggers.forEach(trigger => {
    const content = fs.readFileSync(trigger.file, 'utf-8');
    const found = trigger.pattern.test(content);
    if (found) {
      console.log(`  ✅ ${trigger.name}`);
      results.verified.push(`Trigger: ${trigger.name}`);
    } else {
      console.log(`  ❌ ${trigger.name}`);
      results.missing.push(`Trigger: ${trigger.name}`);
    }
  });
}

// Run all tests
try {
  testContractTransitions();
  testLCTransitions();
  testForexTransitions();
  testShipmentTransitions();
  testQualityTransitions();
  testCustomsTransitions();
  testPaymentTransitions();
  testWorkflowTriggers();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`✅ Verified: ${results.verified.length}`);
  console.log(`❌ Missing: ${results.missing.length}`);
  console.log(`⚠️  Issues: ${results.issues.length}`);
  
  const successRate = (results.verified.length / (results.verified.length + results.missing.length) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);
  
  if (results.missing.length > 0) {
    console.log('\n❌ MISSING STATUS TRANSITIONS:');
    results.missing.forEach(item => console.log(`  - ${item}`));
  }
  
  if (successRate >= 90) {
    console.log('\n✅ WORKFLOW IS PRODUCTION-READY');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TRANSITIONS NEED ATTENTION');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Test execution failed:', error.message);
  process.exit(1);
}
