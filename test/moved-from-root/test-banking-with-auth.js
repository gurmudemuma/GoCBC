const axios = require('axios');
const { Pool } = require('pg');

// PostgreSQL connection (using same credentials as API)
const pool = new Pool({
  user: 'cecbs',
  host: 'localhost',
  database: 'cecbs',
  password: 'cecbs123',
  port: 5432,
});

async function testWithAuth() {
  console.log('🧪 Testing Banking LC endpoint with authentication...\n');
  
  try {
    // Step 1: Find a bank user
    console.log('1️⃣ Finding a bank user...');
    const userResult = await pool.query(`
      SELECT username, role, organization, bank_name 
      FROM users 
      WHERE role = 'BANKS' 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No bank users found in database.');
      return;
    }
    
    const bankUser = userResult.rows[0];
    console.log(`✅ Found bank user: ${bankUser.username} (${bankUser.bank_name || bankUser.organization})\n`);
    
    // Step 2: Login
    console.log('2️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: bankUser.username,
      password: 'password123' // Default password
    }, {
      validateStatus: () => true
    });
    
    if (loginResponse.status !== 200 || !loginResponse.data.success || !loginResponse.data.data || !loginResponse.data.data.token) {
      console.log(`❌ Login failed (status ${loginResponse.status})`);
      console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log(`✅ Login successful\n`);
    
    // Step 3: Fetch LCs
    console.log('3️⃣ Fetching LCs from /api/v1/banking/lc...');
    const lcResponse = await axios.get('http://localhost:3001/api/v1/banking/lc', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`✅ Response status: ${lcResponse.status}\n`);
    
    if (lcResponse.data && lcResponse.data.data) {
      const lcs = lcResponse.data.data;
      console.log(`📊 Total LCs returned: ${lcs.length}\n`);
      
      // Find LCs with documents
      const lcsWithDocs = lcs.filter(lc => lc.documents && lc.documents.length > 0);
      console.log(`📄 LCs with documents: ${lcsWithDocs.length}\n`);
      
      if (lcsWithDocs.length > 0) {
        console.log('✅ SUCCESS! Document enrichment is working!\n');
        console.log('🔍 LCs with documents:\n');
        lcsWithDocs.forEach(lc => {
          console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`  LC ID: ${lc.lcId || lc.id}`);
          console.log(`  Contract ID: ${lc.contractId}`);
          console.log(`  Status: ${lc.status}`);
          console.log(`  Exporter: ${lc.exporterName || 'N/A'}`);
          console.log(`  Importer: ${lc.importerName || 'N/A'}`);
          console.log(`  Amount: ${lc.amount || lc.lcAmount} ${lc.currency || ''}`);
          console.log(`  Documents: ${lc.documents.length}`);
          lc.documents.forEach((doc, idx) => {
            console.log(`    ${idx + 1}. [${doc.documentType}] ${doc.fileName || doc.documentName || 'Untitled'}`);
            console.log(`       - Document ID: ${doc.documentId}`);
            console.log(`       - Status: ${doc.status || 'N/A'}`);
          });
          console.log('');
        });
      } else {
        console.log('⚠️  No LCs with documents found.\n');
        console.log('This could mean:');
        console.log('  1. The document enrichment code is not running');
        console.log('  2. No LCs have associated documents in PostgreSQL');
        console.log('  3. The LC IDs or Contract IDs don\'t match between tables\n');
        
        // Show sample LC structure
        if (lcs.length > 0) {
          console.log('📋 Sample LC structure (first LC):');
          const sample = lcs[0];
          console.log(`  LC ID: ${sample.lcId || sample.id}`);
          console.log(`  Contract ID: ${sample.contractId}`);
          console.log(`  Status: ${sample.status}`);
          console.log(`  Documents field: ${sample.documents ? `array[${sample.documents.length}]` : 'undefined'}`);
          console.log('');
        }
      }
      
      // Check for specific LC mentioned in summary
      const targetLC = lcs.find(lc => (lc.lcId || lc.id) === 'LC1788419907720');
      if (targetLC) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 TARGET LC1788419907720 FOUND:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Status: ${targetLC.status}`);
        console.log(`  Contract ID: ${targetLC.contractId}`);
        console.log(`  Documents: ${targetLC.documents ? targetLC.documents.length : 0}`);
        if (targetLC.documents && targetLC.documents.length > 0) {
          console.log('  Document details:');
          targetLC.documents.forEach((doc, idx) => {
            console.log(`    ${idx + 1}. ${doc.documentType} - ${doc.fileName}`);
          });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        console.log('⚠️  Target LC1788419907720 not found in response.\n');
      }
      
      // Check PostgreSQL directly for comparison
      console.log('4️⃣ Checking PostgreSQL documents table directly...');
      const docsResult = await pool.query(`
        SELECT entity_type, entity_id, document_type, file_name, status
        FROM documents
        WHERE status = 'active'
        AND entity_id IN ('LC1788419907720', 'CONTRACT1786343272751')
        ORDER BY entity_id, document_type
      `);
      
      if (docsResult.rows.length > 0) {
        console.log(`✅ Found ${docsResult.rows.length} documents in PostgreSQL:\n`);
        docsResult.rows.forEach((doc, idx) => {
          console.log(`  ${idx + 1}. [${doc.entity_type}] ${doc.entity_id} - ${doc.document_type}`);
          console.log(`     File: ${doc.file_name}`);
        });
      } else {
        console.log('⚠️  No documents found for LC1788419907720 or CONTRACT1786343272751');
      }
      
    } else {
      console.log('❌ Unexpected response structure:');
      console.log(JSON.stringify(lcResponse.data, null, 2).substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
  } finally {
    await pool.end();
  }
}

testWithAuth();
