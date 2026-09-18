// Test script to verify "Examine Documents" button functionality
const fetch = require('node-fetch');

async function testExamineButton() {
  console.log('=== Testing Examine Documents Button Functionality ===\n');
  
  try {
    // Step 1: Login
    console.log('Step 1: Logging in as bank user...');
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'bankuser', 
        password: 'bank123' 
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success || !loginData.data?.token) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Login successful\n');
    
    // Step 2: Fetch LC with documents (what button does)
    console.log('Step 2: Fetching LC with documents...');
    const lcResponse = await fetch('http://localhost:3001/api/v1/banking/lc/LC1789380581', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!lcResponse.ok) {
      console.error(`❌ LC fetch failed: ${lcResponse.status} ${lcResponse.statusText}`);
      const errorText = await lcResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const lcData = await lcResponse.json();
    
    if (!lcData.success) {
      console.error('❌ LC fetch returned error:', lcData);
      return;
    }
    
    console.log('✅ LC fetched successfully');
    console.log(`   LC ID: ${lcData.data.lcId}`);
    console.log(`   Status: ${lcData.data.status}`);
    console.log(`   Amount: $${lcData.data.amount} ${lcData.data.currency}`);
    
    // Step 3: Check documents
    console.log('\nStep 3: Checking documents...');
    
    if (!lcData.data.documents) {
      console.error('❌ No documents array in response');
      return;
    }
    
    const docs = lcData.data.documents;
    console.log(`✅ Documents array found: ${docs.length} documents`);
    
    if (docs.length === 0) {
      console.warn('⚠️  Warning: Documents array is empty');
      console.log('   This means no documents are linked to this LC');
      return;
    }
    
    // Group by entity type
    const grouped = {
      LC: docs.filter(d => d.entityType === 'LC'),
      CONTRACT: docs.filter(d => d.entityType === 'CONTRACT'),
      SHIPMENT: docs.filter(d => d.entityType === 'SHIPMENT'),
      CUSTOMS_DECLARATION: docs.filter(d => d.entityType === 'CUSTOMS_DECLARATION')
    };
    
    console.log('\n📋 Documents by Entity Type:');
    console.log(`   LC Documents: ${grouped.LC.length}`);
    console.log(`   Contract Documents: ${grouped.CONTRACT.length}`);
    console.log(`   Shipment Documents: ${grouped.SHIPMENT.length}`);
    console.log(`   Customs Documents: ${grouped.CUSTOMS_DECLARATION.length}`);
    
    console.log('\n📄 Document Details:');
    docs.forEach((doc, i) => {
      console.log(`   ${i+1}. ${doc.entityType} - ${doc.documentType}`);
      console.log(`      File: ${doc.fileName}`);
      console.log(`      ID: ${doc.documentId}`);
      console.log(`      Status: ${doc.verificationStatus || doc.status}`);
    });
    
    console.log('\n✅ SUCCESS: Examine Documents button would work correctly');
    console.log('   Frontend would receive all documents grouped by type');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run test
testExamineButton();
