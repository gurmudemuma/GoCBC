const { DatabaseService } = require('./dist/services/databaseService');

async function cleanup() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== Cleaning up placeholder documents ===\n');
  
  // Delete placeholders for APP-07193259
  await db.run(
    `DELETE FROM documents 
     WHERE entity_id = $1 AND file_path IS NULL`,
    ['APP-07193259']
  );
  
  console.log('✓ Deleted placeholder documents\n');
  
  // Show remaining documents
  const docs = await db.all(
    `SELECT document_id, file_name, document_type, file_size 
     FROM documents 
     WHERE entity_id = $1
     ORDER BY uploaded_at DESC`,
    ['APP-07193259']
  );
  
  console.log(`APP-07193259 now has ${docs.length} documents:`);
  docs.forEach(doc => {
    console.log(`  ✓ ${doc.file_name} (${doc.document_type}) - ${doc.file_size} bytes`);
  });
  
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
