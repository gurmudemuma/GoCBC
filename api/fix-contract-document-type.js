// Fix document type for contract approval
const { DatabaseService } = require('./dist/services/databaseService');

async function fixContractDocType() {
  const db = DatabaseService.getInstance();
  
  const contractID = 'CONTRACT1787051634593';
  
  console.log(`\n=== FIXING DOCUMENT TYPE FOR ${contractID} ===\n`);
  
  try {
    // Get the first SALES_CONTRACT document
    const doc = await db.get(
      `SELECT document_id, file_name, document_type 
       FROM documents 
       WHERE entity_id = $1 AND document_type = 'SALES_CONTRACT'
       LIMIT 1`,
      [contractID]
    );
    
    if (!doc) {
      console.log('❌ No SALES_CONTRACT documents found');
      return;
    }
    
    console.log(`Found document: ${doc.file_name}`);
    console.log(`Current type: ${doc.document_type}`);
    console.log(`Changing to: CONTRACT_SIGNED\n`);
    
    // Update document type to CONTRACT_SIGNED
    await db.run(
      `UPDATE documents 
       SET document_type = 'CONTRACT_SIGNED', 
           verification_status = 'verified',
           updated_at = CURRENT_TIMESTAMP
       WHERE document_id = $1`,
      [doc.document_id]
    );
    
    console.log('✅ Document type updated successfully\n');
    
    // Verify the change
    const updated = await db.get(
      `SELECT document_id, file_name, document_type, verification_status 
       FROM documents 
       WHERE document_id = $1`,
      [doc.document_id]
    );
    
    console.log('Updated document:');
    console.log(`  File: ${updated.file_name}`);
    console.log(`  Type: ${updated.document_type}`);
    console.log(`  Verification: ${updated.verification_status}`);
    
    console.log('\n✅ Contract can now be approved!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixContractDocType().then(() => process.exit(0));
