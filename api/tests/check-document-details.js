const { Pool } = require('pg');
const fs = require('fs');

async function checkDetails() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123',
  });
  
  console.log('\n=== Document Details for APP-07193259 ===\n');
  
  const result = await pool.query(
    `SELECT document_id, file_name, file_size, file_path, mime_type, document_type 
     FROM documents 
     WHERE entity_id = $1
     ORDER BY uploaded_at DESC`,
    ['APP-07193259']
  );
  
  console.log(`Found ${result.rows.length} documents:\n`);
  
  result.rows.forEach(doc => {
    console.log(`Document: ${doc.file_name}`);
    console.log(`  ID: ${doc.document_id}`);
    console.log(`  Type: ${doc.document_type}`);
    console.log(`  MIME: ${doc.mime_type}`);
    console.log(`  Size in DB: ${doc.file_size} bytes`);
    console.log(`  Path: ${doc.file_path}`);
    
    // Check if file exists
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      const stats = fs.statSync(doc.file_path);
      console.log(`  ✓ File exists on disk: ${stats.size} bytes`);
      
      // Read first 50 chars
      const content = fs.readFileSync(doc.file_path, 'utf8');
      console.log(`  Content preview: "${content.substring(0, 50)}"`);
    } else {
      console.log(`  ✗ File NOT found on disk`);
    }
    console.log();
  });
  
  await pool.end();
  process.exit(0);
}

checkDetails().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
