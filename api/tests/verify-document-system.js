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
    console.log('\n🔍 DOCUMENT SYSTEM VERIFICATION\n');
    console.log('=' .repeat(60));
    
    // 1. Check upload directory exists and is writable
    console.log('\n1️⃣  Upload Directory Check:');
    console.log(`   Location: ${uploadsDir}`);
    console.log(`   Exists: ${fs.existsSync(uploadsDir) ? '✅' : '❌'}`);
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`   Files: ${files.length} documents`);
      
      // Check write permissions by creating a test file
      try {
        const testFile = path.join(uploadsDir, 'test-write.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`   Writable: ✅`);
      } catch (err) {
        console.log(`   Writable: ❌ (${err.message})`);
      }
    }
    
    // 2. Check database schema
    console.log('\n2️⃣  Database Schema Check:');
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
        AND column_name IN ('document_id', 'file_path', 'file_name', 'mime_type', 'file_size', 'uploaded_by', 'shipment_id')
      ORDER BY ordinal_position
    `);
    console.log(`   Required columns: ${schema.rows.length}/7`);
    schema.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });
    
    // 3. Check document records
    console.log('\n3️⃣  Document Records Check:');
    const docs = await pool.query(`
      SELECT 
        document_id, 
        file_name, 
        file_path, 
        mime_type, 
        file_size,
        shipment_id
      FROM documents 
      WHERE shipment_id = 'SHIP1787204371672'
      ORDER BY uploaded_at DESC
    `);
    
    console.log(`   Total documents: ${docs.rows.length}`);
    
    // 4. Verify file integrity
    console.log('\n4️⃣  File Integrity Check:');
    let validFiles = 0;
    let missingFiles = 0;
    
    for (const doc of docs.rows) {
      const fileExists = fs.existsSync(doc.file_path);
      const fileSize = fileExists ? fs.statSync(doc.file_path).size : 0;
      const sizeMatch = fileExists && fileSize === parseInt(doc.file_size || 0);
      
      if (fileExists && sizeMatch) {
        validFiles++;
        console.log(`   ✅ ${doc.file_name} (${(fileSize / 1024).toFixed(2)} KB)`);
      } else if (!fileExists) {
        missingFiles++;
        console.log(`   ❌ ${doc.file_name} - File not found: ${doc.file_path}`);
      } else {
        console.log(`   ⚠️  ${doc.file_name} - Size mismatch (DB: ${doc.file_size}, Disk: ${fileSize})`);
      }
    }
    
    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:\n');
    console.log(`   Upload Directory: ${fs.existsSync(uploadsDir) ? '✅ Ready' : '❌ Missing'}`);
    console.log(`   Database Schema: ${schema.rows.length === 7 ? '✅ Complete' : '⚠️  Incomplete'}`);
    console.log(`   Document Records: ${docs.rows.length} total`);
    console.log(`   Valid Files: ${validFiles}/${docs.rows.length}`);
    console.log(`   Missing Files: ${missingFiles}/${docs.rows.length}`);
    
    if (validFiles === docs.rows.length && docs.rows.length > 0) {
      console.log('\n✅ Document system is fully operational!\n');
    } else if (missingFiles > 0) {
      console.log('\n⚠️  Some files are missing - regenerate or re-upload needed\n');
    } else {
      console.log('\n✅ System ready for document uploads\n');
    }
    
    // 6. API Endpoints Status
    console.log('📡 API ENDPOINTS:');
    console.log('   POST   /api/v1/documents/upload           - Upload document (auth required)');
    console.log('   POST   /api/v1/documents/upload-registration - Upload without auth');
    console.log('   GET    /api/v1/documents/:id              - Get metadata');
    console.log('   GET    /api/v1/documents/:id/view         - View document (auth required)');
    console.log('   GET    /api/v1/documents/:id/download     - Download document (auth required)');
    console.log('   GET    /api/v1/documents/entity/:type/:id - List documents by entity\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
})();
