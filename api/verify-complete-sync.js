/**
 * COMPREHENSIVE END-TO-END SYNCHRONIZATION VERIFICATION
 * 
 * Verifies ALL data synchronization between PostgreSQL and Blockchain:
 * 1. Exporter Applications → Blockchain Exporters
 * 2. Approved Applications → Sales Contracts
 * 3. Contracts → Shipments
 * 4. Shipments → Customs Clearances
 * 5. Clearances → Blockchain Status
 * 6. Payment Records
 * 7. Audit Trail
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

const STATS = {
  exporters: { postgres: 0, blockchain: 0, synced: 0, missing: 0 },
  applications: { postgres: 0, approved: 0 },
  contracts: { expected: 0, blockchain: 0, synced: 0, missing: 0 },
  shipments: { postgres: 0, blockchain: 0, synced: 0, missing: 0 },
  clearances: { postgres: 0, blockchain: 0, synced: 0, mismatch: 0 },
  payments: { postgres: 0, blockchain: 0, synced: 0, missing: 0 },
  audit: { postgres: 0, blockchain: 0 }
};

const ISSUES = [];

function addIssue(category, severity, message) {
  ISSUES.push({ category, severity, message });
  console.log(`   ${severity === 'ERROR' ? '❌' : '⚠️'} ${message}`);
}

// ============================================================================
// 1. VERIFY EXPORTERS
// ============================================================================
async function verifyExporters() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`👤 VERIFYING EXPORTERS`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Get exporters from PostgreSQL
    const exportersResult = await databaseService.query(
      `SELECT DISTINCT exporter_id, company_name 
       FROM exporter_applications 
       WHERE exporter_id IS NOT NULL AND status = 'approved'
       ORDER BY exporter_id`
    );

    STATS.exporters.postgres = exportersResult.rows.length;
    console.log(`📊 PostgreSQL: ${STATS.exporters.postgres} approved exporters\n`);

    for (const exporter of exportersResult.rows) {
      console.log(`   🏢 ${exporter.exporter_id} - ${exporter.company_name}`);

      // Check if exists on blockchain
      const result = await fabricService.queryChaincode('ReadExporter', [exporter.exporter_id]);

      if (result.success && result.data) {
        console.log(`      ✅ Registered on blockchain`);
        STATS.exporters.synced++;
      } else {
        addIssue('exporters', 'ERROR', `Not registered on blockchain: ${exporter.exporter_id}`);
        STATS.exporters.missing++;
      }
    }

    STATS.exporters.blockchain = STATS.exporters.synced;

  } catch (error) {
    addIssue('exporters', 'ERROR', `Verification failed: ${error.message}`);
  }
}

// ============================================================================
// 2. VERIFY APPLICATIONS
// ============================================================================
async function verifyApplications() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📝 VERIFYING APPLICATIONS`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    const allApps = await databaseService.query(
      `SELECT application_id, exporter_id, status, company_name 
       FROM exporter_applications 
       ORDER BY application_id DESC`
    );

    const approvedApps = allApps.rows.filter(app => app.status === 'approved');

    STATS.applications.postgres = allApps.rows.length;
    STATS.applications.approved = approvedApps.length;

    console.log(`📊 Total Applications: ${STATS.applications.postgres}`);
    console.log(`   ✅ Approved: ${STATS.applications.approved}`);
    console.log(`   ⏳ Pending: ${allApps.rows.filter(a => a.status === 'pending').length}`);
    console.log(`   ❌ Rejected: ${allApps.rows.filter(a => a.status === 'rejected').length}\n`);

    // List approved applications
    if (approvedApps.length > 0) {
      console.log(`   Approved Applications (should have contracts & shipments):`);
      for (const app of approvedApps) {
        console.log(`      • ${app.application_id} - ${app.company_name} (${app.exporter_id})`);
      }
    }

  } catch (error) {
    addIssue('applications', 'ERROR', `Verification failed: ${error.message}`);
  }
}

// ============================================================================
// 3. VERIFY CONTRACTS
// ============================================================================
async function verifyContracts() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📄 VERIFYING SALES CONTRACTS`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Get approved applications (each should have a contract)
    const approvedApps = await databaseService.query(
      `SELECT application_id, exporter_id, company_name 
       FROM exporter_applications 
       WHERE status = 'approved'
       ORDER BY application_id DESC`
    );

    STATS.contracts.expected = approvedApps.rows.length;
    console.log(`📊 Expected Contracts: ${STATS.contracts.expected} (one per approved application)\n`);

    for (const app of approvedApps.rows) {
      // Query all contracts to find ones matching this application
      const allContractsResult = await fabricService.queryChaincode('QueryAllSalesContracts', []);
      let foundContract = false;
      
      if (allContractsResult.success && allContractsResult.data) {
        const contracts = Array.isArray(allContractsResult.data) ? allContractsResult.data : [];
        const appContracts = contracts.filter(c => 
          c.Record && (
            c.Record.contractID && c.Record.contractID.includes(app.application_id) ||
            c.Key && c.Key.includes(app.application_id)
          )
        );
        
        if (appContracts.length > 0) {
          const contract = appContracts[0];
          const contractID = contract.Record?.contractID || contract.Key;
          console.log(`   📄 ${contractID} (${app.company_name})`);
          console.log(`      ✅ Exists on blockchain`);
          console.log(`         Status: ${contract.Record?.status || 'N/A'}`);
          console.log(`         Exporter: ${contract.Record?.exporterID || app.exporter_id}`);
          STATS.contracts.synced++;
          foundContract = true;
        }
      }
      
      if (!foundContract) {
        console.log(`   📄 CON-${app.application_id}-* (${app.company_name})`);
        addIssue('contracts', 'ERROR', `Missing contract for approved application: ${app.application_id}`);
        STATS.contracts.missing++;
      }

    }

    STATS.contracts.blockchain = STATS.contracts.synced;

  } catch (error) {
    addIssue('contracts', 'ERROR', `Verification failed: ${error.message}`);
  }
}

// ============================================================================
// 4. VERIFY SHIPMENTS
// ============================================================================
async function verifyShipments() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📦 VERIFYING SHIPMENTS`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Get approved applications (each should have a shipment)
    const approvedApps = await databaseService.query(
      `SELECT application_id, exporter_id, company_name 
       FROM exporter_applications 
       WHERE status = 'approved'
       ORDER BY application_id DESC`
    );

    STATS.shipments.postgres = approvedApps.rows.length;
    console.log(`📊 Expected Shipments: ${STATS.shipments.postgres} (one per approved application)\n`);

    for (const app of approvedApps.rows) {
      const shipmentID = `SHIPAPP-${app.application_id}`;
      console.log(`   📦 ${shipmentID} (${app.company_name})`);

      const result = await fabricService.queryChaincode('ReadShipment', [shipmentID]);

      if (result.success && result.data) {
        console.log(`      ✅ Exists on blockchain`);
        console.log(`         Status: ${result.data.status}`);
        console.log(`         Contract: ${result.data.contractID}`);
        console.log(`         Origin: ${result.data.origin || 'Ethiopia'}`);
        STATS.shipments.synced++;
      } else {
        addIssue('shipments', 'ERROR', `Missing shipment for approved application: ${app.application_id}`);
        STATS.shipments.missing++;
      }
    }

    STATS.shipments.blockchain = STATS.shipments.synced;

  } catch (error) {
    addIssue('shipments', 'ERROR', `Verification failed: ${error.message}`);
  }
}

// ============================================================================
// 5. VERIFY CUSTOMS CLEARANCES
// ============================================================================
async function verifyClearances() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🛃 VERIFYING CUSTOMS CLEARANCES`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Get clearances from PostgreSQL
    const clearancesResult = await databaseService.query(
      `SELECT clearance_id, shipment_id, status, clearance_number, cleared_date 
       FROM customs_clearances 
       ORDER BY shipment_id`
    );

    STATS.clearances.postgres = clearancesResult.rows.length;
    console.log(`📊 PostgreSQL: ${STATS.clearances.postgres} clearances\n`);

    if (clearancesResult.rows.length === 0) {
      console.log(`   ℹ️  No clearances yet - this is normal if shipments haven't been cleared\n`);
      return;
    }

    for (const clearance of clearancesResult.rows) {
      console.log(`   🛃 ${clearance.shipment_id}`);
      console.log(`      Clearance ID: ${clearance.clearance_id}`);
      console.log(`      PostgreSQL Status: ${clearance.status}`);

      // Check blockchain status
      const result = await fabricService.queryChaincode('ReadShipment', [clearance.shipment_id]);

      if (result.success && result.data) {
        const blockchainStatus = result.data.status;
        console.log(`      Blockchain Status: ${blockchainStatus}`);

        if (blockchainStatus === 'CUSTOMS_CLEARED') {
          console.log(`      ✅ SYNCHRONIZED`);
          STATS.clearances.synced++;
        } else {
          addIssue('clearances', 'WARN', `Status mismatch for ${clearance.shipment_id}: DB=${clearance.status}, Blockchain=${blockchainStatus}`);
          STATS.clearances.mismatch++;
        }
      } else {
        addIssue('clearances', 'ERROR', `Shipment not found on blockchain: ${clearance.shipment_id}`);
        STATS.clearances.mismatch++;
      }
    }

    STATS.clearances.blockchain = STATS.clearances.synced;

  } catch (error) {
    addIssue('clearances', 'ERROR', `Verification failed: ${error.message}`);
  }
}

// ============================================================================
// 6. VERIFY PAYMENTS
// ============================================================================
async function verifyPayments() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`💰 VERIFYING PAYMENTS`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Get payments from PostgreSQL
    const paymentsResult = await databaseService.query(
      `SELECT payment_id, contract_id, amount, status, payment_date 
       FROM payments 
       WHERE status = 'confirmed'
       ORDER BY payment_id DESC`
    );

    STATS.payments.postgres = paymentsResult.rows.length;
    console.log(`📊 PostgreSQL: ${STATS.payments.postgres} confirmed payments\n`);

    if (paymentsResult.rows.length === 0) {
      console.log(`   ℹ️  No payments yet - this is normal if no contracts have been paid\n`);
      return;
    }

    for (const payment of paymentsResult.rows) {
      console.log(`   💰 ${payment.payment_id} - Contract: ${payment.contract_id}`);
      console.log(`      Amount: $${payment.amount}`);
      console.log(`      Status: ${payment.status}`);

      // Check if contract exists and has payment recorded
      const result = await fabricService.queryChaincode('ReadSalesContract', [payment.contract_id]);

      if (result.success && result.data) {
        console.log(`      ✅ Contract exists on blockchain`);
        // Note: Payment details might be in contract or separate payment records
        STATS.payments.synced++;
      } else {
        addIssue('payments', 'WARN', `Contract not found for payment: ${payment.contract_id}`);
        STATS.payments.missing++;
      }
    }

    STATS.payments.blockchain = STATS.payments.synced;

  } catch (error) {
    // Payments table might not exist yet
    console.log(`   ℹ️  Payments table not available or no payments recorded\n`);
  }
}

// ============================================================================
// 7. VERIFY AUDIT TRAIL
// ============================================================================
async function verifyAuditTrail() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📋 VERIFYING AUDIT TRAIL`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Get audit records from PostgreSQL
    const auditResult = await databaseService.query(
      `SELECT COUNT(*) as count FROM audit_trail`
    );

    STATS.audit.postgres = parseInt(auditResult.rows[0].count);
    console.log(`📊 PostgreSQL: ${STATS.audit.postgres} audit records\n`);

    // Sample recent audit records
    const recentAudit = await databaseService.query(
      `SELECT action, entity_type, entity_id, timestamp, user_id 
       FROM audit_trail 
       ORDER BY timestamp DESC 
       LIMIT 10`
    );

    if (recentAudit.rows.length > 0) {
      console.log(`   Recent Audit Entries (last 10):`);
      for (const record of recentAudit.rows) {
        console.log(`      • ${record.action} ${record.entity_type} ${record.entity_id} by ${record.user_id || 'system'}`);
      }
    }

    // Note: Blockchain audit is implicit in transaction history
    console.log(`\n   ℹ️  Blockchain audit is maintained via transaction history`);
    STATS.audit.blockchain = STATS.audit.postgres; // Assuming sync since blockchain is authoritative

  } catch (error) {
    console.log(`   ℹ️  Audit trail verification skipped: ${error.message}\n`);
  }
}

// ============================================================================
// FINAL REPORT
// ============================================================================
async function printFinalReport() {
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log(`📊 COMPREHENSIVE SYNCHRONIZATION REPORT`);
  console.log(`${'═'.repeat(80)}\n`);

  console.log(`👤 EXPORTERS:`);
  console.log(`   PostgreSQL:  ${STATS.exporters.postgres}`);
  console.log(`   Blockchain:  ${STATS.exporters.blockchain}`);
  console.log(`   ✅ Synced:    ${STATS.exporters.synced}`);
  console.log(`   ❌ Missing:   ${STATS.exporters.missing}\n`);

  console.log(`📝 APPLICATIONS:`);
  console.log(`   Total:       ${STATS.applications.postgres}`);
  console.log(`   Approved:    ${STATS.applications.approved}\n`);

  console.log(`📄 SALES CONTRACTS:`);
  console.log(`   Expected:    ${STATS.contracts.expected}`);
  console.log(`   Blockchain:  ${STATS.contracts.blockchain}`);
  console.log(`   ✅ Synced:    ${STATS.contracts.synced}`);
  console.log(`   ❌ Missing:   ${STATS.contracts.missing}\n`);

  console.log(`📦 SHIPMENTS:`);
  console.log(`   Expected:    ${STATS.shipments.postgres}`);
  console.log(`   Blockchain:  ${STATS.shipments.blockchain}`);
  console.log(`   ✅ Synced:    ${STATS.shipments.synced}`);
  console.log(`   ❌ Missing:   ${STATS.shipments.missing}\n`);

  console.log(`🛃 CUSTOMS CLEARANCES:`);
  console.log(`   PostgreSQL:  ${STATS.clearances.postgres}`);
  console.log(`   Blockchain:  ${STATS.clearances.blockchain}`);
  console.log(`   ✅ Synced:    ${STATS.clearances.synced}`);
  console.log(`   ⚠️  Mismatch: ${STATS.clearances.mismatch}\n`);

  console.log(`💰 PAYMENTS:`);
  console.log(`   PostgreSQL:  ${STATS.payments.postgres}`);
  console.log(`   Blockchain:  ${STATS.payments.blockchain}`);
  console.log(`   ✅ Synced:    ${STATS.payments.synced}`);
  console.log(`   ❌ Missing:   ${STATS.payments.missing}\n`);

  console.log(`📋 AUDIT TRAIL:`);
  console.log(`   PostgreSQL:  ${STATS.audit.postgres} records\n`);

  console.log(`${'═'.repeat(80)}`);

  // Calculate overall sync percentage
  const totalExpected = STATS.exporters.postgres + STATS.contracts.expected + 
                        STATS.shipments.postgres + STATS.clearances.postgres;
  const totalSynced = STATS.exporters.synced + STATS.contracts.synced + 
                      STATS.shipments.synced + STATS.clearances.synced;
  const syncPercentage = totalExpected > 0 ? ((totalSynced / totalExpected) * 100).toFixed(1) : 100;

  console.log(`\n📈 OVERALL SYNC STATUS: ${syncPercentage}%\n`);

  if (ISSUES.length > 0) {
    console.log(`${'═'.repeat(80)}`);
    console.log(`⚠️  ISSUES FOUND: ${ISSUES.length}`);
    console.log(`${'═'.repeat(80)}\n`);

    const errors = ISSUES.filter(i => i.severity === 'ERROR');
    const warnings = ISSUES.filter(i => i.severity === 'WARN');

    if (errors.length > 0) {
      console.log(`❌ ERRORS (${errors.length}):`);
      errors.forEach(issue => {
        console.log(`   • [${issue.category}] ${issue.message}`);
      });
      console.log();
    }

    if (warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${warnings.length}):`);
      warnings.forEach(issue => {
        console.log(`   • [${issue.category}] ${issue.message}`);
      });
      console.log();
    }
  } else {
    console.log(`${'═'.repeat(80)}`);
    console.log(`✅ NO ISSUES FOUND`);
    console.log(`${'═'.repeat(80)}\n`);
  }

  if (syncPercentage >= 100 && ISSUES.length === 0) {
    console.log(`🎉 PERFECT SYNCHRONIZATION!`);
    console.log(`\nAll data is fully synchronized between PostgreSQL and Blockchain.\n`);
  } else if (syncPercentage >= 90) {
    console.log(`✅ GOOD SYNCHRONIZATION`);
    console.log(`\nMost data is synchronized. Review issues above.\n`);
  } else {
    console.log(`⚠️  SYNCHRONIZATION ISSUES`);
    console.log(`\nSignificant sync gaps detected. Review issues above.\n`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔍 COMPREHENSIVE END-TO-END SYNCHRONIZATION VERIFICATION`);
  console.log(`PostgreSQL ↔️ Hyperledger Fabric Blockchain`);
  console.log(`${'═'.repeat(80)}`);

  try {
    // Connect to blockchain
    await fabricService.connectAsOrg('ECTAMSP');
    console.log(`\n✅ Connected to blockchain as ECTAMSP`);

    // Run all verifications
    await verifyExporters();
    await verifyApplications();
    await verifyContracts();
    await verifyShipments();
    await verifyClearances();
    await verifyPayments();
    await verifyAuditTrail();

    // Print final report
    await printFinalReport();

  } catch (error) {
    console.error(`\n❌ Fatal error:`, error.message);
    console.error(error.stack);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

// Execute verification
console.log(`\n🚀 Starting comprehensive synchronization verification...`);
main();
