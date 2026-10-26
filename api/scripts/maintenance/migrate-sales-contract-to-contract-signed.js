// Migration: Convert all SALES_CONTRACT documents to CONTRACT_SIGNED for CONTRACT entities
const { DatabaseService } = require('./dist/services/databaseService');

async function migrateDocumentTypes() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== MIGRATING SALES_CONTRACT TO CONTRACT_SIGNED ===\n');
  
  try {
    // Find all SALES_CONTRACT documents for CONTRACT entities
    const docs = await db.all(
      `SELECT document_id, entity_id, file_name, document_type, entity_type
       FROM documents 
       WHERE entity_type = 'CONTRACT' AND document_type = 'SALES_CONTRACT'`
    );
    
    console.log(`Found ${docs.length} SALES_CONTRACT documents for contracts\n`);
    
    if (docs.length === 0) {
      console.log('✅ No documents need migration');
      return;
    }
    
    let migrated = 0;
    
    for (const doc of docs) {
      console.log(`Migrating: ${doc.file_name}`);
      console.log(`  Contract: ${doc.entity_id}`);
      console.log(`  Old type: ${doc.document_type}`);
      console.log(`  New type: CONTRACT_SIGNED`);
      
      await db.run(
        `UPDATE documents 
         SET document_type = 'CONTRACT_SIGNED',
             updated_at = CURRENT_TIMESTAMP
         WHERE document_id = $1`,
        [doc.document_id]
      );
      
      migrated++;
      console.log(`  ✅ Migrated\n`);
    }
    
    console.log(`\n✅ Successfully migrated ${migrated} documents`);
    
    // Verify migration
    const remaining = await db.all(
      `SELECT COUNT(*) as count 
       FROM documents 
       WHERE entity_type = 'CONTRACT' AND document_type = 'SALES_CONTRACT'`
    );
    
    console.log(`\nVerification: ${remaining[0].count} SALES_CONTRACT documents remaining for contracts`);
    
    if (remaining[0].count === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Some documents were not migrated');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

migrateDocumentTypes().then(() => process.exit(0));
