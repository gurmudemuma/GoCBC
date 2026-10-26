// Check documents for exporter applications
const { DatabaseService } = require('./dist/services/databaseService');

async function checkApplicationDocuments() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== CHECKING APPLICATION DOCUMENTS ===\n');
  
  try {
    // Get all exporter applications
    const applications = await db.all(
      `SELECT application_id, company_name, status FROM exporter_applications ORDER BY submitted_at DESC LIMIT 5`
    );
    
    console.log(`Found ${applications.length} recent applications:\n`);
    
    for (const app of applications) {
      console.log(`\nApplication: ${app.application_id}`);
      console.log(`Company: ${app.company_name}`);
      console.log(`Status: ${app.status}`);
      
      // Check documents for this application
      const docs = await db.all(
        `SELECT document_id, document_type, file_name, entity_type, entity_id, uploaded_by, uploaded_at, file_path
         FROM documents 
         WHERE entity_type = 'EXPORTER_APPLICATION' AND entity_id = $1`,
        [app.application_id]
      );
      
      console.log(`Documents found: ${docs.length}`);
      
      if (docs.length > 0) {
        docs.forEach((doc, idx) => {
          console.log(`  ${idx + 1}. ${doc.file_name}`);
          console.log(`     - Type: ${doc.document_type}`);
          console.log(`     - Entity: ${doc.entity_type}/${doc.entity_id}`);
          console.log(`     - Uploaded by: ${doc.uploaded_by}`);
          console.log(`     - Path: ${doc.file_path}`);
          console.log(`     - Time: ${doc.uploaded_at}`);
        });
      } else {
        console.log(`  ❌ NO DOCUMENTS FOUND for this application!`);
      }
    }
    
    // Check all documents with EXPORTER_APPLICATION entity type
    console.log('\n\n=== ALL EXPORTER_APPLICATION DOCUMENTS ===\n');
    const allDocs = await db.all(
      `SELECT document_id, entity_id, document_type, file_name, uploaded_by, uploaded_at
       FROM documents 
       WHERE entity_type = 'EXPORTER_APPLICATION'
       ORDER BY uploaded_at DESC`
    );
    
    console.log(`Total EXPORTER_APPLICATION documents: ${allDocs.length}\n`);
    allDocs.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.file_name} (${doc.document_type})`);
      console.log(`   Application ID: ${doc.entity_id}`);
      console.log(`   Uploaded by: ${doc.uploaded_by} at ${doc.uploaded_at}`);
    });
    
    // Check for orphaned documents (documents with no matching application)
    console.log('\n\n=== CHECKING FOR ORPHANED DOCUMENTS ===\n');
    const orphanedDocs = await db.all(
      `SELECT d.document_id, d.entity_id, d.file_name 
       FROM documents d
       LEFT JOIN exporter_applications ea ON d.entity_id = ea.application_id
       WHERE d.entity_type = 'EXPORTER_APPLICATION' AND ea.application_id IS NULL`
    );
    
    if (orphanedDocs.length > 0) {
      console.log(`❌ Found ${orphanedDocs.length} orphaned documents (no matching application):`);
      orphanedDocs.forEach((doc, idx) => {
        console.log(`${idx + 1}. ${doc.file_name} - Application ID: ${doc.entity_id}`);
      });
    } else {
      console.log(`✅ No orphaned documents found`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkApplicationDocuments().then(() => process.exit(0));
