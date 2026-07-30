/**
 * Test Script: Forex Allocation Workflow
 * This script tests the complete forex allocation process
 */

const API_BASE = 'http://localhost:3001/api/v1';

// Get auth token from command line or use default
const AUTH_TOKEN = process.argv[2] || 'YOUR_TOKEN_HERE';

async function testForexAllocation() {
  console.log('🧪 Testing Forex Allocation Workflow\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Query existing forex allocations
    console.log('\n📊 Step 1: Query Forex Allocations');
    console.log('-'.repeat(60));
    
    const forexResponse = await fetch(`${API_BASE}/forex`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const forexResult = await forexResponse.json();
    
    if (forexResult.success) {
      console.log(`✅ Forex query successful`);
      console.log(`   Found ${forexResult.data.length} forex allocation(s)`);
      
      if (forexResult.data.length > 0) {
        console.log('\n   Forex Records:');
        forexResult.data.forEach((forex, index) => {
          console.log(`   ${index + 1}. ${forex.forexId}`);
          console.log(`      - LC: ${forex.lcId || 'Not linked'}`);
          console.log(`      - Exporter: ${forex.exporterId}`);
          console.log(`      - Amount: ${forex.currency} ${forex.requestedAmount || forex.allocatedAmount}`);
          console.log(`      - Status: ${forex.status}`);
          console.log(`      - Has _v2 suffix: ${forex.forexId.includes('_v2') ? '✅ YES' : '❌ NO'}`);
        });
      } else {
        console.log('   ⚠️  No forex allocations found');
        console.log('   💡 This could mean:');
        console.log('      1. No LCs have been issued yet');
        console.log('      2. Forex auto-creation failed during LC issuance');
        console.log('      3. Only old forex records exist (without _v2 suffix)');
      }
    } else {
      console.log(`❌ Forex query failed: ${forexResult.error?.message}`);
    }
    
    // Step 2: Query Letter of Credits
    console.log('\n\n📋 Step 2: Query Letter of Credits');
    console.log('-'.repeat(60));
    
    const lcResponse = await fetch(`${API_BASE}/banking/lc/all`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const lcResult = await lcResponse.json();
    
    if (lcResult.success) {
      console.log(`✅ LC query successful`);
      console.log(`   Found ${lcResult.data.length} LC(s)`);
      
      if (lcResult.data.length > 0) {
        console.log('\n   LC Records:');
        const issuedLCs = lcResult.data.filter(lc => lc.status === 'ISSUED');
        
        lcResult.data.forEach((lc, index) => {
          console.log(`   ${index + 1}. ${lc.lcId}`);
          console.log(`      - Status: ${lc.status}`);
          console.log(`      - Exporter: ${lc.exporterId}`);
          console.log(`      - Amount: ${lc.currency} ${lc.amount}`);
        });
        
        console.log(`\n   📌 Issued LCs (should have forex): ${issuedLCs.length}`);
      }
    } else {
      console.log(`❌ LC query failed: ${lcResult.error?.message}`);
    }
    
    // Step 3: Summary and Recommendations
    console.log('\n\n📝 Summary & Recommendations');
    console.log('='.repeat(60));
    
    if (forexResult.success && lcResult.success) {
      const forexCount = forexResult.data.length;
      const issuedLCCount = lcResult.data.filter(lc => lc.status === 'ISSUED').length;
      const forexWithV2 = forexResult.data.filter(f => f.forexId.includes('_v2')).length;
      
      console.log(`Total Forex Allocations: ${forexCount}`);
      console.log(`Forex with _v2 suffix: ${forexWithV2}`);
      console.log(`Issued LCs: ${issuedLCCount}`);
      
      if (forexCount === 0 && issuedLCCount > 0) {
        console.log('\n⚠️  WARNING: You have issued LCs but no forex allocations!');
        console.log('   Action Required:');
        console.log('   1. Check API logs for forex creation errors');
        console.log('   2. Restart API server to load new code with _v2 suffix');
        console.log('   3. Issue a NEW LC to test auto-creation');
      } else if (forexCount > 0 && forexWithV2 === 0) {
        console.log('\n⚠️  WARNING: All forex records are OLD format (no _v2 suffix)');
        console.log('   Action Required:');
        console.log('   1. Restart API server');
        console.log('   2. Issue a NEW LC to create forex with _v2 suffix');
      } else if (forexWithV2 > 0) {
        console.log('\n✅ SUCCESS: Found forex records with _v2 suffix');
        console.log('   These should appear in Banking Operations → Forex Allocation tab');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test Complete\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('   Make sure:');
    console.error('   1. API server is running on http://localhost:3001');
    console.error('   2. You provided a valid auth token');
    console.error('   3. Run: node test-forex-allocation.js YOUR_AUTH_TOKEN');
  }
}

// Run the test
testForexAllocation();
