const { DatabaseService } = require('./dist/services/databaseService');

async function linkDocuments() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== Checking documents for APP-07193259 ===\n');
  
  // Find documents for this application
  const docs = await db.all(
    `SELECT document_id, entity_id, entity_type, file_name, document_type, uploaded_at 
     FROM documents 
     WHERE entity_id LIKE '%07193259%' OR entity_type = 'EXPORTER_APPLICATION'
     ORDER BY uploaded_at DESC 
     LIMIT 20`
  );
  
  console.log(`Found ${docs.length} documents:`);
  docs.forEach(doc => {
    console.log(`  - ${doc.document_id}: ${doc.file_name} (entity: ${doc.entity_id})`);
  });
  
  // Find documents that need to be linked to APP-07193259
  const unlinkedDocs = docs.filter(doc => 
    !doc.entity_id.startsWith('APP-') || 
    doc.entity_id === doc.document_id
  );
  
  if (unlinkedDocs.length > 0) {
    console.log(`\n=== Found ${unlinkedDocs.length} unlinked documents ===`);
    console.log('Updating to link with APP-07193259...\n');
    
    for (const doc of unlinkedDocs) {
      await db.run(
        `UPDATE documents 
         SET entity_id = $1, entity_type = $2 
         WHERE document_id = $3`,
        ['APP-07193259', 'EXPORTER_APPLICATION', doc.document_id]
      );
      console.log(`✓ Linked ${doc.file_name} to APP-07193259`);
    }
  }
  
  // Verify the update
  console.log('\n=== Verifying linked documents ===\n');
  const linkedDocs = await db.all(
    `SELECT document_id, entity_id, file_name, document_type, file_size 
     FROM documents 
     WHERE entity_id = 'APP-07193259'
     ORDER BY uploaded_at DESC`
  );
  
  console.log(`Application APP-07193259 now has ${linkedDocs.length} documents:`);
  linkedDocs.forEach(doc => {
    console.log(`  ✓ ${doc.file_name} (${doc.document_type}) - ${doc.file_size} bytes`);
  });
  
  process.exit(0);
}

linkDocuments().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
