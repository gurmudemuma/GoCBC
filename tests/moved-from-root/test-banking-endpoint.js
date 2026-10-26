const axios = require('axios');

async function testBankingEndpoint() {
  console.log('🧪 Testing /api/v1/banking/lc endpoint...\n');
  
  try {
    // First, let's get a token by logging in as a bank user
    console.log('1️⃣ Getting auth token...');
    
    // Try to fetch without auth first to see the data structure
    const response = await axios.get('http://localhost:3001/api/v1/banking/lc', {
      validateStatus: () => true // Accept any status
    });
    
    if (response.status === 401) {
      console.log('❌ Authentication required. Need to login first.\n');
      console.log('Please provide bank user credentials or run this with a valid token.\n');
      return;
    }
    
    console.log(`✅ Response status: ${response.status}\n`);
    
    if (response.data && response.data.data) {
      const lcs = response.data.data;
      console.log(`📊 Total LCs returned: ${lcs.length}\n`);
      
      // Find LCs with documents
      const lcsWithDocs = lcs.filter(lc => lc.documents && lc.documents.length > 0);
      console.log(`📄 LCs with documents: ${lcsWithDocs.length}\n`);
      
      if (lcsWithDocs.length > 0) {
        console.log('🔍 LCs with documents:\n');
        lcsWithDocs.forEach(lc => {
          console.log(`  LC ID: ${lc.lcId || lc.id}`);
          console.log(`  Contract ID: ${lc.contractId}`);
          console.log(`  Status: ${lc.status}`);
          console.log(`  Documents: ${lc.documents.length}`);
          lc.documents.forEach((doc, idx) => {
            console.log(`    ${idx + 1}. ${doc.documentType} - ${doc.fileName}`);
          });
          console.log('');
        });
      } else {
        console.log('⚠️  No LCs with documents found.\n');
        
        // Show sample LC structure
        if (lcs.length > 0) {
          console.log('📋 Sample LC structure:');
          console.log(JSON.stringify(lcs[0], null, 2).substring(0, 500) + '...\n');
        }
      }
      
      // Check for specific LC mentioned in summary
      const targetLC = lcs.find(lc => (lc.lcId || lc.id) === 'LC1788419907720');
      if (targetLC) {
        console.log('🎯 Found target LC1788419907720:');
        console.log(JSON.stringify(targetLC, null, 2));
      } else {
        console.log('⚠️  Target LC1788419907720 not found in response.');
      }
      
    } else {
      console.log('❌ Unexpected response structure:');
      console.log(JSON.stringify(response.data, null, 2).substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }
}

testBankingEndpoint();
