// Check actual shipment statuses from blockchain
const FabricService = require('../dist/services/fabricService').FabricService;
const logger = require('../dist/utils/logger').logger;

async function checkShipmentStatuses() {
  try {
    console.log('🔍 Checking actual shipment statuses from blockchain...\n');
    
    const fabricService = FabricService.getInstance();
    
    // Get all shipments directly (FabricService connects automatically)
    const result = await fabricService.getAllShipments();
    
    if (!result.success) {
      console.error('❌ Failed to query shipments:', result.error);
      return;
    }
    
    const shipments = result.data || [];
    console.log(`📦 Total shipments found: ${shipments.length}\n`);
    
    // Group by status
    const byStatus = {};
    shipments.forEach(s => {
      const status = s.Status || s.status || 'UNKNOWN';
      if (!byStatus[status]) {
        byStatus[status] = [];
      }
      byStatus[status].push({
        id: s.ShipmentID || s.shipmentId,
        contract: s.ContractID || s.contractId,
        exporter: s.ExporterID || s.exporterId,
      });
    });
    
    // Print results
    console.log('📊 STATUS DISTRIBUTION:\n');
    Object.keys(byStatus).sort().forEach(status => {
      console.log(`\n✅ ${status}: ${byStatus[status].length} shipments`);
      byStatus[status].forEach(s => {
        console.log(`   - ${s.id} (Contract: ${s.contract}, Exporter: ${s.exporter})`);
      });
    });
    
    // Find CUSTOMS_CLEARED shipments specifically
    const customsCleared = shipments.filter(s => {
      const status = (s.Status || s.status || '').toUpperCase();
      return status === 'CUSTOMS_CLEARED';
    });
    
    console.log('\n\n🎯 CUSTOMS_CLEARED SHIPMENTS (Ready for Land Transport):\n');
    if (customsCleared.length === 0) {
      console.log('❌ NO SHIPMENTS WITH CUSTOMS_CLEARED STATUS FOUND!');
      console.log('\nThis explains why you cannot start land transport.');
      console.log('Your shipments may still be in CREATED or DELIVERED status.');
    } else {
      customsCleared.forEach(s => {
        console.log(`✅ ${s.ShipmentID || s.shipmentId}`);
        console.log(`   Status: ${s.Status || s.status}`);
        console.log(`   Contract: ${s.ContractID || s.contractId}`);
        console.log(`   Exporter: ${s.ExporterID || s.exporterId}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkShipmentStatuses();
