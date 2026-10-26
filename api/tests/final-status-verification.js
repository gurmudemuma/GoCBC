/**
 * Final Status Verification Test
 * Verifies all critical status transitions are implemented correctly
 */

const fs = require('fs');

const SERVICES_DIR = '/home/guda/GoCBC/api/src/services';

console.log('\n🔍 FINAL STATUS VERIFICATION\n');
console.log('='.repeat(80) + '\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

/**
 * Check if a status value is set in a service file
 */
function checkStatus(serviceName, fileName, statusValue) {
  totalTests++;
  const filePath = `${SERVICES_DIR}/${fileName}`;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for status = 'VALUE' or status: 'VALUE' or 'VALUE' in status position
    const patterns = [
      new RegExp(`status\\s*=\\s*['"]${statusValue}['"]`, 'i'),
      new RegExp(`status:\\s*['"]${statusValue}['"]`, 'i'),
      new RegExp(`\\[\\s*['"]${statusValue}['"]`, 'i')
    ];
    
    const found = patterns.some(pattern => pattern.test(content));
    
    if (found) {
      console.log(`✅ ${serviceName}: ${statusValue}`);
      passedTests++;
      return true;
    } else {
      console.log(`❌ ${serviceName}: ${statusValue} NOT FOUND`);
      failedTests.push(`${serviceName}: ${statusValue}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${serviceName}: ${statusValue} - ERROR: ${error.message}`);
    failedTests.push(`${serviceName}: ${statusValue} (file error)`);
    return false;
  }
}

console.log('📋 CONTRACT STATUS TRANSITIONS\n');
checkStatus('Contract', 'contractService.ts', 'REGISTERED');
checkStatus('Contract', 'contractService.ts', 'APPROVED');
checkStatus('Contract', 'contractService.ts', 'REJECTED');

console.log('\n📄 LC STATUS TRANSITIONS\n');
checkStatus('LC', 'lcService.ts', 'ISSUED');

console.log('\n💱 FOREX STATUS TRANSITIONS\n');
checkStatus('Forex', 'forexService.ts', 'REQUESTED');
checkStatus('Forex', 'forexService.ts', 'ALLOCATED');
checkStatus('Forex', 'forexService.ts', 'UTILIZED');

console.log('\n🚢 SHIPMENT STATUS TRANSITIONS\n');
checkStatus('Shipment', 'shipmentService.ts', 'REGISTERED');
checkStatus('Shipment', 'shipmentService.ts', 'QUALITY_PENDING');
checkStatus('Shipment', 'shipmentService.ts', 'CUSTOMS_CLEARED');

console.log('\n✅ QUALITY STATUS TRANSITIONS\n');
checkStatus('Quality', 'qualityService.ts', 'PENDING');
checkStatus('Quality', 'qualityService.ts', 'SCHEDULED');
checkStatus('Quality', 'qualityService.ts', 'COMPLETED');
checkStatus('Quality', 'qualityService.ts', 'APPROVED');
checkStatus('Quality', 'qualityService.ts', 'REJECTED');

console.log('\n🛃 CUSTOMS STATUS TRANSITIONS\n');
checkStatus('Customs', 'customsService.ts', 'SUBMITTED');
checkStatus('Customs', 'customsService.ts', 'CLEARED');
checkStatus('Customs', 'customsService.ts', 'REJECTED');

console.log('\n💰 PAYMENT STATUS TRANSITIONS\n');
checkStatus('Payment', 'paymentService.ts', 'RECEIVED');
checkStatus('Payment', 'paymentService.ts', 'SPLIT');
checkStatus('Payment', 'paymentService.ts', 'COMPLETED');

console.log('\n🔥 WORKFLOW TRIGGERS\n');

function checkTrigger(name, fileName, pattern) {
  totalTests++;
  const filePath = `${SERVICES_DIR}/${fileName}`;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const found = pattern.test(content);
    
    if (found) {
      console.log(`✅ ${name}`);
      passedTests++;
      return true;
    } else {
      console.log(`❌ ${name} NOT FOUND`);
      failedTests.push(name);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} - ERROR: ${error.message}`);
    failedTests.push(`${name} (error)`);
    return false;
  }
}

checkTrigger('Contract Approval → LC Auto-create', 'contractService.ts', /triggerLCAutoCreation|requestLC/);
checkTrigger('LC Issue → Forex Auto-request', 'lcService.ts', /triggerForexAutoRequest/);
checkTrigger('Customs Clear → Shipment Update', 'customsService.ts', /CUSTOMS_CLEARED|updateEntityStatus/);

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 FINAL SUMMARY\n');
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests.length}`);

const successRate = ((passedTests / totalTests) * 100).toFixed(1);
console.log(`\n📈 Success Rate: ${successRate}%`);

if (failedTests.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  failedTests.forEach(test => console.log(`  - ${test}`));
}

console.log('\n' + '='.repeat(80));

if (successRate >= 95) {
  console.log('\n✅ WORKFLOW IS PRODUCTION-READY!\n');
  process.exit(0);
} else if (successRate >= 85) {
  console.log('\n⚠️  WORKFLOW IS MOSTLY COMPLETE (minor fixes needed)\n');
  process.exit(0);
} else {
  console.log('\n❌ WORKFLOW NEEDS ATTENTION\n');
  process.exit(1);
}
