const { Pool } = require('pg');
const FabricService = require('./dist/services/fabricService').default;

const pool = new Pool({
  user: process.env.DB_USER || 'cecbs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function verifySync() {
  console.log('\n🔍 FINAL SYNC VERIFICATION\n');
  console.log('=' .repeat(80));
  
  try {
    // Get approved applications
    const result = await pool.query(`
      SELECT application_id 
      FROM exporter_applications 
      WHERE status = 'approved'
      ORDER BY application_id
    `);
    
    console.log(`\n📊 Found ${result.rows.length} approved applications in PostgreSQL\n`);
    
    // Connect to blockchain
    const fabricService = new FabricService();
    await fabricService.connectAsOrg('ECTAMSP');
    console.log('✅ Connected to blockchain\n');
    console.log('=' .repeat(80));
    
    let synced = 0;
    let notSynced = 0;
    
    for (const row of result.rows) {
      const appId = row.application_id;
      const shipmentId = `SHIP${appId}`;  // Correct format: SHIP{application_id}
      
      console.log(`\n📦 Application: ${appId}`);
      console.log(`   Shipment ID: ${shipmentId}`);
      
      try {
        const response = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
        const shipment = response.data || response; // Handle wrapped response
        console.log(`   ✅ Shipment EXISTS on blockchain`);
        
        // Check both possible field names
        const contractId = shipment.contractId || shipment.contract;
        const exporterId = shipment.exporterId || shipment.exporterID;
        const status = shipment.status || shipment.Status;
        
        console.log(`   Contract: ${contractId || 'NONE'}`);
        console.log(`   Exporter: ${exporterId || 'N/A'}`);
        console.log(`   Status: ${status || 'N/A'}`);
        synced++;
      } catch (error) {
        console.log(`   ❌ Shipment NOT FOUND on blockchain`);
        console.log(`   Error: ${error.message}`);
        notSynced++;
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FINAL SUMMARY`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Applications:     ${result.rows.length}`);
    console.log(`✅ Shipments Synced:     ${synced}`);
    console.log(`❌ Shipments Missing:    ${notSynced}`);
    console.log(`📈 Sync Rate:            ${((synced / result.rows.length) * 100).toFixed(1)}%`);
    console.log(`${'='.repeat(80)}\n`);
    
    if (synced === result.rows.length) {
      console.log('✨ ✨ ✨ PERFECT SYNC! ALL DATA SYNCHRONIZED! ✨ ✨ ✨\n');
    } else {
      console.log(`⚠️  ${notSynced} shipments still need to be created\n`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifySync();
