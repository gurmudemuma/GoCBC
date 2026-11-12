#!/usr/bin/env node
// Test the updated document validation

const { validateDocument } = require('./api/dist/utils/documentValidation');

console.log('Testing Document Validation...\n');

// Test 1: JPG file for CONTRACT_SIGNED (should now pass)
console.log('Test 1: JPG for CONTRACT_SIGNED');
const result1 = validateDocument('CONTRACT_SIGNED', 'image/jpeg', 2042600);
console.log(`  Valid: ${result1.valid}`);
console.log(`  Errors: ${result1.errors.join(', ') || 'None'}`);
console.log(`  Result: ${result1.valid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: JPG for QUALITY_CERTIFICATE (should now pass)
console.log('Test 2: JPG for QUALITY_CERTIFICATE');
const result2 = validateDocument('QUALITY_CERTIFICATE', 'image/jpeg', 2042600);
console.log(`  Valid: ${result2.valid}`);
console.log(`  Errors: ${result2.errors.join(', ') || 'None'}`);
console.log(`  Result: ${result2.valid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: PNG for PROFORMA_INVOICE (should now pass)
console.log('Test 3: PNG for PROFORMA_INVOICE');
const result3 = validateDocument('PROFORMA_INVOICE', 'image/png', 2042600);
console.log(`  Valid: ${result3.valid}`);
console.log(`  Errors: ${result3.errors.join(', ') || 'None'}`);
console.log(`  Result: ${result3.valid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: PDF should still work
console.log('Test 4: PDF for CONTRACT_SIGNED');
const result4 = validateDocument('CONTRACT_SIGNED', 'application/pdf', 2042600);
console.log(`  Valid: ${result4.valid}`);
console.log(`  Errors: ${result4.errors.join(', ') || 'None'}`);
console.log(`  Result: ${result4.valid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: File too large (should fail)
console.log('Test 5: File too large (15MB)');
const result5 = validateDocument('CONTRACT_SIGNED', 'image/jpeg', 15 * 1024 * 1024);
console.log(`  Valid: ${result5.valid}`);
console.log(`  Errors: ${result5.errors.join(', ') || 'None'}`);
console.log(`  Result: ${!result5.valid ? '✅ PASS (correctly rejected)' : '❌ FAIL'}\n`);

console.log('\n=== Summary ===');
const allTests = [result1, result2, result3, result4];
const passed = allTests.filter(r => r.valid).length;
console.log(`${passed}/${allTests.length} tests passed`);
console.log(passed === allTests.length ? '\n✅ ALL VALIDATION TESTS PASSED!' : '\n❌ SOME TESTS FAILED');
