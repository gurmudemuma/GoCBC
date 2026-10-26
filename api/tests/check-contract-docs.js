// Check documents for contract CONTRACT1787051634593
const { DatabaseService } = require('./dist/services/databaseService');

async function checkContractDocs() {
  const db = DatabaseService.getInstance();
  
  const contractID = 'CONTRACT1787051634593';
  
  console.log(`\n=== CHECKING DOCUMENTS FOR ${contractID} ===\n`);
  
  try {
    // Get documents
    const documents = await db.all(
      `SELECT document_id, document_type, file_name, verification_status, status, entity_type, entity_id
       FROM documents 
       WHERE entity_id = $1`,
      [contractID]
    );
    
    console.log(`Found ${documents.length} documents:\n`);
    
    documents.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.file_name}`);
      console.log(`   Type: ${doc.document_type}`);
      console.log(`   Entity: ${doc.entity_type}/${doc.entity_id}`);
      console.log(`   Verification: ${doc.verification_status || 'NOT_VERIFIED'}`);
      console.log(`   Status: ${doc.status}\n`);
    });
    
    // Check for CONTRACT_SIGNED
    const contractSigned = documents.find(d => d.document_type === 'CONTRACT_SIGNED');
    
    if (!contractSigned) {
      console.log('❌ MISSING: CONTRACT_SIGNED document is required for approval');
    } else if (contractSigned.verification_status !== 'verified') {
      console.log(`❌ NOT VERIFIED: CONTRACT_SIGNED exists but verification_status is "${contractSigned.verification_status || 'NULL'}"`);
      console.log('   It must be "verified" before approval');
    } else {
      console.log('✅ CONTRACT_SIGNED is present and verified');
    }
    
    // Check what the document validation function expects
    console.log('\n=== REQUIRED DOCUMENT TYPES FOR CONTRACT APPROVAL ===\n');
    console.log('The system requires: CONTRACT_SIGNED');
    console.log('\nDocument types found:', documents.map(d => d.document_type).join(', '));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkContractDocs().then(() => process.exit(0));
