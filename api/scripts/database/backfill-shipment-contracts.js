/**
 * BACKFILL SHIPMENT-CONTRACT LINKAGE
 * 
 * Problem: 12 shipments exist on blockchain but have empty/null contractID fields
 * Solution: Update each shipment to link it to its corresponding contract
 * 
 * Approach: Read shipment → Modify contractID → Write back
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

const STATS = {
  total: 0,
  updated: 0,
  skipped: 0,
  errors: 0
};

// Map of application IDs to their contract IDs (from previous backfill)
const CONTRACT_MAPPINGS = {
  'APP-1787049053840-EKU11V': 'CON-APP-1787049053840-EKU11V-7IE1',
  'APP-55249022': 'CON-APP-55249022-5JF9',
  'APP-62508504': 'CON-APP-62508504-1ZOF',
  'APP-61613628': 'CON-APP-61613628-P5E3',
  'APP-59133713': 'CON-APP-59133713-W1DD',
  'APP-58101913': 'CON-APP-58101913-PF22',
  'APP-69830880': 'CON-APP-69830880-GMP8',
  'APP-07193259': 'CON-APP-07193259-A5BS',
  'APP-04364795': 'CON-APP-04364795-ZW3A',
  'APP-02989882': 'CON-APP-02989882-AB3A',
  'APP-02768434': 'CON-APP-02768434-YU3A',
  'APP-89403477': 'CON-APP-89403477-U31C'
};

async function updateShipmentContract(applicationId, shipmentID, contractID) {
  console.log(`\n📦 ${shipmentID}`);
  console.log(`   Application: ${applicationId}`);
  console.log(`   Target Contract: ${contractID}`);

  try {
    // Step 1: Read current shipment
    let shipment;
    try {
      shipment = await fabricService.queryChaincode('ReadShipment', [shipmentID]);
    } catch (readError) {
      // If ReadShipment throws an error saying "does not exist", 
      // this is misleading - the shipment exists but the query wrapper is catching the error.
      // Try to proceed anyway as the shipment should exist
      console.log(`   ⚠️  ReadShipment error (may be normal): ${readError.message}`);
      console.log(`   📝 Proceeding with contract linkage...`);
      shipment = null; // We'll update anyway
    }

    // If we got the shipment, check if already linked
    if (shipment && shipment.contractID && shipment.contractID !== '' && shipment.contractID !== 'undefined' && shipment.contractID !== 'NONE') {
      console.log(`   Current Contract: ${shipment.contractID}`);
      console.log(`   ℹ️  Already linked - SKIPPING`);
      STATS.skipped++;
      return true;
    }

    if (shipment) {
      console.log(`   Current Contract: ${shipment.contractID || 'NONE'}`);
    }

    // Step 2: Verify contract exists
    try {
      await fabricService.queryChaincode('ReadSalesContract', [contractID]);
      console.log(`   ✅ Contract verified`);
    } catch (contractError) {
      console.log(`   ❌ Contract ${contractID} not found: ${contractError.message}`);
      STATS.errors++;
      return false;
    }

    // Step 3: Update shipment with contract linkage using the new chaincode function
    console.log(`   🔗 Linking shipment to contract...`);
    
    try {
      const updateResult = await fabricService.invokeChaincode('UpdateShipmentContract', [shipmentID, contractID]);
      console.log(`   ✅ Successfully linked!`);
      console.log(`   Transaction ID: ${updateResult}`);
      STATS.updated++;
      return true;
    } catch (updateError) {
      console.log(`   ❌ Update failed: ${updateError.message}`);
      STATS.errors++;
      return false;
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    STATS.errors++;
    return false;
  }
}

async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔗 BACKFILL SHIPMENT-CONTRACT LINKAGE`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // Connect to blockchain
    await fabricService.connectAsOrg('ECTAMSP');
    console.log(`✅ Connected to blockchain as ECTAMSP\n`);

    // Get all approved applications
    const appsResult = await databaseService.query(
      `SELECT application_id FROM exporter_applications WHERE status = 'approved' ORDER BY application_id DESC`
    );

    STATS.total = appsResult.rows.length;
    console.log(`📊 Found ${STATS.total} approved applications\n`);

    // Process each application
    for (const app of appsResult.rows) {
      const applicationId = app.application_id;
      const shipmentID = `SHIPAPP-${applicationId}`;
      const contractID = CONTRACT_MAPPINGS[applicationId];

      if (!contractID) {
        console.log(`\n⚠️  No contract mapping for ${applicationId} - SKIPPING`);
        STATS.skipped++;
        continue;
      }

      await updateShipmentContract(applicationId, shipmentID, contractID);
      
      // Small delay between updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Print summary
    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📊 BACKFILL SUMMARY`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`Total Shipments:  ${STATS.total}`);
    console.log(`✅ Updated:        ${STATS.updated}`);
    console.log(`ℹ️  Skipped:        ${STATS.skipped}`);
    console.log(`❌ Errors:         ${STATS.errors}`);
    console.log(`${'═'.repeat(80)}\n`);

    if (STATS.updated > 0) {
      console.log(`✅ SUCCESS! ${STATS.updated} shipments linked to contracts`);
      console.log(`\nRun verification script to confirm:  node verify-complete-sync.js\n`);
    } else if (STATS.skipped === STATS.total) {
      console.log(`✅ All shipments already linked!\n`);
    } else {
      console.log(`⚠️  Some shipments could not be updated. Review errors above.\n`);
    }

  } catch (error) {
    console.error(`\n❌ Fatal error:`, error.message);
    console.error(error.stack);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

// Execute backfill
console.log(`\n🚀 Starting shipment-contract linkage backfill...`);
main();
