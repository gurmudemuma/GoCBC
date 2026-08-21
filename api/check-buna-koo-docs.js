// Check documents for Buna koo application specifically
const { DatabaseService } = require('./dist/services/databaseService');

async function checkBunaKooDocs() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== CHECKING BUNA KOO APPLICATION ===\n');
  
  try {
    // Get Buna koo application
    const app = await db.get(
      `SELECT * FROM exporter_applications WHERE company_name = 'Buna koo' ORDER BY submitted_at DESC LIMIT 1`
    );
    
    if (!app) {
      console.log('❌ Buna koo application not found');
      return;
    }
    
    console.log(`Application ID: ${app.application_id}`);
    console.log(`Database ID: ${app.id}`);
    console.log(`Company: ${app.company_name}`);
    console.log(`Status: ${app.status}`);
    console.log(`Submitted: ${app.submitted_at}\n`);
    
    // Check documents using application_id
    console.log(`\n=== Searching for documents with entity_id = '${app.application_id}' ===`);
    const docsByAppId = await db.all(
      `SELECT document_id, document_type, file_name, entity_type, entity_id, uploaded_by, uploaded_at, file_path
       FROM documents 
       WHERE entity_id = $1`,
      [app.application_id]
    );
    
    console.log(`Found ${docsByAppId.length} documents with entity_id = '${app.application_id}'`);
    docsByAppId.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.file_name}`);
      console.log(`     Type: ${doc.document_type}`);
      console.log(`     Entity: ${doc.entity_type}/${doc.entity_id}`);
      console.log(`     Path: ${doc.file_path}`);
    });
    
    // Check documents using numeric id
    console.log(`\n=== Searching for documents with entity_id = '${app.id}' ===`);
    const docsByNumId = await db.all(
      `SELECT document_id, document_type, file_name, entity_type, entity_id, uploaded_by, uploaded_at, file_path
       FROM documents 
       WHERE entity_id = $1`,
      [app.id.toString()]
    );
    
    console.log(`Found ${docsByNumId.length} documents with entity_id = '${app.id}'`);
    docsByNumId.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.file_name}`);
      console.log(`     Type: ${doc.document_type}`);
      console.log(`     Entity: ${doc.entity_type}/${doc.entity_id}`);
      console.log(`     Path: ${doc.file_path}`);
    });
    
    // Check all documents uploaded around the same time
    console.log(`\n=== Documents uploaded within 5 minutes of application submission ===`);
    const appTime = new Date(app.submitted_at);
    const fiveMinAfter = new Date(appTime.getTime() + 5 * 60 * 1000);
    
    const recentDocs = await db.all(
      `SELECT document_id, document_type, file_name, entity_type, entity_id, uploaded_by, uploaded_at, file_path
       FROM documents 
       WHERE entity_type = 'EXPORTER_APPLICATION'
       AND uploaded_at >= $1 
       AND uploaded_at <= $2
       ORDER BY uploaded_at ASC`,
      [app.submitted_at, fiveMinAfter.toISOString()]
    );
    
    console.log(`Found ${recentDocs.length} documents uploaded within 5 minutes`);
    recentDocs.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.file_name}`);
      console.log(`     Entity ID: ${doc.entity_id}`);
      console.log(`     Type: ${doc.document_type}`);
      console.log(`     Time: ${doc.uploaded_at}`);
      console.log(`     Path: ${doc.file_path ? 'EXISTS' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBunaKooDocs().then(() => process.exit(0));
