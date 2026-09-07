/**
 * Banks Portal Integration Validation Script
 * Validates that Tab 8 (LC Settlements) is properly integrated
 * 
 * Run: node tests/validate-banks-portal-integration.js
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('Banks Portal Integration Validator');
console.log('========================================\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(test) {
  results.passed.push(test);
  console.log(`✅ PASS: ${test}`);
}

function fail(test, reason) {
  results.failed.push({ test, reason });
  console.log(`❌ FAIL: ${test}`);
  if (reason) console.log(`   Reason: ${reason}`);
}

function warn(test, reason) {
  results.warnings.push({ test, reason });
  console.log(`⚠️  WARN: ${test}`);
  if (reason) console.log(`   Reason: ${reason}`);
}

// Test 1: Check if BanksPortal.tsx file exists
console.log('\n📁 FILE EXISTENCE CHECKS\n');
const banksPortalPath = path.join(__dirname, '..', 'ui', 'src', 'components', 'portals', 'BanksPortal.tsx');
if (fs.existsSync(banksPortalPath)) {
  pass('BanksPortal.tsx file exists');
} else {
  fail('BanksPortal.tsx file NOT found', `Expected at: ${banksPortalPath}`);
}

// Test 2: Check for PostDeliveryWorkflowPanel import
console.log('\n📦 IMPORT CHECKS\n');
if (fs.existsSync(banksPortalPath)) {
  const content = fs.readFileSync(banksPortalPath, 'utf8');
  
  if (content.includes("import PostDeliveryWorkflowPanel from '../PostDeliveryWorkflowPanel'") ||
      content.includes('import PostDeliveryWorkflowPanel')) {
    pass('PostDeliveryWorkflowPanel imported');
  } else {
    fail('PostDeliveryWorkflowPanel NOT imported');
  }
  
  // Test 3: Check for deliveredShipments state
  console.log('\n🔧 STATE MANAGEMENT CHECKS\n');
  if (content.includes('deliveredShipments') && content.includes('useState')) {
    pass('deliveredShipments state declared');
  } else {
    fail('deliveredShipments state NOT found');
  }
  
  // Test 4: Check for Tab 8 definition
  console.log('\n📑 TAB STRUCTURE CHECKS\n');
  if (content.includes('LC Settlements') || content.includes('LC Settlement')) {
    pass('LC Settlements tab label found');
  } else {
    fail('LC Settlements tab label NOT found');
  }
  
  // Test 5: Check for tab index 8
  const tabMatches = content.match(/value=\{(\d+)\}/g);
  if (tabMatches && tabMatches.some(m => m.includes('8'))) {
    pass('Tab index 8 exists');
  } else {
    fail('Tab index 8 NOT found');
  }
  
  // Test 6: Check for PostDeliveryWorkflowPanel usage
  console.log('\n🎯 COMPONENT USAGE CHECKS\n');
  if (content.includes('<PostDeliveryWorkflowPanel')) {
    pass('PostDeliveryWorkflowPanel component used');
    
    // Check for required props
    if (content.includes('shipmentId=')) {
      pass('shipmentId prop provided');
    } else {
      fail('shipmentId prop NOT provided');
    }
    
    if (content.includes('userRole=') || content.includes('userRole:"BANK"') || content.includes("userRole='BANK'")) {
      pass('userRole prop provided');
    } else {
      fail('userRole prop NOT provided');
    }
  } else {
    fail('PostDeliveryWorkflowPanel component NOT used');
  }
  
  // Test 7: Check for delivered shipments loading
  console.log('\n📡 DATA LOADING CHECKS\n');
  if (content.includes('status=DELIVERED') || content.includes('status=\'DELIVERED\'') || content.includes('status="DELIVERED"')) {
    pass('Filters for DELIVERED status');
  } else {
    warn('DELIVERED status filter not found', 'May use different filtering approach');
  }
  
  // Test 8: Check for KPI cards on Tab 8
  console.log('\n📊 KPI CHECKS\n');
  if (content.includes('KPI') || content.includes('Card')) {
    pass('Uses Card/KPI components');
  } else {
    warn('KPI cards may not be present', 'Check manually if metrics are displayed');
  }
  
  // Test 9: Check for mapping over delivered shipments
  console.log('\n🔄 ITERATION CHECKS\n');
  if (content.includes('deliveredShipments.map') || content.includes('deliveredShipments?.map')) {
    pass('Maps over deliveredShipments array');
  } else {
    warn('deliveredShipments.map not found', 'May use different rendering approach');
  }
  
  // Test 10: Check for refresh/reload functionality
  console.log('\n🔄 REFRESH FUNCTIONALITY\n');
  if (content.includes('onRefresh') || content.includes('loadBankingData')) {
    pass('Refresh functionality present');
  } else {
    warn('Refresh callback not found', 'Data may not auto-refresh');
  }
  
  // Test 11: Count total tabs
  console.log('\n🔢 TAB COUNT CHECK\n');
  const tabPanelMatches = content.match(/<TabPanel/g);
  if (tabPanelMatches) {
    const tabCount = tabPanelMatches.length;
    if (tabCount >= 9) {
      pass(`Has ${tabCount} tabs (includes Tab 8)`);
    } else {
      fail(`Only ${tabCount} tabs found`, 'Expected at least 9 tabs (0-8)');
    }
  } else {
    warn('Could not count tabs', 'Check manually');
  }
  
  // Test 12: TypeScript syntax check
  console.log('\n✍️  SYNTAX CHECKS\n');
  // Basic check for common syntax errors
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces === closeBraces) {
    pass('Brace matching looks good');
  } else {
    fail('Brace mismatch detected', `Open: ${openBraces}, Close: ${closeBraces}`);
  }
  
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens === closeParens) {
    pass('Parenthesis matching looks good');
  } else {
    fail('Parenthesis mismatch detected', `Open: ${openParens}, Close: ${closeParens}`);
  }
}

// Test 13: Check PostDeliveryWorkflowPanel component exists
console.log('\n🧩 DEPENDENCY CHECKS\n');
const panelPath = path.join(__dirname, '..', 'ui', 'src', 'components', 'PostDeliveryWorkflowPanel.tsx');
if (fs.existsSync(panelPath)) {
  pass('PostDeliveryWorkflowPanel.tsx exists');
} else {
  fail('PostDeliveryWorkflowPanel.tsx NOT found', 'Required dependency missing');
}

// Test 14: Check API routes exist
console.log('\n🌐 API ENDPOINT CHECKS\n');
const postDeliveryRoutePath = path.join(__dirname, '..', 'api', 'src', 'routes', 'postDelivery.ts');
if (fs.existsSync(postDeliveryRoutePath)) {
  pass('Post-delivery API routes exist');
} else {
  warn('postDelivery.ts routes not found', 'API endpoints may be in different file');
}

// Test 15: Check documentation
console.log('\n📖 DOCUMENTATION CHECKS\n');
const docPath = path.join(__dirname, '..', 'POST-DELIVERY-WORKFLOW-INTEGRATION-COMPLETE.md');
if (fs.existsSync(docPath)) {
  pass('Integration documentation exists');
} else {
  warn('Integration documentation not found', 'Create documentation for future reference');
}

// Test 16: Check test plan
const testPlanPath = path.join(__dirname, '..', 'BANKS-PORTAL-COMPREHENSIVE-TEST-PLAN.md');
if (fs.existsSync(testPlanPath)) {
  pass('Test plan exists');
} else {
  warn('Test plan not found');
}

// Summary
console.log('\n========================================');
console.log('VALIDATION SUMMARY');
console.log('========================================\n');

console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.failed.forEach(({ test, reason }) => {
    console.log(`   - ${test}`);
    if (reason) console.log(`     ${reason}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.warnings.forEach(({ test, reason }) => {
    console.log(`   - ${test}`);
    if (reason) console.log(`     ${reason}`);
  });
}

console.log('\n========================================');
if (results.failed.length === 0) {
  console.log('✅ VALIDATION PASSED');
  console.log('Tab 8 (LC Settlements) appears to be properly integrated!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run type-check (in ui folder)');
  console.log('2. Run: npm run build (in ui folder)');
  console.log('3. Run automated tests: npx playwright test tests/banks-portal-automated.test.js');
  console.log('4. Manual testing using: tests/banks-portal-manual-test-script.md');
  process.exit(0);
} else {
  console.log('❌ VALIDATION FAILED');
  console.log('Please fix the failed tests above before proceeding.');
  process.exit(1);
}
