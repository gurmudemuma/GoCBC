// Test document fetch endpoint for Buna koo application
const { DatabaseService } = require('./dist/services/databaseService');

async function testDocumentFetch() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== TESTING DOCUMENT FETCH ENDPOINT ===\n');
  
  try {
    // Get Buna koo application
    const app = await db.get(
      `SELECT application_id FROM exporter_applications WHERE company_name = 'Buna koo' ORDER BY submitted_at DESC LIMIT 1`
    );
    
    if (!app) {
      console.log('❌ Application not found');
      return;
    }
    
    console.log(`Application ID: ${app.application_id}\n`);
    
    // Simulate what the API endpoint returns
    const documents = await db.all(
      `SELECT 
        document_id, entity_type, entity_id, document_type, file_name,
        file_hash, mime_type, file_size, uploaded_by, status, uploaded_at
      FROM documents 
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY uploaded_at DESC`,
      ['EXPORTER_APPLICATION', app.application_id]
    );
    
    console.log(`Documents returned by endpoint: ${documents.length}\n`);
    
    if (documents.length === 0) {
      console.log('❌ NO DOCUMENTS FOUND - This is the problem!');
      console.log('\nChecking why...\n');
      
      // Check with LIKE pattern
      const docsLike = await db.all(
        `SELECT document_id, entity_id, file_name 
         FROM documents 
         WHERE entity_type = 'EXPORTER_APPLICATION' 
         AND entity_id LIKE '%${app.application_id.substring(4, 10)}%'`
      );
      
      console.log(`Documents with partial match: ${docsLike.length}`);
      docsLike.forEach(doc => {
        console.log(`  - ${doc.file_name} (entity_id: ${doc.entity_id})`);
      });
    } else {
      console.log('✅ Documents found!\n');
      documents.forEach((doc, idx) => {
        console.log(`${idx + 1}. ${doc.file_name}`);
        console.log(`   Document ID: ${doc.document_id}`);
        console.log(`   Type: ${doc.document_type}`);
        console.log(`   Entity: ${doc.entity_type}/${doc.entity_id}`);
        console.log(`   Size: ${doc.file_size} bytes`);
        console.log(`   Mime: ${doc.mime_type}`);
        console.log(`   Uploaded: ${doc.uploaded_at}`);
        console.log(`   Status: ${doc.status}\n`);
      });
      
      // Show what the frontend would receive
      console.log('\n=== FRONTEND WOULD RECEIVE ===\n');
      console.log(JSON.stringify({
        success: true,
        data: documents.map(doc => ({
          document_id: doc.document_id,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          file_size: doc.file_size,
          document_type: doc.document_type,
          uploaded_at: doc.uploaded_at,
          status: doc.status
        })),
        timestamp: new Date().toISOString()
      }, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDocumentFetch().then(() => process.exit(0));
