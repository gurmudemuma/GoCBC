const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkDocs() {
  try {
    // Check all documents
    const allDocs = await pool.query('SELECT document_id, entity_type, entity_id, document_type, file_name, file_size FROM documents ORDER BY uploaded_at DESC LIMIT 20');
    console.log('\n=== ALL RECENT DOCUMENTS ===');
    console.log(JSON.stringify(allDocs.rows, null, 2));
    
    // Check contract documents specifically
    const contractDocs = await pool.query(`SELECT document_id, entity_type, entity_id, document_type, file_name, file_size FROM documents WHERE UPPER(entity_type) = 'CONTRACT' ORDER BY uploaded_at DESC`);
    console.log('\n=== CONTRACT DOCUMENTS ===');
    console.log(JSON.stringify(contractDocs.rows, null, 2));
    
    // Check what entity_types exist
    const entityTypes = await pool.query('SELECT DISTINCT entity_type FROM documents');
    console.log('\n=== DISTINCT ENTITY TYPES ===');
    console.log(JSON.stringify(entityTypes.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDocs();
