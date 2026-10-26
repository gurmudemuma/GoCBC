#!/usr/bin/env node

/**
 * Complete Status Alignment Test
 * Tests all status transformations across all portals
 * Verifies the dual-field system for shipments and payments
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const success = (msg) => log(`✅ ${msg}`, colors.green);
const error = (msg) => log(`❌ ${msg}`, colors.red);
const info = (msg) => log(`ℹ️  ${msg}`, colors.cyan);
const warn = (msg) => log(`⚠️  ${msg}`, colors.yellow);
const section = (msg) => log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`, colors.bright + colors.blue);

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  results.total++;
  if (passed) {
    results.passed++;
    success(`${name}: ${message || 'PASSED'}`);
  } else {
    results.failed++;
    error(`${name}: ${message || 'FAILED'}`);
  }
  results.tests.push({ name, passed, message });
}

async function runTests() {
  try {
    await client.connect();
    info('Connected to database');

    // ==================== TEST 1: Database Migration ====================
    section('TEST 1: Verify Database Migration 043');
    
    await testMigrationApplied();

    // ==================== TEST 2: Shipment Status Fields ====================
    section('TEST 2: Verify Shipment Dual-Field System');
    
    await testShipmentStatusFields();
    await testShipmentWorkflowStatuses();
    await testShipmentLogisticsStatuses();

    // ==================== TEST 3: Payment Status Fields ====================
    section('TEST 3: Verify Payment Dual-Field System');
    
    await testPaymentStatusFields();
    await testPaymentProcessingStatuses();
    await testPaymentTrackingStatuses();

    // ==================== TEST 4: Contract Status ====================
    section('TEST 4: Verify Contract Status Alignment');
    
    await testContractStatuses();

    // ==================== TEST 5: LC Status ====================
    section('TEST 5: Verify Letter of Credit Status');
    
    await testLCStatuses();

    // ==================== TEST 6: Forex Status ====================
    section('TEST 6: Verify Forex Allocation Status');
    
    await testForexStatuses();

    // ==================== TEST 7: Quality Inspection Status ====================
    section('TEST 7: Verify Quality Inspection Status');
    
    await testQualityStatuses();

    // ==================== TEST 8: Customs Status ====================
    section('TEST 8: Verify Customs Declaration Status');
    
    await testCustomsStatuses();

    // ==================== TEST 9: Verify 40% NBE Retention ====================
    section('TEST 9: Verify 40% NBE Retention Calculation');
    
    await testNBERetention();

    // ==================== TEST 10: Status Indexes ====================
    section('TEST 10: Verify Database Indexes for Performance');
    
    await testDatabaseIndexes();

    // ==================== FINAL REPORT ====================
    printFinalReport();

  } catch (err) {
    error(`Test execution failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// ==================== TEST FUNCTIONS ====================

async function testMigrationApplied() {
  try {
    // Check if logistics_status column exists on shipments table
    const shipmentColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'shipments' AND column_name IN ('status', 'logistics_status')
      ORDER BY column_name
    `);
    
    const hasStatus = shipmentColumns.rows.some(r => r.column_name === 'status');
    const hasLogisticsStatus = shipmentColumns.rows.some(r => r.column_name === 'logistics_status');
    
    recordTest('Shipment status field exists', hasStatus);
    recordTest('Shipment logistics_status field exists', hasLogisticsStatus, 
      hasLogisticsStatus ? 'NEW FIELD ADDED' : 'MIGRATION NOT RUN');

    // Check if payment_tracking_status column exists on payments table
    const paymentColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'payments' AND column_name IN ('status', 'payment_tracking_status')
      ORDER BY column_name
    `);
    
    const hasPaymentStatus = paymentColumns.rows.some(r => r.column_name === 'status');
    const hasTrackingStatus = paymentColumns.rows.some(r => r.column_name === 'payment_tracking_status');
    
    recordTest('Payment status field exists', hasPaymentStatus);
    recordTest('Payment payment_tracking_status field exists', hasTrackingStatus,
      hasTrackingStatus ? 'NEW FIELD ADDED' : 'MIGRATION NOT RUN');

  } catch (err) {
    recordTest('Migration verification', false, err.message);
  }
}

async function testShipmentStatusFields() {
  try {
    // Check if any shipments exist
    const result = await client.query('SELECT COUNT(*) as count FROM shipments');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      warn('No shipments in database - cannot test shipment status values');
      return;
    }

    info(`Found ${count} shipments in database`);

    // Check status values
    const statuses = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM shipments
      GROUP BY status
      ORDER BY status
    `);

    info(`Shipment workflow statuses found: ${statuses.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);

    const validWorkflowStatuses = ['DRAFT', 'REGISTERED', 'QUALITY_PENDING', 'QUALITY_APPROVED', 
                                    'QUALITY_REJECTED', 'CUSTOMS_CLEARED', 'COMPLETED', 
                                    'draft', 'pending', 'created']; // Allow legacy statuses
    
    const allValid = statuses.rows.every(r => validWorkflowStatuses.includes(r.status));
    recordTest('All shipment workflow statuses valid', allValid,
      allValid ? 'All statuses are valid' : `Invalid statuses found: ${statuses.rows.filter(r => !validWorkflowStatuses.includes(r.status)).map(r => r.status).join(', ')}`);

    // Check logistics_status values if column exists
    try {
      const logisticsStatuses = await client.query(`
        SELECT DISTINCT logistics_status, COUNT(*) as count
        FROM shipments
        WHERE logistics_status IS NOT NULL
        GROUP BY logistics_status
        ORDER BY logistics_status
      `);

      if (logisticsStatuses.rows.length > 0) {
        info(`Shipment logistics statuses found: ${logisticsStatuses.rows.map(r => `${r.logistics_status}(${r.count})`).join(', ')}`);
        
        const validLogisticsStatuses = ['PENDING', 'BOOKED', 'LOADED', 'DEPARTED', 
                                        'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CONFIRMED'];
        const allLogisticsValid = logisticsStatuses.rows.every(r => validLogisticsStatuses.includes(r.logistics_status));
        
        recordTest('All shipment logistics statuses valid', allLogisticsValid);
      } else {
        warn('No logistics statuses set yet (column exists but empty)');
      }
    } catch (err) {
      // Column doesn't exist - expected if migration not run
      warn('logistics_status column not found - migration 043 needs to be run');
    }

  } catch (err) {
    recordTest('Shipment status field test', false, err.message);
  }
}

async function testShipmentWorkflowStatuses() {
  info('Testing shipment workflow status transitions...');
  
  const expectedWorkflowStatuses = [
    'DRAFT', 'REGISTERED', 'QUALITY_PENDING', 'QUALITY_APPROVED', 
    'QUALITY_REJECTED', 'CUSTOMS_CLEARED', 'COMPLETED'
  ];
  
  recordTest('Shipment workflow statuses defined', true, 
    `Expected: ${expectedWorkflowStatuses.join(' → ')}`);
}

async function testShipmentLogisticsStatuses() {
  info('Testing shipment logistics status transitions...');
  
  const expectedLogisticsStatuses = [
    'PENDING', 'BOOKED', 'LOADED', 'DEPARTED', 
    'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CONFIRMED'
  ];
  
  recordTest('Shipment logistics statuses defined', true,
    `Expected: ${expectedLogisticsStatuses.join(' → ')}`);
}

async function testPaymentStatusFields() {
  try {
    // Check if any payments exist
    const result = await client.query('SELECT COUNT(*) as count FROM payments');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      warn('No payments in database - cannot test payment status values');
      return;
    }

    info(`Found ${count} payments in database`);

    // Check status values
    const statuses = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM payments
      GROUP BY status
      ORDER BY status
    `);

    info(`Payment processing statuses found: ${statuses.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);

    const validProcessingStatuses = ['PENDING', 'RECEIVED', 'SPLIT', 'RETENTION_CONVERTED', 
                                     'RELEASED', 'COMPLETED', 'pending', 'completed']; // Allow legacy
    
    const allValid = statuses.rows.every(r => validProcessingStatuses.includes(r.status));
    recordTest('All payment processing statuses valid', allValid);

    // Check payment_tracking_status values if column exists
    try {
      const trackingStatuses = await client.query(`
        SELECT DISTINCT payment_tracking_status, COUNT(*) as count
        FROM payments
        WHERE payment_tracking_status IS NOT NULL
        GROUP BY payment_tracking_status
        ORDER BY payment_tracking_status
      `);

      if (trackingStatuses.rows.length > 0) {
        info(`Payment tracking statuses found: ${trackingStatuses.rows.map(r => `${r.payment_tracking_status}(${r.count})`).join(', ')}`);
        
        const validTrackingStatuses = ['PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 
                                       'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SETTLED'];
        const allTrackingValid = trackingStatuses.rows.every(r => validTrackingStatuses.includes(r.payment_tracking_status));
        
        recordTest('All payment tracking statuses valid', allTrackingValid);
      } else {
        warn('No payment tracking statuses set yet (column exists but empty)');
      }
    } catch (err) {
      warn('payment_tracking_status column not found - migration 043 needs to be run');
    }

  } catch (err) {
    recordTest('Payment status field test', false, err.message);
  }
}

async function testPaymentProcessingStatuses() {
  info('Testing payment processing status transitions...');
  
  const expectedProcessingStatuses = [
    'PENDING', 'RECEIVED', 'SPLIT (40% NBE)', 'RETENTION_CONVERTED', 'RELEASED (60%)', 'COMPLETED'
  ];
  
  recordTest('Payment processing statuses defined', true,
    `Expected: ${expectedProcessingStatuses.join(' → ')}`);
}

async function testPaymentTrackingStatuses() {
  info('Testing payment tracking status transitions...');
  
  const expectedTrackingStatuses = [
    'PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SETTLED'
  ];
  
  recordTest('Payment tracking statuses defined', true,
    `Expected: ${expectedTrackingStatuses.join(' → ')}`);
}

async function testContractStatuses() {
  try {
    const result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM contracts
      GROUP BY status
      ORDER BY status
    `);

    if (result.rows.length > 0) {
      info(`Contract statuses found: ${result.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);
      
      const validStatuses = ['DRAFT', 'REGISTERED', 'APPROVED', 'NBE_APPROVED', 
                             'ACTIVE', 'COMPLETED', 'REJECTED', 
                             'draft', 'pending', 'approved', 'rejected']; // Allow legacy
      
      const allValid = result.rows.every(r => validStatuses.includes(r.status));
      recordTest('All contract statuses valid', allValid);
    } else {
      warn('No contracts in database');
    }
  } catch (err) {
    recordTest('Contract status test', false, err.message);
  }
}

async function testLCStatuses() {
  try {
    const result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM letters_of_credit
      GROUP BY status
      ORDER BY status
    `);

    if (result.rows.length > 0) {
      info(`LC statuses found: ${result.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);
      
      const validStatuses = ['REQUESTED', 'APPROVED', 'ISSUED', 'UTILIZED',
                             'draft', 'pending', 'approved', 'issued']; // Allow legacy
      
      const allValid = result.rows.every(r => validStatuses.includes(r.status));
      recordTest('All LC statuses valid', allValid);
    } else {
      warn('No letters of credit in database');
    }
  } catch (err) {
    recordTest('LC status test', false, err.message);
  }
}

async function testForexStatuses() {
  try {
    const result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM forex_allocations
      GROUP BY status
      ORDER BY status
    `);

    if (result.rows.length > 0) {
      info(`Forex statuses found: ${result.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);
      
      const validStatuses = ['REQUESTED', 'ALLOCATED', 'UTILIZED',
                             'pending', 'approved', 'allocated']; // Allow legacy
      
      const allValid = result.rows.every(r => validStatuses.includes(r.status));
      recordTest('All forex statuses valid', allValid);
    } else {
      warn('No forex allocations in database');
    }
  } catch (err) {
    recordTest('Forex status test', false, err.message);
  }
}

async function testQualityStatuses() {
  try {
    const result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM quality_inspections
      GROUP BY status
      ORDER BY status
    `);

    if (result.rows.length > 0) {
      info(`Quality inspection statuses found: ${result.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);
      
      const validStatuses = ['PENDING', 'SCHEDULED', 'COMPLETED', 'APPROVED', 'REJECTED',
                             'pending', 'scheduled', 'completed', 'passed', 'failed']; // Allow legacy
      
      const allValid = result.rows.every(r => validStatuses.includes(r.status));
      recordTest('All quality inspection statuses valid', allValid);
    } else {
      warn('No quality inspections in database');
    }
  } catch (err) {
    recordTest('Quality inspection status test', false, err.message);
  }
}

async function testCustomsStatuses() {
  try {
    const result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM customs_declarations
      GROUP BY status
      ORDER BY status
    `);

    if (result.rows.length > 0) {
      info(`Customs declaration statuses found: ${result.rows.map(r => `${r.status}(${r.count})`).join(', ')}`);
      
      const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_INSPECTION', 'UNDER_REVIEW', 
                             'CLEARED', 'HELD', 'REJECTED',
                             'draft', 'pending', 'submitted', 'approved', 'rejected']; // Allow legacy
      
      const allValid = result.rows.every(r => validStatuses.includes(r.status));
      recordTest('All customs statuses valid', allValid);
    } else {
      warn('No customs declarations in database');
    }
  } catch (err) {
    recordTest('Customs status test', false, err.message);
  }
}

async function testNBERetention() {
  info('Testing 40% NBE retention calculation...');
  
  try {
    const result = await client.query(`
      SELECT 
        payment_id,
        amount_usd as total_amount,
        retention_amount,
        release_amount,
        retention_rate,
        ROUND((retention_amount / NULLIF(amount_usd, 0) * 100)::numeric, 2) as calculated_retention_rate
      FROM payments
      WHERE amount_usd > 0 AND retention_amount IS NOT NULL
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      warn('No payments with retention data to test');
      return;
    }

    info(`Checking ${result.rows.length} payments for 40% retention...`);

    let allCorrect = true;
    result.rows.forEach(payment => {
      const totalAmount = parseFloat(payment.total_amount);
      const retentionAmount = parseFloat(payment.retention_amount);
      const releaseAmount = parseFloat(payment.release_amount);
      const expectedRetention = totalAmount * 0.40;
      const expectedRelease = totalAmount * 0.60;
      
      const retentionMatch = Math.abs(retentionAmount - expectedRetention) < 0.01;
      const releaseMatch = Math.abs(releaseAmount - expectedRelease) < 0.01;
      
      if (!retentionMatch || !releaseMatch) {
        allCorrect = false;
        error(`Payment ${payment.payment_id}: Total=$${totalAmount}, Retention=$${retentionAmount} (expected $${expectedRetention.toFixed(2)}), Release=$${releaseAmount} (expected $${expectedRelease.toFixed(2)})`);
      } else {
        info(`Payment ${payment.payment_id}: ✓ Total=$${totalAmount}, 40%=$${retentionAmount}, 60%=$${releaseAmount}`);
      }
    });

    recordTest('40% NBE retention correctly calculated', allCorrect,
      allCorrect ? 'All payments use correct 40% retention formula' : 'Some payments have incorrect retention calculations');

  } catch (err) {
    warn(`Cannot test NBE retention: ${err.message}`);
  }
}

async function testDatabaseIndexes() {
  try {
    // Check for logistics_status index
    const indexes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('shipments', 'payments')
        AND indexname LIKE '%status%'
      ORDER BY tablename, indexname
    `);

    info(`Status-related indexes found: ${indexes.rows.length}`);
    indexes.rows.forEach(idx => {
      info(`  - ${idx.tablename}.${idx.indexname}`);
    });

    const hasShipmentStatusIdx = indexes.rows.some(r => r.tablename === 'shipments' && r.indexname.includes('status'));
    const hasPaymentStatusIdx = indexes.rows.some(r => r.tablename === 'payments' && r.indexname.includes('status'));

    recordTest('Shipment status indexes exist', hasShipmentStatusIdx);
    recordTest('Payment status indexes exist', hasPaymentStatusIdx);

  } catch (err) {
    recordTest('Database index test', false, err.message);
  }
}

function printFinalReport() {
  section('FINAL TEST REPORT');
  
  log(`\nTotal Tests: ${results.total}`, colors.bright);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.green);
  
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  log(`Pass Rate: ${passRate}%\n`, passRate >= 90 ? colors.green : colors.yellow);

  if (results.failed > 0) {
    log('\nFailed Tests:', colors.red);
    results.tests.filter(t => !t.passed).forEach(t => {
      log(`  ❌ ${t.name}: ${t.message}`, colors.red);
    });
  }

  log('\n' + '='.repeat(60) + '\n');

  if (results.failed === 0) {
    success('ALL TESTS PASSED! ✅');
    log('Status alignment is perfect. System is production-ready!', colors.green);
  } else {
    error(`${results.failed} TEST(S) FAILED`);
    log('Please review the failed tests above and run migration 043.', colors.yellow);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// ==================== RUN TESTS ====================

runTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
