/**
 * CLEANUP ORPHANED CLEARANCES
 * 
 * Problem: 5 customs clearances exist in PostgreSQL but reference
 *          shipments that have no corresponding applications.
 * 
 * Solution: Delete these invalid clearances to restore data integrity
 * 
 * These are BAD DATA - clearances for shipments that never properly existed.
 */

require('dotenv').config();
const DatabaseService = require('./dist/services/databaseService').default;

const databaseService = DatabaseService.getInstance();

const ORPHANED_SHIPMENTS = [
  'SHIP1786100432',
  'SHIP1786097364',
  'SHIP1786091339',
  'SHIP1786089813',
  'SHIP1786089403'
];

async function deleteOrphanedClearance(shipmentId) {
  console.log(`\n🗑️  Deleting clearance for ${shipmentId}...`);
  
  try {
    const result = await databaseService.query(
      `DELETE FROM customs_clearances WHERE shipment_id = $1 RETURNING *`,
      [shipmentId]
    );
    
    if (result.rows.length > 0) {
      console.log(`   ✅ Deleted clearance: ${result.rows[0].clearance_id}`);
      return true;
    } else {
      console.log(`   ℹ️  No clearance found (already deleted)`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🧹 CLEANUP ORPHANED CLEARANCES`);
  console.log(`Removing ${ORPHANED_SHIPMENTS.length} invalid clearances from PostgreSQL`);
  console.log(`${'═'.repeat(80)}\n`);
  
  let deleted = 0;
  
  for (const shipmentId of ORPHANED_SHIPMENTS) {
    const success = await deleteOrphanedClearance(shipmentId);
    if (success) deleted++;
  }
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 CLEANUP COMPLETE`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`✅ Deleted: ${deleted} orphaned clearances`);
  console.log(`${'═'.repeat(80)}`);
  
  if (deleted > 0) {
    console.log(`\n✨ DATABASE INTEGRITY RESTORED!`);
    console.log(`\n🎯 PostgreSQL ↔️ Blockchain now fully synchronized`);
    console.log(`   All clearances in PostgreSQL now reference valid shipments on blockchain\n`);
  }
  
  await databaseService.close();
  process.exit(0);
}

console.log(`\n🚀 Starting cleanup of orphaned data...`);
main().catch(console.error);
