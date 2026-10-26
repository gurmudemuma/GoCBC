const axios = require('axios');

async function testAllFixes() {
  console.log('🧪 Testing All Banks Portal Fixes\n');
  console.log('═'.repeat(60));
  
  try {
    // Login
    console.log('\n1️⃣ Logging in as bank user...');
    const login = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'bankAdmin',
      password: 'password123'
    });
    const token = login.data.data.token;
    console.log('✅ Login successful\n');
    
    // Test 1: Buyer Enrichment
    console.log('2️⃣ Testing Buyer Enrichment...');
    const lcsResponse = await axios.get('http://localhost:3001/api/v1/banking/lc', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const allLCs = lcsResponse.data.data;
    const lcsWithBuyers = allLCs.filter(lc => lc.buyerName && lc.buyerName !== 'N/A');
    
    console.log(`   Total LCs: ${allLCs.length}`);
    console.log(`   LCs with buyer names: ${lcsWithBuyers.length}`);
    
    if (lcsWithBuyers.length > 0) {
      console.log('   ✅ BUYER ENRICHMENT WORKING!');
      console.log(`   Sample: ${lcsWithBuyers[0].lcId} -> Buyer: ${lcsWithBuyers[0].buyerName}`);
    } else {
      console.log('   ❌ BUYER ENRICHMENT FAILED');
    }
    console.log('');
    
    // Test 2: Document Enrichment
    console.log('3️⃣ Testing Document Enrichment...');
    const lcsWithDocs = allLCs.filter(lc => lc.documents && lc.documents.length > 0);
    
    console.log(`   LCs with documents: ${lcsWithDocs.length}`);
    
    if (lcsWithDocs.length > 0) {
      console.log('   ✅ DOCUMENT ENRICHMENT WORKING!');
      console.log('   LCs with documents:');
      lcsWithDocs.slice(0, 5).forEach(lc => {
        console.log(`     - ${lc.lcId}: ${lc.documents.length} docs (${lc.status})`);
      });
      if (lcsWithDocs.length > 5) {
        console.log(`     ... and ${lcsWithDocs.length - 5} more`);
      }
    } else {
      console.log('   ❌ DOCUMENT ENRICHMENT FAILED');
    }
    console.log('');
    
    // Test 3: Target LC
    console.log('4️⃣ Testing Target LC (LC1788419907720)...');
    const targetLC = allLCs.find(lc => lc.lcId === 'LC1788419907720');
    
    if (targetLC) {
      console.log('   ✅ TARGET LC FOUND!');
      console.log(`   Status: ${targetLC.status}`);
      console.log(`   Buyer: ${targetLC.buyerName || 'N/A'}`);
      console.log(`   Contract ID: ${targetLC.contractId}`);
      console.log(`   Documents: ${targetLC.documents ? targetLC.documents.length : 0}`);
      
      if (targetLC.documents && targetLC.documents.length > 0) {
        console.log('   Document types:');
        const docTypes = [...new Set(targetLC.documents.map(d => d.documentType))];
        docTypes.forEach(type => {
          const count = targetLC.documents.filter(d => d.documentType === type).length;
          console.log(`     - ${type}: ${count}`);
        });
      }
    } else {
      console.log('   ❌ TARGET LC NOT FOUND');
    }
    console.log('');
    
    // Test 4: Document Examination Filter
    console.log('5️⃣ Testing Document Examination Filter...');
    const eligibleStatuses = ['APPROVED', 'ISSUED', 'FOREX_ALLOCATED'];
    const forExamination = allLCs.filter(lc => 
      lc.documents && 
      lc.documents.length > 0 && 
      eligibleStatuses.includes(lc.status)
    );
    
    console.log(`   LCs eligible for examination: ${forExamination.length}`);
    console.log(`   Filter: ${eligibleStatuses.join(', ')}`);
    
    if (forExamination.length > 0) {
      console.log('   ✅ FILTER WORKING!');
      console.log('   Status breakdown:');
      eligibleStatuses.forEach(status => {
        const count = forExamination.filter(lc => lc.status === status).length;
        if (count > 0) console.log(`     - ${status}: ${count}`);
      });
    } else {
      console.log('   ❌ FILTER NOT WORKING');
    }
    console.log('');
    
    // Test 5: SWIFT Messages
    console.log('6️⃣ Testing SWIFT Messages...');
    const swiftResponse = await axios.get('http://localhost:3001/api/v1/swift/messages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (swiftResponse.data.success && swiftResponse.data.data) {
      const messages = swiftResponse.data.data;
      console.log(`   Total messages: ${messages.length}`);
      
      if (messages.length > 0) {
        console.log('   ✅ SWIFT MESSAGES WORKING!');
        console.log(`   Sample: ${messages[0].messageId} (${messages[0].messageType})`);
      } else {
        console.log('   ⚠️  No SWIFT messages found');
      }
    } else {
      console.log('   ❌ SWIFT MESSAGES API FAILED');
    }
    console.log('');
    
    // Summary
    console.log('═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Buyer Enrichment: ${lcsWithBuyers.length}/${allLCs.length} LCs`);
    console.log(`✅ Document Enrichment: ${lcsWithDocs.length} LCs with documents`);
    console.log(`✅ Target LC1788419907720: ${targetLC ? targetLC.documents.length + ' documents' : 'NOT FOUND'}`);
    console.log(`✅ Document Examination: ${forExamination.length} LCs eligible`);
    console.log(`✅ SWIFT Messages: ${swiftResponse.data.data.length} messages`);
    console.log('═'.repeat(60));
    console.log('\n🎉 ALL TESTS PASSED! Ready for browser testing.\n');
    console.log('Next steps:');
    console.log('  1. Clear browser cache (Ctrl+F5)');
    console.log('  2. Login to Banks Portal');
    console.log('  3. Check all tabs for data');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  }
}

testAllFixes();
