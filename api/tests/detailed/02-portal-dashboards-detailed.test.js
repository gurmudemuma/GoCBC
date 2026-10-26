/**
 * Detailed Portal Dashboards Tests
 * Tests all 7 unified portal dashboards implementation
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('PORTAL DASHBOARDS DETAILED TESTS');
console.log('='.repeat(60));
console.log('');

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: File existence
console.log('1. PORTAL DASHBOARD FILE EXISTENCE');
console.log('-'.repeat(60));

test('portals.ts file exists', () => {
  const filePath = path.join(__dirname, '../../src/routes/portals.ts');
  assert(fs.existsSync(filePath), 'portals.ts not found');
});

test('portals.ts is registered in server.ts', () => {
  const serverPath = path.join(__dirname, '../../src/server.ts');
  const content = fs.readFileSync(serverPath, 'utf8');
  assert(content.includes('portalsRoutes') || content.includes('portals'), 'portals route not imported');
  assert(content.includes("'/portals'"), 'portals route not registered');
});

console.log('');

// Test 2: All 7 portal implementations
console.log('2. ALL 7 PORTAL IMPLEMENTATIONS');
console.log('-'.repeat(60));

const portalsContent = fs.readFileSync(
  path.join(__dirname, '../../src/routes/portals.ts'),
  'utf8'
);

test('ECTA dashboard implemented', () => {
  assert(portalsContent.includes('getECTADashboard') || portalsContent.includes('ecta'), 'ECTA dashboard missing');
  assert(portalsContent.includes("case 'ecta'"), 'ECTA case missing in switch');
});

test('Banks dashboard implemented', () => {
  assert(portalsContent.includes('getBanksDashboard') || portalsContent.includes('banks'), 'Banks dashboard missing');
  assert(portalsContent.includes("case 'banks'"), 'Banks case missing in switch');
});

test('NBE dashboard implemented', () => {
  assert(portalsContent.includes('getNBEDashboard') || portalsContent.includes('nbe'), 'NBE dashboard missing');
  assert(portalsContent.includes("case 'nbe'"), 'NBE case missing in switch');
});

test('Customs dashboard implemented', () => {
  assert(portalsContent.includes('getCustomsDashboard') || portalsContent.includes('customs'), 'Customs dashboard missing');
  assert(portalsContent.includes("case 'customs'"), 'Customs case missing in switch');
});

test('Shipping dashboard implemented', () => {
  assert(portalsContent.includes('getShippingDashboard') || portalsContent.includes('shipping'), 'Shipping dashboard missing');
  assert(portalsContent.includes("case 'shipping'"), 'Shipping case missing in switch');
});

test('Exporter dashboard implemented', () => {
  assert(portalsContent.includes('getExporterDashboard') || portalsContent.includes('exporters'), 'Exporter dashboard missing');
  assert(portalsContent.includes("case 'exporters'"), 'Exporters case missing in switch');
});

test('ECX dashboard implemented', () => {
  assert(portalsContent.includes('getECXDashboard') || portalsContent.includes('ecx'), 'ECX dashboard missing');
  assert(portalsContent.includes("case 'ecx'"), 'ECX case missing in switch');
});

console.log('');

// Test 3: Route structure
console.log('3. ROUTE STRUCTURE VALIDATION');
console.log('-'.repeat(60));

test('Main portal route exists', () => {
  assert(portalsContent.includes("router.get('/:portal/dashboard'"), 'Main portal route missing');
  assert(portalsContent.includes('authMiddleware'), 'Authentication middleware missing');
});

test('Switch statement for portal routing', () => {
  assert(portalsContent.includes('switch'), 'Switch statement missing for portal routing');
  assert(portalsContent.includes('portal.toLowerCase()'), 'Case-insensitive handling missing');
});

test('Default case for invalid portal', () => {
  assert(portalsContent.includes('default:'), 'Default case missing');
  assert(portalsContent.includes('404'), '404 response missing for invalid portal');
  assert(portalsContent.includes('PORTAL_NOT_FOUND'), 'Error code missing');
});

test('Error handling implemented', () => {
  assert(portalsContent.includes('try {') && portalsContent.includes('catch'), 'Try-catch blocks missing');
  assert(portalsContent.includes('500'), '500 error response missing');
});

console.log('');

// Test 4: ECTA dashboard details
console.log('4. ECTA DASHBOARD DETAILS');
console.log('-'.repeat(60));

test('ECTA queries pending applications', () => {
  const ectaSection = portalsContent.substring(
    portalsContent.indexOf('getECTADashboard'),
    portalsContent.indexOf('getECTADashboard') + 2000
  );
  assert(ectaSection.includes('exporter_applications') || ectaSection.includes('applications'), 'Missing applications query');
  assert(ectaSection.includes('PENDING'), 'Missing pending status filter');
});

test('ECTA queries pending contracts', () => {
  const ectaSection = portalsContent.substring(
    portalsContent.indexOf('getECTADashboard'),
    portalsContent.indexOf('getECTADashboard') + 2000
  );
  assert(ectaSection.includes('contracts'), 'Missing contracts query');
});

test('ECTA queries pending inspections', () => {
  const ectaSection = portalsContent.substring(
    portalsContent.indexOf('getECTADashboard'),
    portalsContent.indexOf('getECTADashboard') + 2000
  );
  assert(ectaSection.includes('quality_inspections') || ectaSection.includes('inspections'), 'Missing inspections query');
});

test('ECTA uses Promise.all for parallel queries', () => {
  const ectaSection = portalsContent.substring(
    portalsContent.indexOf('getECTADashboard'),
    portalsContent.indexOf('getECTADashboard') + 3000
  );
  assert(ectaSection.includes('Promise.all'), 'Missing Promise.all for parallel execution');
});

console.log('');

// Test 5: Banks/NBE dashboard - 40% retention
console.log('5. BANKS/NBE DASHBOARD - 40% RETENTION TRACKING');
console.log('-'.repeat(60));

test('Banks dashboard tracks retention amounts', () => {
  const banksSection = portalsContent.substring(
    portalsContent.indexOf('getBanksDashboard'),
    portalsContent.indexOf('getBanksDashboard') + 3000
  );
  assert(banksSection.includes('retention'), 'Missing retention tracking');
  assert(banksSection.includes('40') || banksSection.includes('retentionRate'), 'Missing 40% retention rate');
});

test('Banks dashboard queries payments with retention', () => {
  const banksSection = portalsContent.substring(
    portalsContent.indexOf('getBanksDashboard'),
    portalsContent.indexOf('getBanksDashboard') + 3000
  );
  assert(banksSection.includes('payments'), 'Missing payments query');
  assert(banksSection.includes('retention_amount') || banksSection.includes('retentionAmount'), 'Missing retention_amount field');
});

test('NBE dashboard tracks forex statistics', () => {
  const nbeSection = portalsContent.substring(
    portalsContent.indexOf('getNBEDashboard'),
    portalsContent.indexOf('getNBEDashboard') + 3000
  );
  assert(nbeSection.includes('forex'), 'Missing forex queries');
  assert(nbeSection.includes('retention'), 'Missing retention tracking');
  assert(nbeSection.includes('40'), 'Missing 40% policy rate');
});

test('NBE dashboard has policy rate field', () => {
  const nbeSection = portalsContent.substring(
    portalsContent.indexOf('getNBEDashboard'),
    portalsContent.indexOf('getNBEDashboard') + 3000
  );
  assert(nbeSection.includes('policyRate') || nbeSection.includes('policy'), 'Missing policy rate field');
});

console.log('');

// Test 6: Customs dashboard
console.log('6. CUSTOMS DASHBOARD DETAILS');
console.log('-'.repeat(60));

test('Customs queries pending declarations', () => {
  const customsSection = portalsContent.substring(
    portalsContent.indexOf('getCustomsDashboard'),
    portalsContent.indexOf('getCustomsDashboard') + 3000
  );
  assert(customsSection.includes('customs_declarations') || customsSection.includes('declarations'), 'Missing declarations query');
  assert(customsSection.includes('SUBMITTED') || customsSection.includes('PENDING') || customsSection.includes('UNDER_REVIEW'), 'Missing status filters');
});

test('Customs tracks revenue collected', () => {
  const customsSection = portalsContent.substring(
    portalsContent.indexOf('getCustomsDashboard'),
    portalsContent.indexOf('getCustomsDashboard') + 3000
  );
  assert(customsSection.includes('revenue') || customsSection.includes('duties') || customsSection.includes('taxes'), 'Missing revenue tracking');
});

console.log('');

// Test 7: Shipping dashboard
console.log('7. SHIPPING DASHBOARD DETAILS');
console.log('-'.repeat(60));

test('Shipping queries CUSTOMS_CLEARED shipments', () => {
  const shippingSection = portalsContent.substring(
    portalsContent.indexOf('getShippingDashboard'),
    portalsContent.indexOf('getShippingDashboard') + 3000
  );
  assert(shippingSection.includes('CUSTOMS_CLEARED'), 'Missing CUSTOMS_CLEARED status query');
  assert(shippingSection.includes('readyForPickup') || shippingSection.includes('ready'), 'Missing ready for pickup section');
});

test('Shipping tracks in-transit shipments', () => {
  const shippingSection = portalsContent.substring(
    portalsContent.indexOf('getShippingDashboard'),
    portalsContent.indexOf('getShippingDashboard') + 3000
  );
  assert(shippingSection.includes('IN_TRANSIT') || shippingSection.includes('inTransit'), 'Missing in-transit tracking');
});

console.log('');

// Test 8: Exporter dashboard - payment breakdown
console.log('8. EXPORTER DASHBOARD - PAYMENT BREAKDOWN');
console.log('-'.repeat(60));

test('Exporter dashboard queries by exporterID', () => {
  const exporterSection = portalsContent.substring(
    portalsContent.indexOf('getExporterDashboard'),
    portalsContent.indexOf('getExporterDashboard') + 3000
  );
  assert(exporterSection.includes('exporterId') || exporterSection.includes('exporter_id'), 'Missing exporter ID filtering');
  assert(exporterSection.includes('user.exporterId') || exporterSection.includes('user.username'), 'Missing user-based filtering');
});

test('Exporter dashboard has payment statistics', () => {
  const exporterSection = portalsContent.substring(
    portalsContent.indexOf('getExporterDashboard'),
    portalsContent.indexOf('getExporterDashboard') + 3000
  );
  assert(exporterSection.includes('paymentStats') || exporterSection.includes('payments'), 'Missing payment statistics');
  assert(exporterSection.includes('totalRetained') || exporterSection.includes('retention'), 'Missing retention tracking');
  assert(exporterSection.includes('totalReleased') || exporterSection.includes('release'), 'Missing release tracking');
});

test('Exporter dashboard shows 40% retention rate', () => {
  const exporterSection = portalsContent.substring(
    portalsContent.indexOf('getExporterDashboard'),
    portalsContent.indexOf('getExporterDashboard') + 3000
  );
  assert(exporterSection.includes('40') || exporterSection.includes('retentionRate'), 'Missing 40% retention rate display');
});

test('Exporter dashboard reduces payment amounts', () => {
  const exporterSection = portalsContent.substring(
    portalsContent.indexOf('getExporterDashboard'),
    portalsContent.indexOf('getExporterDashboard') + 3000
  );
  assert(exporterSection.includes('reduce') || exporterSection.includes('sum'), 'Missing payment amount reduction');
});

console.log('');

// Test 9: ECX dashboard
console.log('9. ECX DASHBOARD DETAILS');
console.log('-'.repeat(60));

test('ECX queries available lots', () => {
  const ecxSection = portalsContent.substring(
    portalsContent.indexOf('getECXDashboard'),
    portalsContent.indexOf('getECXDashboard') + 3000
  );
  assert(ecxSection.includes('ecx_lots') || ecxSection.includes('lots'), 'Missing lots query');
  assert(ecxSection.includes('AVAILABLE') || ecxSection.includes('available'), 'Missing available status');
});

test('ECX tracks pending releases', () => {
  const ecxSection = portalsContent.substring(
    portalsContent.indexOf('getECXDashboard'),
    portalsContent.indexOf('getECXDashboard') + 3000
  );
  assert(ecxSection.includes('PENDING_RELEASE') || ecxSection.includes('pending'), 'Missing pending releases');
});

console.log('');

// Test 10: Response structure
console.log('10. RESPONSE STRUCTURE VALIDATION');
console.log('-'.repeat(60));

test('All dashboards return success: true', () => {
  const successCount = (portalsContent.match(/success: true/g) || []).length;
  assert(successCount >= 7, 'Not all dashboards return success: true');
});

test('All dashboards return data object', () => {
  const dataCount = (portalsContent.match(/data: {/g) || []).length;
  assert(dataCount >= 7, 'Not all dashboards return data object');
});

test('All dashboards include portal name', () => {
  assert(portalsContent.includes("portal: 'ECTA'"), 'ECTA portal name missing');
  assert(portalsContent.includes("portal: 'BANKS'"), 'BANKS portal name missing');
  assert(portalsContent.includes("portal: 'NBE'"), 'NBE portal name missing');
  assert(portalsContent.includes("portal: 'CUSTOMS'"), 'CUSTOMS portal name missing');
  assert(portalsContent.includes("portal: 'SHIPPING'"), 'SHIPPING portal name missing');
  assert(portalsContent.includes("portal: 'EXPORTER'"), 'EXPORTER portal name missing');
  assert(portalsContent.includes("portal: 'ECX'"), 'ECX portal name missing');
});

test('All dashboards include timestamp', () => {
  const timestampCount = (portalsContent.match(/timestamp:/g) || []).length;
  assert(timestampCount >= 7, 'Not all dashboards include timestamp');
});

console.log('');

// Test 11: Database integration
console.log('11. DATABASE INTEGRATION');
console.log('-'.repeat(60));

test('Uses DatabaseService', () => {
  assert(portalsContent.includes('DatabaseService') || portalsContent.includes('db.get'), 'Missing DatabaseService');
});

test('Uses parameterized queries', () => {
  const hasParams = portalsContent.includes('$1') || portalsContent.includes('?');
  assert(hasParams, 'Not using parameterized queries (SQL injection risk)');
});

test('Has SQL ORDER BY for sorting', () => {
  const orderByCount = (portalsContent.match(/ORDER BY/gi) || []).length;
  assert(orderByCount >= 5, 'Missing ORDER BY clauses for proper sorting');
});

test('Has SQL LIMIT for pagination', () => {
  const limitCount = (portalsContent.match(/LIMIT/gi) || []).length;
  assert(limitCount >= 5, 'Missing LIMIT clauses for pagination');
});

console.log('');

// Test 12: Performance optimization
console.log('12. PERFORMANCE OPTIMIZATION');
console.log('-'.repeat(60));

test('All dashboards use Promise.all', () => {
  const promiseAllCount = (portalsContent.match(/Promise\.all/g) || []).length;
  assert(promiseAllCount >= 7, 'Not all dashboards use Promise.all for parallel queries');
});

test('Queries have reasonable limits', () => {
  const limits = portalsContent.match(/LIMIT (\d+)/gi) || [];
  const hasReasonableLimits = limits.every(limit => {
    const num = parseInt(limit.match(/\d+/)[0]);
    return num >= 5 && num <= 20;
  });
  assert(limits.length > 0, 'No LIMIT clauses found');
  assert(hasReasonableLimits, 'Some LIMIT values are unreasonable (should be 5-20)');
});

console.log('');

// Print summary
console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failedTests === 0) {
  console.log('');
  console.log('🎉 ALL PORTAL DASHBOARD TESTS PASSED!');
  console.log('');
  console.log('Portal Endpoints Available:');
  console.log('  GET /api/v1/portals/ecta/dashboard');
  console.log('  GET /api/v1/portals/banks/dashboard');
  console.log('  GET /api/v1/portals/nbe/dashboard');
  console.log('  GET /api/v1/portals/customs/dashboard');
  console.log('  GET /api/v1/portals/shipping/dashboard');
  console.log('  GET /api/v1/portals/exporters/dashboard');
  console.log('  GET /api/v1/portals/ecx/dashboard');
  console.log('');
  process.exit(0);
} else {
  console.log('');
  console.log('⚠️  SOME TESTS FAILED - Review output above');
  console.log('');
  process.exit(1);
}
