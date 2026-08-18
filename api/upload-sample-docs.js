// Upload sample documents for testing
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pool = new Pool({ 
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs' 
});

const uploadDir = path.join(__dirname, 'uploads', 'documents');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create a simple PDF document for testing
function createSamplePDF(filename) {
  const content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Sample Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function uploadSampleDocuments() {
  try {
    console.log('🔄 Creating sample documents...\n');

    const documents = [
      { name: 'Business_License.pdf', type: 'BUSINESS_LICENSE', entity: 'CONTRACT', entityId: 'CONTRACT1786343272751' },
      { name: 'Trade_License.pdf', type: 'TRADE_LICENSE', entity: 'CONTRACT', entityId: 'CONTRACT1786343272751' },
      { name: 'TIN_Certificate.pdf', type: 'TIN_CERTIFICATE', entity: 'CONTRACT', entityId: 'CONTRACT1786343272751' },
      { name: 'Bank_Statement.pdf', type: 'BANK_STATEMENT', entity: 'CONTRACT', entityId: 'CONTRACT1786343272751' },
    ];

    for (const doc of documents) {
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${doc.name}`;
      const filePath = createSamplePDF(filename);
      
      const fileBuffer = fs.readFileSync(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const documentId = `DOC-${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      
      await pool.query(
        `INSERT INTO documents (
          document_id, entity_type, entity_id, document_type, file_name,
          file_hash, mime_type, file_size, file_path, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          documentId,
          doc.entity,
          doc.entityId,
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
      
      console.log(`✅ Uploaded: ${doc.name} (${documentId})`);
    }

    console.log('\n✅ Sample documents uploaded successfully!');
    console.log(`📁 Location: ${uploadDir}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

uploadSampleDocuments();
