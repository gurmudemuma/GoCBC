/**
 * Quick Integration Test for Banks Portal Tab 8
 * Tests basic integration without browser automation
 * 
 * Run: node tests/quick-integration-test.js
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('Banks Portal Tab 8 - Quick Integration Test');
console.log('========================================\n');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(test) {
  passed++;
  console.log(`✅ PASS: ${test}`);
}

function fail(test, reason) {
  failed++;
  console.log(`❌ FAIL: ${test}`);
  if (reason) console.log(`   └─ ${reason}`);
}

function warn(test, reason) {
  warnings++;
  console.log(`⚠️  WARN: ${test}`);
  if (reason) console.log(`   └─ ${reason}`);
}

console.log('📋 TEST 1: File Structure Verification\n');

// Test 1: Check BanksPortal.tsx exists
const banksPortalPath = path.join(__dirname, '..', 'ui', 'src', 'components', 'portals', 'BanksPortal.tsx');
if (fs.existsSync(banksPortalPath)) {
  pass('BanksPortal.tsx exists');
  
  const content = fs.readFileSync(banksPortalPath, 'utf8');
  
  // Test 2: Check for PostDeliveryWorkflowPanel import
  if (content.includes('PostDeliveryWorkflowPanel')) {
    pass('PostDeliveryWorkflowPanel imported');
    
    // Check import path
    if (content.includes("from '../shared/PostDeliveryWorkflowPanel'") || 
        content.includes('from "../shared/PostDeliveryWorkflowPanel"')) {
      pass('Import path correct (shared folder)');
    } else {
      warn('Import path may be incorrect', 'Expected: ../shared/PostDeliveryWorkflowPanel');
    }
  } else {
    fail('PostDeliveryWorkflowPanel NOT imported');
  }
  
  // Test 3: Check for Tab 8 implementation
  if (content.includes('activeTab === 8')) {
    pass('Tab 8 logic implemented');
    
    // Count occurrences
    const matches = content.match(/activeTab === 8/g);
    console.log(`   └─ Found ${matches ? matches.length : 0} references to Tab 8`);
  } else {
    fail('Tab 8 logic NOT found');
  }
  
  // Test 4: Check for LC Settlements label
  if (content.includes('LC Settlements') || content.includes('LC Settlement')) {
    pass('LC Settlements tab label present');
  } else {
    fail('LC Settlements label NOT found');
  }
  
  // Test 5: Check for deliveredShipments state
  if (content.includes('deliveredShipments') && content.includes('useState')) {
    pass('deliveredShipments state declared');
  } else {
    fail('deliveredShipments state NOT found');
  }
  
  // Test 6: Check for PostDeliveryWorkflowPanel usage
  if (content.includes('<PostDeliveryWorkflowPanel')) {
    pass('PostDeliveryWorkflowPanel component used');
    
    // Check props
    if (content.includes('shipmentId=')) {
      pass('shipmentId prop provided');
    } else {
      fail('shipmentId prop missing');
    }
    
    if (content.includes('userRole')) {
      pass('userRole prop provided');
      
      if (content.includes('userRole="BANK"') || content.includes("userRole='BANK'")) {
        pass('userRole set to "BANK"');
      } else {
        warn('userRole may not be "BANK"', 'Check if it uses a variable');
      }
    } else {
      fail('userRole prop missing');
    }
    
    if (content.includes('onRefresh')) {
      pass('onRefresh callback provided');
    } else {
      warn('onRefresh callback missing', 'Workflow may not auto-refresh');
    }
  } else {
    fail('PostDeliveryWorkflowPanel component NOT used');
  }
  
  // Test 7: Check for DELIVERED status filter
  if (content.includes('DELIVERED')) {
    pass('Filters for DELIVERED shipments');
  } else {
    warn('DELIVERED filter not explicit', 'May use different filtering');
  }
  
  // Test 8: Check tab structure
  const tabMatches = content.match(/index:\s*8/g);
  if (tabMatches && tabMatches.length > 0) {
    pass('Tab definition with index: 8 found');
  } else {
    warn('Tab index: 8 not found in tab definitions', 'May use array position instead');
  }
  
} else {
  fail('BanksPortal.tsx NOT found', `Expected at: ${banksPortalPath}`);
}

console.log('\n📋 TEST 2: Component Dependencies\n');

// Test 9: Check PostDeliveryWorkflowPanel exists
const panelPath = path.join(__dirname, '..', 'ui', 'src', 'components', 'shared', 'PostDeliveryWorkflowPanel.tsx');
if (fs.existsSync(panelPath)) {
  pass('PostDeliveryWorkflowPanel.tsx exists in shared/');
} else {
  fail('PostDeliveryWorkflowPanel.tsx NOT found in shared/', 'Component dependency missing');
}

console.log('\n📋 TEST 3: Integration Points\n');

// Test 10: Check other portal integrations
const portals = [
  { name: 'ExporterPortal', path: 'ui/src/components/portals/ExporterPortal.tsx' },
  { name: 'ECTAPortal', path: 'ui/src/components/portals/ECTAPortal.tsx' },
  { name: 'NBEPortal', path: 'ui/src/components/portals/NBEPortal.tsx' },
  { name: 'ShippingPortal', path: 'ui/src/components/portals/ShippingPortal.tsx' }
];

let integratedPortals = 0;
portals.forEach(portal => {
  const portalPath = path.join(__dirname, '..', portal.path);
  if (fs.existsSync(portalPath)) {
    const content = fs.readFileSync(portalPath, 'utf8');
    if (content.includes('PostDeliveryWorkflowPanel')) {
      pass(`${portal.name} integrated with PostDeliveryWorkflowPanel`);
      integratedPortals++;
    } else {
      warn(`${portal.name} NOT integrated`, 'May not need post-delivery workflow');
    }
  }
});

console.log(`   └─ Total portals integrated: ${integratedPortals}/4`);

console.log('\n📋 TEST 4: System Health\n');

// Test 11: Check if system is running (simple check)
const http = require('http');

function checkEndpoint(url, name) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 401) {
        pass(`${name} is responding`);
        resolve(true);
      } else {
        warn(`${name} responded with status ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', () => {
      fail(`${name} is NOT running`, 'Start system with START-SYSTEM.bat');
      resolve(false);
    });
  });
}

(async () => {
  await checkEndpoint('http://localhost:3001/health', 'API Server');
  await checkEndpoint('http://localhost:3000', 'UI Server');

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  console.log(`✅ Passed:   ${passed}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`📊 Total:    ${passed + failed + warnings}`);

  const passRate = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log(`\n📈 Pass Rate: ${passRate}%`);

  console.log('\n========================================');
  
  if (failed === 0) {
    console.log('✅ INTEGRATION TEST PASSED');
    console.log('\nTab 8 (LC Settlements) is properly integrated!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Login as bank_admin at http://localhost:3000');
    console.log('   2. Navigate to Banks Portal');
    console.log('   3. Count tabs - should be 9 (indices 0-8)');
    console.log('   4. Click "LC Settlements" tab');
    console.log('   5. Verify PostDeliveryWorkflowPanel displays');
    console.log('   6. Test "Record Payment" functionality');
    console.log('   7. Test "Record LC Settlement" functionality');
    
    if (warnings > 0) {
      console.log('\n⚠️  Note: Some warnings present, but not critical');
    }
    
    process.exit(0);
  } else {
    console.log('❌ INTEGRATION TEST FAILED');
    console.log(`\n${failed} critical issue(s) detected.`);
    console.log('Please review the failed tests above.');
    
    console.log('\n🔧 Quick Fixes:');
    if (!fs.existsSync(banksPortalPath)) {
      console.log('   - Verify BanksPortal.tsx file exists');
    }
    if (!fs.existsSync(panelPath)) {
      console.log('   - Verify PostDeliveryWorkflowPanel.tsx exists in shared/ folder');
    }
    console.log('   - Check import statements are correct');
    console.log('   - Verify component usage in BanksPortal.tsx');
    
    process.exit(1);
  }
})();
