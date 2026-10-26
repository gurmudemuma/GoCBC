/**
 * Comprehensive Database Synchronization Verification
 * Ensures PostgreSQL ↔️ Blockchain (CouchDB) are in sync
 * 
 * What this checks:
 * 1. Shipments: PostgreSQL applications → Blockchain shipments
 * 2. Contracts: PostgreSQL contracts → Blockchain contracts  
 * 3. Quality Inspections: PostgreSQL quality_inspections → tracked on blockchain
 * 4. Customs Clearances: PostgreSQL customs_clearances → Blockchain shipment status
 * 5. Payment status synchronization
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

const SYNC_REPORT = {
  shipments: { postgres: 0, blockchain: 0, mismatches: [] },
  contracts: { postgres: 0, blockchain: 0, mismatches: [] },
  qualityInspections: { postgres: 0, synced: 0, notSynced: [] },
  customsClearances: { postgres: 0, synced: 0, notSynced: [] },
  payments: { postgres: 0, synced: 0, notSynced: [] }
};

async function verifyShipments() {
  console.log('\n📦 VERIFYING SHIPMENTS...');
  console.log('=' .repeat(60));
  
  // Get all shipments from PostgreSQL (via exporter_applications)
  const applications = await databaseService.query(`
    SELECT application_id, status, exporter_id, company_name
    FROM exporter_applications 
    WHERE status IN ('approved', 'contract_signed')
    ORDER BY submitted_at DESC
  `);
  
  SYNC_REPORT.shipments.postgres = applications.rows.length;
  console.log(`✅ PostgreSQL: ${applications.rows.length} applications (potential shipments)`);
  
  // Check each application on blockchain
  for (const app of applications.rows) {
    const shipmentId = `SHIP${app.application_id}`;
    
    try {
      const result = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
      
      if (result.success && result.data) {
        SYNC_REPORT.shipments.blockchain++;
        
        // Check status consistency
        const blockchainStatus = result.data.status || result.data.Status;
        console.log(`   ✅ ${shipmentId}: Exists on blockchain (status: ${blockchainStatus})`);
        
      } else {
        SYNC_REPORT.shipments.mismatches.push({
          shipmentId,
          issue: 'Missing from blockchain',
          postgresData: app
        });
        console.log(`   ⚠️  ${shipmentId}: NOT on blockchain (Postgres status: ${app.status})`);
      }
    } catch (error) {
      SYNC_REPORT.shipments.mismatches.push({
        shipmentId,
        issue: 'Error reading from blockchain',
        error: error.message
      });
      console.log(`   ❌ ${shipmentId}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Shipments Summary:`);
  console.log(`   PostgreSQL: ${SYNC_REPORT.shipments.postgres}`);
  console.log(`   Blockchain: ${SYNC_REPORT.shipments.blockchain}`);
  console.log(`   Mismatches: ${SYNC_REPORT.shipments.mismatches.length}`);
}

async function verifyContracts() {
  console.log('\n📄 VERIFYING CONTRACTS...');
  console.log('=' .repeat(60));
  
  // Get all contracts from PostgreSQL
  const contracts = await databaseService.query(`
    SELECT contract_id, application_id, status, total_value
    FROM contracts 
    WHERE status IN ('active', 'signed', 'approved')
    ORDER BY contract_id DESC
  `);
  
  SYNC_REPORT.contracts.postgres = contracts.rows.length;
  console.log(`✅ PostgreSQL: ${contracts.rows.length} active contracts`);
  
  // Check each contract on blockchain
  for (const contract of contracts.rows) {
    try {
      const result = await fabricService.queryChaincode('ReadContract', [contract.contract_id]);
      
      if (result.success && result.data) {
        SYNC_REPORT.contracts.blockchain++;
        console.log(`   ✅ ${contract.contract_id}: Exists on blockchain`);
      } else {
        SYNC_REPORT.contracts.mismatches.push({
          contractId: contract.contract_id,
          issue: 'Missing from blockchain',
          postgresData: contract
        });
        console.log(`   ⚠️  ${contract.contract_id}: NOT on blockchain`);
      }
    } catch (error) {
      SYNC_REPORT.contracts.mismatches.push({
        contractId: contract.contract_id,
        issue: 'Error reading from blockchain',
        error: error.message
      });
      console.log(`   ❌ ${contract.contract_id}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Contracts Summary:`);
  console.log(`   PostgreSQL: ${SYNC_REPORT.contracts.postgres}`);
  console.log(`   Blockchain: ${SYNC_REPORT.contracts.blockchain}`);
  console.log(`   Mismatches: ${SYNC_REPORT.contracts.mismatches.length}`);
}

async function verifyQualityInspections() {
  console.log('\n🔬 VERIFYING QUALITY INSPECTIONS...');
  console.log('=' .repeat(60));
  
  // Get all quality inspections from PostgreSQL
  const inspections = await databaseService.query(`
    SELECT inspection_id, shipment_id, status, passed, grade
    FROM quality_inspections
    WHERE status IN ('completed', 'permit_issued')
    ORDER BY inspection_id DESC
  `);
  
  SYNC_REPORT.qualityInspections.postgres = inspections.rows.length;
  console.log(`✅ PostgreSQL: ${inspections.rows.length} completed inspections`);
  
  // Check if inspections are reflected on blockchain shipments
  for (const inspection of inspections.rows) {
    try {
      const result = await fabricService.queryChaincode('ReadShipment', [inspection.shipment_id]);
      
      if (result.success && result.data) {
        const shipment = result.data;
        const hasQualityData = shipment.qualityGrade || shipment.QualityGrade || 
                               shipment.qualityStatus || shipment.QualityStatus;
        
        if (hasQualityData) {
          SYNC_REPORT.qualityInspections.synced++;
          console.log(`   ✅ ${inspection.shipment_id}: Quality data synced (Grade: ${inspection.grade})`);
        } else {
          SYNC_REPORT.qualityInspections.notSynced.push({
            inspectionId: inspection.inspection_id,
            shipmentId: inspection.shipment_id,
            issue: 'Quality inspection not reflected on blockchain'
          });
          console.log(`   ⚠️  ${inspection.shipment_id}: Quality data NOT synced`);
        }
      } else {
        SYNC_REPORT.qualityInspections.notSynced.push({
          inspectionId: inspection.inspection_id,
          shipmentId: inspection.shipment_id,
          issue: 'Shipment not found on blockchain'
        });
        console.log(`   ⚠️  ${inspection.shipment_id}: Shipment not on blockchain`);
      }
    } catch (error) {
      console.log(`   ❌ ${inspection.shipment_id}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Quality Inspections Summary:`);
  console.log(`   PostgreSQL: ${SYNC_REPORT.qualityInspections.postgres}`);
  console.log(`   Synced to Blockchain: ${SYNC_REPORT.qualityInspections.synced}`);
  console.log(`   Not Synced: ${SYNC_REPORT.qualityInspections.notSynced.length}`);
}

async function verifyCustomsClearances() {
  console.log('\n🛃 VERIFYING CUSTOMS CLEARANCES...');
  console.log('=' .repeat(60));
  
  // Get all clearances from PostgreSQL
  const clearances = await databaseService.query(`
    SELECT clearance_id, shipment_id, status, clearance_number
    FROM customs_clearances
    WHERE status IN ('CLEARED', 'cleared')
    ORDER BY clearance_id DESC
  `);
  
  SYNC_REPORT.customsClearances.postgres = clearances.rows.length;
  console.log(`✅ PostgreSQL: ${clearances.rows.length} cleared shipments`);
  
  // Check if clearances are reflected on blockchain
  for (const clearance of clearances.rows) {
    try {
      const result = await fabricService.queryChaincode('ReadShipment', [clearance.shipment_id]);
      
      if (result.success && result.data) {
        const shipment = result.data;
        const blockchainStatus = shipment.status || shipment.Status;
        
        if (blockchainStatus === 'CUSTOMS_CLEARED') {
          SYNC_REPORT.customsClearances.synced++;
          console.log(`   ✅ ${clearance.shipment_id}: Status synced (${clearance.clearance_number})`);
        } else {
          SYNC_REPORT.customsClearances.notSynced.push({
            clearanceId: clearance.clearance_id,
            shipmentId: clearance.shipment_id,
            postgresStatus: clearance.status,
            blockchainStatus: blockchainStatus,
            issue: 'Status mismatch'
          });
          console.log(`   ⚠️  ${clearance.shipment_id}: Status mismatch - Postgres: ${clearance.status}, Blockchain: ${blockchainStatus}`);
        }
      } else {
        SYNC_REPORT.customsClearances.notSynced.push({
          clearanceId: clearance.clearance_id,
          shipmentId: clearance.shipment_id,
          issue: 'Shipment not found on blockchain'
        });
        console.log(`   ⚠️  ${clearance.shipment_id}: Shipment not on blockchain`);
      }
    } catch (error) {
      console.log(`   ❌ ${clearance.shipment_id}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Customs Clearances Summary:`);
  console.log(`   PostgreSQL: ${SYNC_REPORT.customsClearances.postgres}`);
  console.log(`   Synced to Blockchain: ${SYNC_REPORT.customsClearances.synced}`);
  console.log(`   Not Synced: ${SYNC_REPORT.customsClearances.notSynced.length}`);
}

async function verifyPayments() {
  console.log('\n💰 VERIFYING PAYMENTS...');
  console.log('=' .repeat(60));
  
  // Get all payments from PostgreSQL
  const payments = await databaseService.query(`
    SELECT payment_id, contract_id, amount, status
    FROM payments
    WHERE status IN ('completed', 'confirmed')
    ORDER BY payment_id DESC
    LIMIT 50
  `);
  
  SYNC_REPORT.payments.postgres = payments.rows.length;
  console.log(`✅ PostgreSQL: ${payments.rows.length} completed payments (latest 50)`);
  
  // Check if payments are reflected on blockchain contracts
  for (const payment of payments.rows) {
    try {
      const result = await fabricService.queryChaincode('ReadContract', [payment.contract_id]);
      
      if (result.success && result.data) {
        const contract = result.data;
        const hasPaidAmount = contract.paidAmount || contract.PaidAmount;
        
        if (hasPaidAmount && parseFloat(hasPaidAmount) > 0) {
          SYNC_REPORT.payments.synced++;
          console.log(`   ✅ ${payment.payment_id}: Payment reflected on blockchain`);
        } else {
          SYNC_REPORT.payments.notSynced.push({
            paymentId: payment.payment_id,
            contractId: payment.contract_id,
            issue: 'Payment not reflected on blockchain contract'
          });
          console.log(`   ⚠️  ${payment.payment_id}: Payment NOT reflected on blockchain`);
        }
      } else {
        SYNC_REPORT.payments.notSynced.push({
          paymentId: payment.payment_id,
          contractId: payment.contract_id,
          issue: 'Contract not found on blockchain'
        });
        console.log(`   ⚠️  ${payment.payment_id}: Contract not on blockchain`);
      }
    } catch (error) {
      console.log(`   ❌ ${payment.payment_id}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Payments Summary:`);
  console.log(`   PostgreSQL: ${SYNC_REPORT.payments.postgres}`);
  console.log(`   Synced to Blockchain: ${SYNC_REPORT.payments.synced}`);
  console.log(`   Not Synced: ${SYNC_REPORT.payments.notSynced.length}`);
}

async function printFinalReport() {
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 COMPREHENSIVE SYNCHRONIZATION REPORT');
  console.log('═'.repeat(60));
  
  console.log('\n1. SHIPMENTS:');
  console.log(`   PostgreSQL Applications: ${SYNC_REPORT.shipments.postgres}`);
  console.log(`   Blockchain Shipments: ${SYNC_REPORT.shipments.blockchain}`);
  console.log(`   ❌ Mismatches: ${SYNC_REPORT.shipments.mismatches.length}`);
  
  console.log('\n2. CONTRACTS:');
  console.log(`   PostgreSQL Contracts: ${SYNC_REPORT.contracts.postgres}`);
  console.log(`   Blockchain Contracts: ${SYNC_REPORT.contracts.blockchain}`);
  console.log(`   ❌ Mismatches: ${SYNC_REPORT.contracts.mismatches.length}`);
  
  console.log('\n3. QUALITY INSPECTIONS:');
  console.log(`   PostgreSQL Inspections: ${SYNC_REPORT.qualityInspections.postgres}`);
  console.log(`   ✅ Synced: ${SYNC_REPORT.qualityInspections.synced}`);
  console.log(`   ❌ Not Synced: ${SYNC_REPORT.qualityInspections.notSynced.length}`);
  
  console.log('\n4. CUSTOMS CLEARANCES:');
  console.log(`   PostgreSQL Clearances: ${SYNC_REPORT.customsClearances.postgres}`);
  console.log(`   ✅ Synced: ${SYNC_REPORT.customsClearances.synced}`);
  console.log(`   ❌ Not Synced: ${SYNC_REPORT.customsClearances.notSynced.length}`);
  
  console.log('\n5. PAYMENTS:');
  console.log(`   PostgreSQL Payments: ${SYNC_REPORT.payments.postgres}`);
  console.log(`   ✅ Synced: ${SYNC_REPORT.payments.synced}`);
  console.log(`   ❌ Not Synced: ${SYNC_REPORT.payments.notSynced.length}`);
  
  const totalIssues = 
    SYNC_REPORT.shipments.mismatches.length +
    SYNC_REPORT.contracts.mismatches.length +
    SYNC_REPORT.qualityInspections.notSynced.length +
    SYNC_REPORT.customsClearances.notSynced.length +
    SYNC_REPORT.payments.notSynced.length;
  
  console.log('\n' + '═'.repeat(60));
  if (totalIssues === 0) {
    console.log('✅ ALL DATABASES ARE IN PERFECT SYNC! 🎉');
  } else {
    console.log(`⚠️  FOUND ${totalIssues} SYNCHRONIZATION ISSUES`);
    console.log('\nRun sync-all-databases.js to fix these issues.');
  }
  console.log('═'.repeat(60) + '\n');
}

async function main() {
  console.log('\n🔍 COMPREHENSIVE DATABASE SYNC VERIFICATION');
  console.log('PostgreSQL ↔️ Hyperledger Fabric (CouchDB)\n');
  
  try {
    // Connect to blockchain
    await fabricService.connectAsOrg('ECTAMSP');
    console.log('✅ Connected to blockchain as ECTAMSP\n');
    
    // Run all verifications
    await verifyShipments();
    await verifyContracts();
    await verifyQualityInspections();
    await verifyCustomsClearances();
    await verifyPayments();
    
    // Print final report
    await printFinalReport();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

main();
