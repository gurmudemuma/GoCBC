#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple PDF generator
function createPDF(title) {
  return Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 150>>stream
BT /F1 16 Tf 50 700 Td (${title}) Tj 0 -30 Td /F1 10 Tf (Sample Document) Tj 0 -20 Td (Generated: ${new Date().toLocaleDateString()}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
517
%%EOF`);
}

const DOC_TYPES = [
  'CONTRACT_SIGNED',
  'QUALITY_CERTIFICATE', 
  'CERTIFICATE_OF_ORIGIN',
  'EXPORT_PERMIT'
];

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'cecbs',
    user: 'cecbs',
    password: 'cecbs123'
  });
  
  await client.connect();
  console.log('✓ Connected to PostgreSQL\n');
  
  // Get contracts
  const result = await client.query(`
    SELECT contract_id, status 
    FROM contracts 
    WHERE LOWER(status) IN ('registered', 'approved', 'pending')
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  console.log(`Found ${result.rows.length} contracts\n`);
  
  const uploadDir = path.join(__dirname, 'api/uploads/documents');
  let added = 0, skipped = 0;
  
  for (const contract of result.rows) {
    console.log(`${contract.contract_id}:`);
    
    // Check existing docs
    const docs = await client.query(
      'SELECT document_type FROM documents WHERE contract_id = $1',
      [contract.contract_id]
    );
    
    const existing = new Set(docs.rows.map(d => d.document_type));
    
    // Add missing docs
    for (const docType of DOC_TYPES) {
      if (existing.has(docType)) {
        console.log(`  ⏭  ${docType}`);
        skipped++;
        continue;
      }
      
      // Create PDF
      const pdf = createPDF(docType.replace(/_/g, ' '));
      const hash = crypto.createHash('sha256').update(pdf).digest('hex');
      const timestamp = Date.now();
      const fileName = `${timestamp}-${docType}_${contract.contract_id}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.writeFileSync(filePath, pdf);
      
      // Insert into DB
      await client.query(`
        INSERT INTO documents (
          document_id, contract_id, document_type, file_name,
          file_hash, mime_type, file_size, file_path,
          uploaded_by, status, verification_status, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        `DOC_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        contract.contract_id,
        docType,
        fileName,
        hash,
        'application/pdf',
        pdf.length,
        filePath,
        'system',
        'active',
        docType === 'CONTRACT_SIGNED' ? 'verified' : 'pending'
      ]);
      
      console.log(`  ✓ ${docType} added`);
      added++;
    }
  }
  
  console.log(`\n====================`);
  console.log(`Added: ${added}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`====================\n`);
  
  await client.end();
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
