const { DatabaseService } = require('./dist/services/databaseService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function uploadTestDocuments() {
  const db = DatabaseService.getInstance();
  const uploadsDir = path.join(__dirname, 'uploads', 'documents');
  
  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  console.log('\n=== Creating test documents for APP-07193259 ===\n');
  
  const testDocs = [
    { name: 'Business_License.pdf', type: 'BUSINESS_LICENSE', content: 'Test Business License PDF' },
    { name: 'TIN_Certificate.pdf', type: 'TIN_CERTIFICATE', content: 'Test TIN Certificate PDF' },
    { name: 'Taster_Certificate.pdf', type: 'TASTER_CERTIFICATE', content: 'Test Professional Taster Certificate' },
    { name: 'Lab_Certificate.pdf', type: 'LABORATORY_CERTIFICATE', content: 'Test Laboratory Certificate' },
  ];
  
  for (const doc of testDocs) {
    // Create test file
    const fileName = `${Date.now()}-${doc.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, doc.content);
    
    // Calculate hash
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Create document record
    const documentId = `DOC-${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    await db.run(
      `INSERT INTO documents (
        document_id, entity_type, entity_id, document_type, file_name,
        file_hash, mime_type, file_size, file_path, uploaded_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        documentId,
        'EXPORTER_APPLICATION',
        'APP-07193259',
        doc.type,
        doc.name,
        fileHash,
        'application/pdf',
        fileBuffer.length,
        filePath,
        'system',
        'active'
      ]
    );
    
    console.log(`✓ Created ${doc.name} (${fileBuffer.length} bytes)`);
    console.log(`  Document ID: ${documentId}`);
    console.log(`  File path: ${filePath}\n`);
  }
  
  // Verify
  const docs = await db.all(
    `SELECT document_id, file_name, document_type, file_size 
     FROM documents 
     WHERE entity_id = 'APP-07193259' AND file_path IS NOT NULL
     ORDER BY uploaded_at DESC`
  );
  
  console.log(`\n=== Verification ===`);
  console.log(`APP-07193259 now has ${docs.length} real documents:`);
  docs.forEach(doc => {
    console.log(`  ✓ ${doc.file_name} (${doc.document_type}) - ${doc.file_size} bytes`);
  });
  
  process.exit(0);
}

uploadTestDocuments().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
