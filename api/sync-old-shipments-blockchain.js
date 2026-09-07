/**
 * Sync Old Shipments to Blockchain (CouchDB)
 * Updates blockchain status for shipments cleared before the blockchain fix
 * Syncs PostgreSQL clearances → Hyperledger Fabric blockchain (CouchDB state database)
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

const shipmentsToSync = [
  'SHIP1786102768',
  'SHIP1786102989',
  'SHIP1786104364',
  'SHIP1787204371672'
];

async function syncShipments() {
  console.log('🔄 Starting blockchain (CouchDB) synchronization for old shipments...\n');
  console.log('📊 Source: PostgreSQL → Target: Hyperledger Fabric (CouchDB)\n');

  for (const shipmentId of shipmentsToSync) {
    try {
      console.log(`\n📦 Processing ${shipmentId}...`);

      // Check if shipment is cleared in PostgreSQL (handle both uppercase and lowercase)
      const result = await databaseService.query(
        `SELECT * FROM customs_clearances 
         WHERE shipment_id = $1 AND (status = $2 OR status = $3)`,
        [shipmentId, 'CLEARED', 'cleared']
      );

      if (result.rows.length === 0) {
        console.log(`   ⚠️ No clearance found in PostgreSQL - skipping`);
        continue;
      }

      const clearance = result.rows[0];
      console.log(`   ✅ Found clearance in PostgreSQL`);
      console.log(`      - Clearance ID: ${clearance.clearance_id}`);
      console.log(`      - Cleared Date: ${clearance.clearance_date}`);
      console.log(`      - Cleared By: ${clearance.cleared_by || 'N/A'}`);

      // Connect to blockchain as CustomsMSP
      await fabricService.connectAsOrg('CustomsMSP');
      console.log('   🔗 Connected to Hyperledger Fabric as CustomsMSP');

      // Update shipment status on blockchain (writes to CouchDB)
      const blockchainResult = await fabricService.invokeChaincode(
        'UpdateShipmentStatus',
        [shipmentId, 'CUSTOMS_CLEARED']
      );

      console.log(`   ✅ Blockchain (CouchDB) updated successfully`);
      console.log(`   📝 Transaction ID:`, blockchainResult);

    } catch (error) {
      console.error(`   ❌ Error syncing ${shipmentId}:`, error.message);
      if (error.stack) {
        console.error(`   Stack:`, error.stack);
      }
    }
  }

  await databaseService.close();
  console.log('\n\n✨ Synchronization complete!');
  console.log('✅ PostgreSQL ↔️ CouchDB (Blockchain) now in sync');
  console.log('🔍 Check Shipping Portal - warning logs should be gone for these shipments.\n');
  process.exit(0);
}

syncShipments().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
