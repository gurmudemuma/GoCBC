/**
 * Check which shipments have clearances in PostgreSQL
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;
const databaseService = DatabaseService.getInstance();

const shipmentsToCheck = [
  'SHIP1786102768',
  'SHIP1786102989',
  'SHIP1786104364',
  'SHIP1787204371672'
];

async function checkClearances() {
  console.log('🔍 Checking clearances in PostgreSQL database...\n');

  for (const shipmentId of shipmentsToCheck) {
    try {
      const result = await databaseService.query(
        'SELECT * FROM customs_clearances WHERE shipment_id = $1',
        [shipmentId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ ${shipmentId}: NO clearance record`);
      } else {
        const clearance = result.rows[0];
        console.log(`✅ ${shipmentId}:`);
        console.log(`   - Clearance ID: ${clearance.clearance_id}`);
        console.log(`   - Status: ${clearance.status}`);
        console.log(`   - Cleared By: ${clearance.cleared_by || 'N/A'}`);
        console.log(`   - Cleared Date: ${clearance.cleared_date || 'N/A'}`);
        console.log(`   - Clearance Number: ${clearance.clearance_number || 'N/A'}\n`);
      }
    } catch (error) {
      console.error(`Error checking ${shipmentId}:`, error.message);
    }
  }

  await databaseService.close();
  console.log('\n✨ Check complete!\n');
  process.exit(0);
}

checkClearances().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
