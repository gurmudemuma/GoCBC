const { Pool } = require('pg');

async function cleanup() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123',
  });
  
  console.log('\n=== Final cleanup for APP-07193259 ===\n');
  
  // Delete invalid documents
  const deleteResult = await pool.query(
    `DELETE FROM documents 
     WHERE entity_id = $1 AND (file_path IS NULL OR file_size = 0 OR file_size IS NULL)`,
    ['APP-07193259']
  );
  
  console.log(`✓ Deleted ${deleteResult.rowCount} invalid documents\n`);
  
  // Show final documents
  const result = await pool.query(
    `SELECT document_id, file_name, document_type, file_size, file_path 
     FROM documents 
     WHERE entity_id = $1
     ORDER BY uploaded_at DESC`,
    ['APP-07193259']
  );
  
  console.log(`APP-07193259 final documents: ${result.rows.length}\n`);
  result.rows.forEach(doc => {
    console.log(`  ✓ ${doc.file_name}`);
    console.log(`    Type: ${doc.document_type}`);
    console.log(`    Size: ${doc.file_size} bytes`);
    console.log(`    ID: ${doc.document_id}\n`);
  });
  
  await pool.end();
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
