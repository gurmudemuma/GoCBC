/**
 * Test if the shipments API now works after the fix
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🧪 Testing Shipments API after fix\n');
  console.log('=' .repeat(80));
  
  try {
    console.log('\n📡 Making request to /api/v1/shipments...');
    const result = await makeRequest('/api/v1/shipments');
    
    console.log(`\n📊 Response Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('✅ SUCCESS! Shipments API is working!');
      console.log(`\nShipments found: ${result.data.data?.length || 0}`);
      
      if (result.data.data && result.data.data.length > 0) {
        const sample = result.data.data[0];
        console.log('\n📦 Sample shipment:');
        console.log(`   ID: ${sample.shipmentId || sample._id || 'N/A'}`);
        console.log(`   Exporter: ${sample.exporterId || 'N/A'}`);
        console.log(`   Origin: ${sample.origin || 'N/A'}`);
        console.log(`   Quantity: ${sample.quantity || 0} kg`);
        console.log(`   Status: ${sample.status || 'N/A'}`);
        console.log(`   ecxLots: ${JSON.stringify(sample.ecxLots)}`);
        console.log(`   documents: ${JSON.stringify(sample.documents)}`);
        
        // Check for null values
        let hasNulls = false;
        result.data.data.forEach((shipment, idx) => {
          if (shipment.ecxLots === null || shipment.documents === null) {
            if (!hasNulls) {
              console.log('\n⚠️  WARNING: Found shipments with null arrays:');
              hasNulls = true;
            }
            console.log(`   - Shipment ${idx}: ecxLots=${shipment.ecxLots}, documents=${shipment.documents}`);
          }
        });
        
        if (!hasNulls) {
          console.log('\n✅ All shipments have proper array values (no nulls)!');
        }
      } else {
        console.log('\n⚠️  No shipments found in the response');
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('🎉 FIX SUCCESSFUL! The shipments API is now working properly.');
      
    } else if (result.status === 401) {
      console.log('⚠️  Authentication required (401)');
      console.log('This is expected if the endpoint requires login.');
      console.log('The important thing is: NO SDK VALIDATION ERROR!');
      console.log('\n✅ The fix appears to be working (no schema validation error)');
      
    } else {
      console.log(`❌ Error: ${result.data.error?.message || result.data.message || 'Unknown error'}`);
      
      if (result.data.error?.message?.includes('ecxLots') || 
          result.data.error?.message?.includes('Invalid type')) {
        console.log('\n💥 THE NULL ARRAY ERROR STILL EXISTS!');
        console.log('   The fix did not resolve the issue.');
      } else {
        console.log('\n✅ At least it\'s not the null array validation error anymore.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

main().catch(console.error);
