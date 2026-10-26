const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

const uploadsDir = path.join(__dirname, 'uploads', 'documents');

(async () => {
  try {
    console.log('\n🔍 Checking document file paths for SHIP1787204371672...\n');
    console.log('Uploads directory:', uploadsDir);
    console.log('Directory exists:', fs.existsSync(uploadsDir));
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`Found ${files.length} files in uploads directory`);
      if (files.length > 0) {
        console.log('Sample files:', files.slice(0, 5));
      }
    }
    
    // Get documents for the shipment
    const docs = await pool.query(`
      SELECT document_id, file_name, file_path, document_type
      FROM documents
      WHERE shipment_id = 'SHIP1787204371672'
      ORDER BY uploaded_at DESC
    `);
    
    console.log(`\n📄 Found ${docs.rows.length} documents:\n`);
    console.table(docs.rows);
    
    console.log('\n💡 Note: These blockchain documents don\'t have actual files in the uploads directory.');
    console.log('They are references to blockchain-stored documents.');
    console.log('The file_path points to the document ID which should be resolved by the blockchain service.\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
