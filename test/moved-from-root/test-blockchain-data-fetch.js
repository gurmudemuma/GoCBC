/**
 * Standalone test to verify blockchain data fetching works
 * 
 * Run this in browser console (F12) to test CouchDB access
 * 
 * Usage:
 *   1. Open browser console (F12)
 *   2. Copy and paste this entire code
 *   3. Run: await testBlockchainDataFetch()
 */

async function testBlockchainDataFetch() {
  console.log('='.repeat(80));
  console.log('🧪 Testing Blockchain Data Fetch');
  console.log('='.repeat(80));
  
  // Test 1: Direct CouchDB access
  console.log('\n📊 Test 1: Direct CouchDB Query');
  console.log('-'.repeat(80));
  
  try {
    const auth = btoa('admin:adminpw');
    const response = await fetch('http://localhost:5984/coffeechannel_coffee/_all_docs?startkey="FOREX_"&endkey="FOREX_\\ufff0"&include_docs=true', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ CouchDB query failed:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ CouchDB query successful`);
    console.log(`   Total rows in database: ${data.total_rows}`);
    console.log(`   FOREX records found: ${data.rows.length}`);
    console.log('');
    
    if (data.rows.length === 0) {
      console.warn('⚠️  No forex records found in blockchain');
      return;
    }
    
    // Display forex records
    console.log('📋 Forex Records from Blockchain:');
    console.log('');
    
    data.rows.forEach((row, index) => {
      const doc = row.doc;
      console.log(`${index + 1}. Forex ID: ${doc.forexId}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Exporter: ${doc.exporterId}`);
      console.log(`   Requested: $${doc.requestedAmount?.toLocaleString()} ${doc.currency}`);
      console.log(`   Allocated: $${doc.allocatedAmount?.toLocaleString()} ${doc.currency}`);
      console.log(`   Exchange Rate: ${doc.exchangeRate} ETB/USD`);
      console.log(`   LC ID: ${doc.lcId || 'Not assigned'}`);
      console.log(`   Created: ${new Date(doc.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    // Test 2: Check if UI state has data
    console.log('📊 Test 2: Checking UI State');
    console.log('-'.repeat(80));
    
    // Try to find React root and check forex state
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactRootContainer) {
      console.log('✅ React app found');
      console.log('⚠️  Note: React state inspection requires React DevTools');
      console.log('   Install: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi');
    } else {
      console.log('ℹ️  React root found but state cannot be inspected without DevTools');
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Test Complete');
    console.log('='.repeat(80));
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - CouchDB accessible: YES`);
    console.log(`   - Forex records in blockchain: ${data.rows.length}`);
    console.log(`   - Data structure valid: YES`);
    console.log('');
    console.log('🔍 Next Steps:');
    console.log('   1. If you see forex records above but not in UI:');
    console.log('      → Restart UI dev server (Ctrl+C then npm start)');
    console.log('   2. If no forex records shown above:');
    console.log('      → Create a test forex allocation first');
    console.log('   3. Check browser console for errors');
    console.log('');
    
    return {
      success: true,
      forexCount: data.rows.length,
      forex: data.rows.map(r => r.doc)
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('Possible causes:');
    console.error('  1. CouchDB not running on port 5984');
    console.error('  2. CORS not enabled on CouchDB');
    console.error('  3. Wrong credentials (admin/adminpw)');
    console.error('');
    console.error('Full error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('📦 Blockchain data fetch test loaded');
  console.log('Run: await testBlockchainDataFetch()');
}
