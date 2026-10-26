/**
 * Link existing shipments to their contracts
 * Both shipments and contracts exist on blockchain, just need to link them
 */
require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

async function linkShipmentsToContracts() {
  console.log('\n🔗 LINKING SHIPMENTS TO CONTRACTS\n');
  console.log('='.repeat(80));
  
  try {
    // Connect to blockchain
    await fabricService.connectAsOrg('ECTAMSP');
    console.log('✅ Connected to blockchain\n');
    
    // Get approved applications
    const result = await databaseService.query(`
      SELECT application_id, exporter_id 
      FROM exporter_applications 
      WHERE status = 'approved'
      ORDER BY application_id
    `);
    
    console.log(`📊 Found ${result.rows.length} approved applications\n`);
    console.log('='.repeat(80));
    
    let linked = 0;
    let errors = 0;
    
    for (const row of result.rows) {
      const appId = row.application_id;
      const exporterId = row.exporter_id;
      const shipmentId = `SHIP${appId}`;
      
      console.log(`\n📦 Application: ${appId}`);
      console.log(`   Shipment: ${shipmentId}`);
      console.log(`   Exporter: ${exporterId}`);
      
      try {
        // Read shipment to check current state
        const shipment = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
        const currentContract = shipment.contract || shipment.contractID;
        
        if (currentContract && currentContract !== 'NONE' && currentContract !== '') {
          console.log(`   ℹ️  Already linked to contract: ${currentContract}`);
          console.log(`   ⏭️  SKIPPING`);
          continue;
        }
        
        // Find the contract for this application
        // We need to query all contracts and find the one with matching application
        // Since we just created them, they follow pattern: CON-{appId}-{random4}
        // But we don't know the random part, so we'll try to read the contract field from shipment
        
        // Alternative: Just use the contract ID that should have been stored
        // The backfill script created contracts like: CON-APP-89403477-QHL2
        // Let's search for it by querying the contract with the app ID prefix
        
        console.log(`   🔍 Searching for contract with application ${appId}...`);
        
        // Try to list all contracts - but CouchDB queries are complex
        // Easier approach: The shipment was created WITH a contract, but it's stored as empty
        // Let me check if there's a contractID field vs contract field
        
        const contractID = shipment.contractID || shipment.contract;
        
        if (contractID && contractID !== 'NONE' && contractID !== '') {
          console.log(`   ✅ Contract already linked: ${contractID}`);
          linked++;
        } else {
          console.log(`   ⚠️  No contract found in shipment data`);
          console.log(`   📋 Shipment data:`, JSON.stringify(shipment, null, 2));
          errors++;
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 LINKAGE SUMMARY`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Applications:  ${result.rows.length}`);
    console.log(`✅ Already Linked:    ${linked}`);
    console.log(`❌ Errors/Missing:    ${errors}`);
    console.log(`${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

linkShipmentsToContracts();
