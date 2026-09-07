const { Pool } = require('pg');
const FabricService = require('./dist/services/fabricService').default;

const pool = new Pool({
  user: process.env.DB_USER || 'cecbs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function checkShipments() {
  console.log('🔍 Checking blockchain shipments...\n');
  
  try {
    // Get approved applications
    const result = await pool.query(`
      SELECT application_id 
      FROM exporter_applications 
      WHERE status = 'approved'
      ORDER BY application_id
    `);
    
    console.log(`📊 Found ${result.rows.length} approved applications in PostgreSQL\n`);
    
    // Connect to blockchain
    const fabricService = new FabricService();
    await fabricService.connectAsOrg('ECTAMSP');
    console.log('✅ Connected to blockchain\n');
    
    let existCount = 0;
    let notFoundCount = 0;
    
    for (const row of result.rows) {
      const shipmentId = `SHIPAPP-${row.application_id}`;
      
      try {
        const shipment = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
        console.log(`✅ ${shipmentId} - EXISTS`);
        console.log(`   Contract: ${shipment.contract || 'NONE'}`);
        console.log(`   Exporter: ${shipment.exporterId}`);
        existCount++;
      } catch (error) {
        console.log(`❌ ${shipmentId} - NOT FOUND`);
        notFoundCount++;
      }
    }
    
    console.log(`\n════════════════════════════════════════════════════════════════`);
    console.log(`📊 SUMMARY`);
    console.log(`════════════════════════════════════════════════════════════════`);
    console.log(`Total Applications:     ${result.rows.length}`);
    console.log(`✅ Shipments Found:      ${existCount}`);
    console.log(`❌ Shipments Not Found:  ${notFoundCount}`);
    console.log(`════════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkShipments();
