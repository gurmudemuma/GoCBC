/**
 * VERIFY CUSTOMS CLEARANCE SYNC
 * 
 * Ensures all clearances in PostgreSQL match blockchain status
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const FabricService = require('./dist/services/fabricService').default;

const databaseService = DatabaseService.getInstance();
const fabricService = new FabricService();

async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔍 CUSTOMS CLEARANCE SYNCHRONIZATION VERIFICATION`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    await fabricService.connectAsOrg('ECTAMSP');
    console.log(`✅ Connected to blockchain\n`);

    // Get all clearances from PostgreSQL
    const clearancesResult = await databaseService.query(
      `SELECT clearance_id, shipment_id, status, cleared_date 
       FROM customs_clearances 
       ORDER BY shipment_id`
    );

    const clearances = clearancesResult.rows;
    console.log(`📊 Found ${clearances.length} clearances in PostgreSQL\n`);

    let matched = 0;
    let mismatched = 0;

    for (const clearance of clearances) {
      console.log(`\n📦 ${clearance.shipment_id}`);
      console.log(`   PostgreSQL: ${clearance.status}`);

      // Check blockchain status
      const result = await fabricService.queryChaincode('ReadShipment', [clearance.shipment_id]);

      if (result.success && result.data) {
        const blockchainStatus = result.data.status;
        console.log(`   Blockchain: ${blockchainStatus}`);

        if (blockchainStatus === 'CUSTOMS_CLEARED') {
          console.log(`   ✅ SYNCHRONIZED`);
          matched++;
        } else {
          console.log(`   ⚠️  MISMATCH - Expected CUSTOMS_CLEARED`);
          mismatched++;
        }
      } else {
        console.log(`   ❌ NOT FOUND ON BLOCKCHAIN`);
        mismatched++;
      }
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 FINAL REPORT`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`Total Clearances:     ${clearances.length}`);
    console.log(`✅ Synchronized:       ${matched}`);
    console.log(`❌ Mismatched:         ${mismatched}`);
    console.log(`${'═'.repeat(80)}`);

    if (mismatched === 0 && clearances.length > 0) {
      console.log(`\n🎉 PERFECT SYNC!`);
      console.log(`All clearances in PostgreSQL match blockchain status\n`);
    } else if (clearances.length === 0) {
      console.log(`\n✅ NO CLEARANCES YET - System ready\n`);
    } else {
      console.log(`\n⚠️  ${mismatched} clearances need attention\n`);
    }

  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

main();
