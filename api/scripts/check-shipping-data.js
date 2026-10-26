// Diagnostic script to check shipping data
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api/v1';

async function checkShippingData() {
  try {
    console.log('=== CHECKING SHIPPING DATA ===\n');
    
    // First, try to get all shipments
    const response = await fetch(`${API_URL}/shipments`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const shipments = result.data;
      console.log(`Total shipments found: ${shipments.length}\n`);
      
      // Group by status
      const byStatus = {};
      shipments.forEach(s => {
        const status = s.Status || s.status || s.shipmentStatus || 'UNKNOWN';
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(s);
      });
      
      console.log('Shipments by Status:');
      Object.keys(byStatus).forEach(status => {
        console.log(`  ${status}: ${byStatus[status].length} shipments`);
      });
      console.log('');
      
      // Show customs cleared shipments
      const customsCleared = shipments.filter(s => {
        const status = s.Status || s.status || s.shipmentStatus || '';
        const customsStatus = s.CustomsStatus || s.customsStatus || '';
        return status === 'CUSTOMS_CLEARED' || 
               status === 'CLEARED' ||
               status.includes('CLEARED') ||
               customsStatus === 'CLEARED';
      });
      
      console.log(`Customs Cleared Shipments: ${customsCleared.length}`);
      if (customsCleared.length > 0) {
        console.log('\nSample customs cleared shipment:');
        const sample = customsCleared[0];
        console.log(JSON.stringify({
          ShipmentID: sample.ShipmentID || sample.shipmentId,
          Status: sample.Status || sample.status,
          CustomsStatus: sample.CustomsStatus || sample.customsStatus,
          TransportMode: sample.TransportMode || sample.transportMode,
          BillOfLadingNo: sample.BillOfLadingNo || sample.billOfLadingNo,
          AirwayBill: sample.AirwayBill || sample.airwayBill,
        }, null, 2));
      } else {
        console.log('\nNo customs cleared shipments found!');
        console.log('\nShowing sample shipment data for debugging:');
        if (shipments.length > 0) {
          console.log(JSON.stringify(shipments[0], null, 2));
        }
      }
      
    } else {
      console.error('Failed to retrieve shipments:', result.error);
    }
    
  } catch (error) {
    console.error('Error checking shipping data:', error.message);
  }
}

checkShippingData();
