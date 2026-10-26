const { DatabaseService } = require('./dist/services/databaseService');
const fs = require('fs');
const path = require('path');

async function checkFiles() {
  const db = DatabaseService.getInstance();
  
  console.log('\n=== Checking uploaded files ===\n');
  
  // Get all documents
  const docs = await db.all(
    `SELECT document_id, entity_id, file_name, file_path, file_size, document_type 
     FROM documents 
     ORDER BY uploaded_at DESC 
     LIMIT 50`
  );
  
  console.log(`Total documents in database: ${docs.length}\n`);
  
  const realFiles = [];
  const placeholders = [];
  
  for (const doc of docs) {
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      realFiles.push(doc);
      console.log(`✓ REAL FILE: ${doc.file_name}`);
      console.log(`  ID: ${doc.document_id}`);
      console.log(`  Entity: ${doc.entity_id}`);
      console.log(`  Path: ${doc.file_path}`);
      console.log(`  Size: ${doc.file_size} bytes\n`);
    } else {
      placeholders.push(doc);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Real uploaded files: ${realFiles.length}`);
  console.log(`Placeholder/missing files: ${placeholders.length}`);
  
  if (realFiles.length > 0) {
    console.log(`\n=== Real files by application ===`);
    const byApp = {};
    realFiles.forEach(doc => {
      if (!byApp[doc.entity_id]) byApp[doc.entity_id] = [];
      byApp[doc.entity_id].push(doc);
    });
    
    Object.keys(byApp).forEach(appId => {
      console.log(`\n${appId}: ${byApp[appId].length} files`);
      byApp[appId].forEach(doc => {
        console.log(`  - ${doc.file_name} (${doc.file_size} bytes)`);
      });
    });
  }
  
  // Check uploads directory
  const uploadsDir = path.join(__dirname, 'uploads', 'documents');
  console.log(`\n=== Checking uploads directory ===`);
  console.log(`Path: ${uploadsDir}`);
  
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log(`Files in directory: ${files.length}`);
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${stats.size} bytes)`);
    });
  } else {
    console.log('Directory does not exist');
  }
  
  process.exit(0);
}

checkFiles().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
