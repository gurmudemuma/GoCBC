// Fix document entity_ids - change numeric IDs to application_id strings
const { DatabaseService } = require('./dist/services/databaseService');

async function fixDocumentEntityIds() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== FIXING DOCUMENT ENTITY IDS ===\n');
  
  try {
    // Get all documents with numeric entity_ids
    const docsWithNumericIds = await db.all(
      `SELECT d.*, ea.application_id 
       FROM documents d
       JOIN exporter_applications ea ON d.entity_id = ea.id::text
       WHERE d.entity_type = 'EXPORTER_APPLICATION'
       AND d.entity_id NOT LIKE 'APP-%'`
    );
    
    console.log(`Found ${docsWithNumericIds.length} documents with numeric entity_ids\n`);
    
    if (docsWithNumericIds.length === 0) {
      console.log('✅ No documents need fixing');
      return;
    }
    
    let fixed = 0;
    
    for (const doc of docsWithNumericIds) {
      console.log(`Fixing: ${doc.file_name}`);
      console.log(`  Old entity_id: ${doc.entity_id}`);
      console.log(`  New entity_id: ${doc.application_id}`);
      
      await db.run(
        `UPDATE documents 
         SET entity_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE document_id = $2`,
        [doc.application_id, doc.document_id]
      );
      
      fixed++;
      console.log(`  ✅ Fixed\n`);
    }
    
    console.log(`\n✅ Fixed ${fixed} documents`);
    
    // Verify the fix
    console.log('\n=== VERIFICATION ===\n');
    const bunaKoo = await db.get(
      `SELECT application_id FROM exporter_applications WHERE company_name = 'Buna koo' ORDER BY submitted_at DESC LIMIT 1`
    );
    
    if (bunaKoo) {
      const docs = await db.all(
        `SELECT document_id, file_name, entity_id 
         FROM documents 
         WHERE entity_id = $1`,
        [bunaKoo.application_id]
      );
      
      console.log(`Buna koo application (${bunaKoo.application_id}) now has ${docs.length} documents:`);
      docs.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ${doc.file_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixDocumentEntityIds().then(() => process.exit(0));
