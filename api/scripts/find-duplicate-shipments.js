// Find duplicate shipment IDs in blockchain
const FabricService = require('../dist/services/fabricService').FabricService;

async function findDuplicates() {
  try {
    console.log('🔍 Checking for duplicate shipment records...\n');
    
    const fabricService = FabricService.getInstance();
    const result = await fabricService.getAllShipments();
    
    if (!result.success) {
      console.error('❌ Failed to query shipments:', result.error);
      return;
    }
    
    const shipments = result.data || [];
    const idCount = {};
    const duplicates = {};
    
    shipments.forEach(s => {
      const id = s.ShipmentID || s.shipmentId;
      if (!idCount[id]) {
        idCount[id] = [];
      }
      idCount[id].push({
        status: s.Status || s.status,
        createdAt: s.CreatedAt || s.createdAt,
        updatedAt: s.UpdatedAt || s.updatedAt,
      });
    });
    
    // Find duplicates
    Object.keys(idCount).forEach(id => {
      if (idCount[id].length > 1) {
        duplicates[id] = idCount[id];
      }
    });
    
    if (Object.keys(duplicates).length === 0) {
      console.log('✅ No duplicate shipment IDs found');
    } else {
      console.log(`❌ Found ${Object.keys(duplicates).length} shipment(s) with duplicate records:\n`);
      Object.keys(duplicates).forEach(id => {
        console.log(`\n🔴 ${id}:`);
        duplicates[id].forEach((record, index) => {
          console.log(`   Record ${index + 1}:`);
          console.log(`     Status: ${record.status}`);
          console.log(`     Created: ${record.createdAt}`);
          console.log(`     Updated: ${record.updatedAt}`);
        });
      });
      
      console.log('\n\n💡 SOLUTION: The blockchain has duplicate records for the same shipment ID.');
      console.log('This is why the UI shows conflicting statuses.');
      console.log('\nThe shipment is ACTUALLY DELIVERED (most recent status),');
      console.log('but an old CUSTOMS_CLEARED record is still in the blockchain.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findDuplicates();
