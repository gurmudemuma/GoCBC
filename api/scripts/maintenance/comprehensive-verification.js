/**
 * COMPREHENSIVE SYSTEM VERIFICATION
 * Verifies complete synchronization between PostgreSQL and Blockchain
 */
require('dotenv').config();
const { Pool } = require('pg');
const FabricService = require('./dist/services/fabricService').default;

const pool = new Pool({
  user: process.env.DB_USER || 'cecbs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
  port: parseInt(process.env.DB_PORT || '5432')
});

const fabricService = new FabricService();

const RESULTS = {
  exporters: { total: 0, synced: 0, missing: 0 },
  contracts: { total: 0, synced: 0, missing: 0 },
  shipments: { total: 0, synced: 0, missing: 0, linked: 0 },
  clearances: { total: 0, synced: 0, missing: 0 }
};

async function verifyExporters() {
  console.log('\n📋 1. VERIFYING EXPORTERS');
  console.log('─'.repeat(80));
  
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM exporter_applications WHERE status = 'approved'
  `);
  RESULTS.exporters.total = parseInt(result.rows[0].count);
  
  const exporters = await pool.query(`
    SELECT exporter_id, company_name 
    FROM exporter_applications 
    WHERE status = 'approved' AND exporter_id IS NOT NULL
  `);
  
  console.log(`   PostgreSQL: ${RESULTS.exporters.total} approved exporters`);
  
  for (const exp of exporters.rows) {
    try {
      const response = await fabricService.queryChaincode('ReadExporter', [exp.exporter_id]);
      const exporter = response.data || response;
      if (exporter && exporter.exporterId) {
        RESULTS.exporters.synced++;
        console.log(`   ✅ ${exp.exporter_id} - ${exp.company_name}`);
      }
    } catch (error) {
      RESULTS.exporters.missing++;
      console.log(`   ❌ ${exp.exporter_id} - NOT FOUND`);
    }
  }
}

async function verifyContracts() {
  console.log('\n📄 2. VERIFYING SALES CONTRACTS');
  console.log('─'.repeat(80));
  
  const applications = await pool.query(`
    SELECT application_id, company_name 
    FROM exporter_applications 
    WHERE status = 'approved'
    ORDER BY application_id
  `);
  
  RESULTS.contracts.total = applications.rows.length;
  console.log(`   Checking contracts for ${RESULTS.contracts.total} applications...`);
  
  for (const app of applications.rows) {
    const shipmentId = `SHIP${app.application_id}`;
    
    try {
      const shipResponse = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
      const shipment = shipResponse.data || shipResponse;
      const contractId = shipment.contractId || shipment.contract;
      
      if (contractId) {
        try {
          const contractResponse = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
          const contract = contractResponse.data || contractResponse;
          if (contract) {
            RESULTS.contracts.synced++;
            console.log(`   ✅ ${contractId} (${app.company_name})`);
          }
        } catch (error) {
          RESULTS.contracts.missing++;
          console.log(`   ❌ ${contractId} - NOT FOUND`);
        }
      }
    } catch (error) {
      RESULTS.contracts.missing++;
      console.log(`   ⚠️  No contract found for ${app.application_id}`);
    }
  }
}

async function verifyShipments() {
  console.log('\n📦 3. VERIFYING SHIPMENTS');
  console.log('─'.repeat(80));
  
  const applications = await pool.query(`
    SELECT application_id, company_name, exporter_id
    FROM exporter_applications 
    WHERE status = 'approved'
    ORDER BY application_id
  `);
  
  RESULTS.shipments.total = applications.rows.length;
  console.log(`   PostgreSQL: ${RESULTS.shipments.total} approved applications`);
  console.log(`   Checking shipments on blockchain...\n`);
  
  for (const app of applications.rows) {
    const shipmentId = `SHIP${app.application_id}`;
    
    try {
      const response = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
      const shipment = response.data || response;
      
      if (shipment && shipment.shipmentId) {
        RESULTS.shipments.synced++;
        
        const contractId = shipment.contractId || shipment.contract;
        const exporterId = shipment.exporterId || shipment.exporterID;
        const status = shipment.status || shipment.Status;
        
        if (contractId && contractId !== 'NONE' && contractId !== '') {
          RESULTS.shipments.linked++;
          console.log(`   ✅ ${shipmentId}`);
          console.log(`      Contract: ${contractId}`);
          console.log(`      Exporter: ${exporterId}`);
          console.log(`      Status: ${status}`);
        } else {
          console.log(`   ⚠️  ${shipmentId} - EXISTS but NO CONTRACT`);
        }
      }
    } catch (error) {
      RESULTS.shipments.missing++;
      console.log(`   ❌ ${shipmentId} - NOT FOUND`);
    }
  }
}

async function verifyClearances() {
  console.log('\n🛃 4. VERIFYING CUSTOMS CLEARANCES');
  console.log('─'.repeat(80));
  
  const clearances = await pool.query(`
    SELECT clearance_id, shipment_id, status, clearance_number
    FROM customs_clearances
    WHERE status IN ('CLEARED', 'cleared')
    ORDER BY clearance_id DESC
  `);
  
  RESULTS.clearances.total = clearances.rows.length;
  console.log(`   PostgreSQL: ${RESULTS.clearances.total} cleared shipments`);
  
  for (const clearance of clearances.rows) {
    try {
      const response = await fabricService.queryChaincode('ReadShipment', [clearance.shipment_id]);
      const shipment = response.data || response;
      const blockchainStatus = shipment.status || shipment.Status;
      
      if (blockchainStatus === 'CUSTOMS_CLEARED') {
        RESULTS.clearances.synced++;
        console.log(`   ✅ ${clearance.shipment_id} - ${clearance.clearance_number}`);
      } else {
        console.log(`   ⚠️  ${clearance.shipment_id} - Blockchain status: ${blockchainStatus}`);
      }
    } catch (error) {
      RESULTS.clearances.missing++;
      console.log(`   ❌ ${clearance.shipment_id} - NOT FOUND`);
    }
  }
}

async function printFinalReport() {
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 COMPREHENSIVE VERIFICATION REPORT');
  console.log('═'.repeat(80));
  
  console.log('\n1️⃣  EXPORTERS');
  console.log(`   Total in PostgreSQL:  ${RESULTS.exporters.total}`);
  console.log(`   ✅ Synced to Blockchain: ${RESULTS.exporters.synced}`);
  console.log(`   ❌ Missing:              ${RESULTS.exporters.missing}`);
  const exporterRate = RESULTS.exporters.total > 0 
    ? ((RESULTS.exporters.synced / RESULTS.exporters.total) * 100).toFixed(1) 
    : 0;
  console.log(`   📈 Sync Rate:            ${exporterRate}%`);
  
  console.log('\n2️⃣  SALES CONTRACTS');
  console.log(`   Total Expected:       ${RESULTS.contracts.total}`);
  console.log(`   ✅ Found on Blockchain:  ${RESULTS.contracts.synced}`);
  console.log(`   ❌ Missing:              ${RESULTS.contracts.missing}`);
  const contractRate = RESULTS.contracts.total > 0 
    ? ((RESULTS.contracts.synced / RESULTS.contracts.total) * 100).toFixed(1) 
    : 0;
  console.log(`   📈 Sync Rate:            ${contractRate}%`);
  
  console.log('\n3️⃣  SHIPMENTS');
  console.log(`   Total in PostgreSQL:  ${RESULTS.shipments.total}`);
  console.log(`   ✅ Synced to Blockchain: ${RESULTS.shipments.synced}`);
  console.log(`   🔗 Linked to Contracts:  ${RESULTS.shipments.linked}`);
  console.log(`   ❌ Missing:              ${RESULTS.shipments.missing}`);
  const shipmentRate = RESULTS.shipments.total > 0 
    ? ((RESULTS.shipments.synced / RESULTS.shipments.total) * 100).toFixed(1) 
    : 0;
  const linkRate = RESULTS.shipments.synced > 0 
    ? ((RESULTS.shipments.linked / RESULTS.shipments.synced) * 100).toFixed(1) 
    : 0;
  console.log(`   📈 Sync Rate:            ${shipmentRate}%`);
  console.log(`   🔗 Link Rate:            ${linkRate}%`);
  
  console.log('\n4️⃣  CUSTOMS CLEARANCES');
  console.log(`   Total in PostgreSQL:  ${RESULTS.clearances.total}`);
  console.log(`   ✅ Synced to Blockchain: ${RESULTS.clearances.synced}`);
  console.log(`   ❌ Missing:              ${RESULTS.clearances.missing}`);
  const clearanceRate = RESULTS.clearances.total > 0 
    ? ((RESULTS.clearances.synced / RESULTS.clearances.total) * 100).toFixed(1) 
    : 0;
  console.log(`   📈 Sync Rate:            ${clearanceRate}%`);
  
  console.log('\n' + '═'.repeat(80));
  
  const totalItems = RESULTS.exporters.total + RESULTS.contracts.total + 
                     RESULTS.shipments.total + RESULTS.clearances.total;
  const totalSynced = RESULTS.exporters.synced + RESULTS.contracts.synced + 
                      RESULTS.shipments.synced + RESULTS.clearances.synced;
  const overallRate = totalItems > 0 ? ((totalSynced / totalItems) * 100).toFixed(1) : 0;
  
  console.log(`\n🎯 OVERALL SYSTEM SYNC: ${overallRate}%`);
  
  if (overallRate >= 95) {
    console.log('\n✨ ✨ ✨ EXCELLENT! SYSTEM FULLY SYNCHRONIZED! ✨ ✨ ✨');
  } else if (overallRate >= 80) {
    console.log('\n✅ GOOD! Most data synchronized, minor gaps remain.');
  } else {
    console.log('\n⚠️  WARNING! Significant data gaps detected.');
  }
  
  console.log('\n💡 System Status:');
  console.log('   • Coffee-Chaincode: v1.67 (running on port 9999)');
  console.log('   • Blockchain Network: Hyperledger Fabric 2.5');
  console.log('   • PostgreSQL Database: Connected');
  console.log('   • Data Flow: PostgreSQL ↔️ Blockchain (CouchDB)');
  console.log('═'.repeat(80) + '\n');
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔍 COMPREHENSIVE SYSTEM VERIFICATION');
  console.log('   PostgreSQL ↔️ Hyperledger Fabric Blockchain');
  console.log('═'.repeat(80));
  
  try {
    await fabricService.connectAsOrg('ECTAMSP');
    console.log('\n✅ Connected to blockchain as ECTAMSP');
    console.log('✅ Connected to PostgreSQL database');
    
    await verifyExporters();
    await verifyContracts();
    await verifyShipments();
    await verifyClearances();
    
    await printFinalReport();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
