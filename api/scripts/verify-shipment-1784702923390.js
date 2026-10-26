// Verify specific shipment status in blockchain
const FabricService = require('../dist/services/fabricService').FabricService;

async function verifyShipment() {
  try {
    const shipmentId = 'SHIPMENT1784702923390';
    console.log(`🔍 Verifying shipment: ${shipmentId}\n`);
    
    const fabricService = FabricService.getInstance();
    
    // Query the specific shipment
    const result = await fabricService.queryChaincode('ReadShipment', [shipmentId]);
    
    if (!result.success) {
      console.error('❌ Failed to read shipment:', result.error);
      return;
    }
    
    const shipment = result.data;
    console.log('📦 SHIPMENT DATA FROM BLOCKCHAIN:\n');
    console.log(`ID: ${shipment.ShipmentID || shipment.shipmentId}`);
    console.log(`Status: ${shipment.Status || shipment.status}`);
    console.log(`Contract: ${shipment.ContractID || shipment.contractId}`);
    console.log(`Exporter: ${shipment.ExporterID || shipment.exporterId}`);
    console.log(`Buyer: ${shipment.BuyerID || shipment.buyerId}`);
    console.log(`Quantity: ${shipment.Quantity || shipment.quantity} kg`);
    console.log(`Origin: ${shipment.Origin || shipment.origin}`);
    console.log(`Grade: ${shipment.Grade || shipment.grade}`);
    console.log(`Created: ${shipment.CreatedAt || shipment.createdAt}`);
    console.log(`Updated: ${shipment.UpdatedAt || shipment.updatedAt}`);
    
    // Check customs clearance
    if (shipment.Status === 'CUSTOMS_CLEARED' || shipment.status === 'CUSTOMS_CLEARED') {
      console.log('\n✅ STATUS VERIFICATION: CUSTOMS_CLEARED');
      console.log('✅ This shipment is ready for land transport!');
      console.log('\n📋 NEXT ACTION: Start Land Transport');
      console.log('   - Transport Company: (enter company name)');
      console.log('   - Truck Plate: (enter plate number)');
      console.log('   - Driver Name: (enter driver name)');
      console.log('   - This will move shipment from CUSTOMS_CLEARED → LAND_TRANSPORT');
    } else {
      console.log(`\n❌ STATUS VERIFICATION FAILED!`);
      console.log(`   Expected: CUSTOMS_CLEARED`);
      console.log(`   Actual: ${shipment.Status || shipment.status}`);
      console.log('\n   This shipment is NOT ready for land transport.');
    }
    
    // Check for customs declaration
    console.log('\n🛃 CUSTOMS DECLARATION CHECK:');
    const declId = `CD-${shipmentId}`;
    try {
      const declResult = await fabricService.queryChaincode('ReadCustomsDeclaration', [declId]);
      if (declResult.success && declResult.data) {
        const decl = declResult.data;
        console.log(`   Declaration ID: ${declId}`);
        console.log(`   Declaration Status: ${decl.Status || decl.status}`);
        console.log(`   Clearance Number: ${decl.ClearanceNumber || decl.clearanceNumber || 'N/A'}`);
        console.log(`   Clearance Date: ${decl.ClearanceDate || decl.clearanceDate || 'N/A'}`);
        
        if (decl.Status === 'CLEARED' || decl.status === 'CLEARED') {
          console.log('   ✅ Customs declaration is CLEARED');
        } else {
          console.log(`   ⚠️ Declaration status: ${decl.Status || decl.status}`);
        }
      } else {
        console.log('   ℹ️ No customs declaration found (may not be required)');
      }
    } catch (err) {
      console.log('   ℹ️ No customs declaration found');
    }
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyShipment();
