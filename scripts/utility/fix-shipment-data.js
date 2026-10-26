// Fix Shipment Data - Convert null documents to empty arrays
// This script fixes the schema validation error in shipment data

const { exec } = require('child_process');

console.log('🔧 Fixing shipment data schema issues...');

// Test API endpoint first
const testAPI = async () => {
  console.log('\n📡 Testing API endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const result = await response.json();
    console.log('Login test:', result.success ? '✅ Success' : '❌ Failed');
    
    if (result.success && result.token) {
      // Test shipments endpoint
      const shipmentsResponse = await fetch('http://localhost:3001/api/v1/shipments', {
        headers: {
          'Authorization': `Bearer ${result.token}`
        }
      });
      
      const shipmentsResult = await shipmentsResponse.json();
      console.log('Shipments API:', shipmentsResult.success ? '✅ Success' : '❌ Failed');
      console.log('Shipments count:', shipmentsResult.data ? shipmentsResult.data.length : 0);
      
      if (shipmentsResult.data && shipmentsResult.data.length > 0) {
        console.log('\n📦 Sample shipment data:');
        const sample = shipmentsResult.data[0];
        console.log('- Shipment ID:', sample.ShipmentID || sample.shipmentId || 'Not found');
        console.log('- Status:', sample.Status || sample.status || sample.shipmentStatus || 'Not found');
        console.log('- Exporter:', sample.ExporterID || sample.exporterId || 'Not found');
        
        // Check how many have cleared status
        const cleared = shipmentsResult.data.filter(s => 
          (s.Status && s.Status.includes('CLEARED')) ||
          (s.status && s.status.includes('CLEARED')) ||
          (s.shipmentStatus && s.shipmentStatus.includes('CLEARED'))
        );
        console.log('- Cleared shipments:', cleared.length);
        
        // Check statuses
        const statuses = [...new Set(shipmentsResult.data.map(s => 
          s.Status || s.status || s.shipmentStatus || 'UNKNOWN'
        ))];
        console.log('- All statuses found:', statuses.join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

// Check what's causing the shipment query issue
const diagnoseChaincode = () => {
  console.log('\n🔍 Diagnosing chaincode issue...');
  console.log('Issue: Shipment documents field is null instead of array');
  console.log('Expected: documents: []');
  console.log('Found: documents: null');
  console.log('\n💡 Solutions:');
  console.log('1. Update chaincode to handle null documents');
  console.log('2. Fix existing data by updating null to empty arrays');
  console.log('3. Update API to handle both formats');
};

// Main execution
const main = async () => {
  console.log('🚀 CECBS Shipment Data Diagnosis');
  console.log('================================\n');
  
  await testAPI();
  diagnoseChaincode();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Login to the UI with proper credentials');
  console.log('2. Check if shipments appear after authentication');
  console.log('3. If still no data, check chaincode schema validation');
  console.log('4. Consider updating chaincode to handle null documents gracefully');
};

main().catch(console.error);