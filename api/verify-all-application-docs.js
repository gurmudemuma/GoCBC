// Verify all applications now have correct document counts
const { DatabaseService } = require('./dist/services/databaseService');

async function verifyAllDocs() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== APPLICATION DOCUMENT COUNTS ===\n');
  
  try {
    const applications = await db.all(
      `SELECT 
        ea.application_id, 
        ea.company_name, 
        ea.status,
        ea.submitted_at,
        COUNT(d.document_id) as doc_count
       FROM exporter_applications ea
       LEFT JOIN documents d ON d.entity_id = ea.application_id AND d.entity_type = 'EXPORTER_APPLICATION'
       GROUP BY ea.application_id, ea.company_name, ea.status, ea.submitted_at
       ORDER BY ea.submitted_at DESC
       LIMIT 10`
    );
    
    console.log(`Recent Applications:\n`);
    applications.forEach((app, idx) => {
      const status = app.doc_count > 0 ? '✅' : '❌';
      console.log(`${idx + 1}. ${app.company_name}`);
      console.log(`   ID: ${app.application_id}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Documents: ${app.doc_count} ${status}`);
      console.log(`   Submitted: ${new Date(app.submitted_at).toLocaleDateString()}\n`);
    });
    
    // Check for any remaining orphaned documents
    const orphaned = await db.all(
      `SELECT d.document_id, d.entity_id, d.file_name 
       FROM documents d
       WHERE d.entity_type = 'EXPORTER_APPLICATION'
       AND NOT EXISTS (
         SELECT 1 FROM exporter_applications ea 
         WHERE ea.application_id = d.entity_id
       )`
    );
    
    if (orphaned.length > 0) {
      console.log(`\n⚠️  Found ${orphaned.length} orphaned documents:\n`);
      orphaned.forEach((doc, idx) => {
        console.log(`${idx + 1}. ${doc.file_name} - Entity ID: ${doc.entity_id}`);
      });
    } else {
      console.log('\n✅ No orphaned documents');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyAllDocs().then(() => process.exit(0));
