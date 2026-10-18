#!/usr/bin/env node
/**
 * Add Sample Documents to Contracts
 * Creates sample PDFs and adds them to contracts missing documents
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure we're using the compiled version
const dbPath = path.join(__dirname, 'api/dist/services/databaseService.js');
if (!fs.existsSync(dbPath)) {
  console.error('Error: API not compiled. Run: cd api && npm run build');
  process.exit(1);
}

const { DatabaseService } = require('./api/dist/services/databaseService');

// Simple PDF generator
function createPDF(title, content) {
  return Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 250>>stream
BT
/F1 16 Tf
50 700 Td
(${title}) Tj
0 -30 Td
/F1 10 Tf
${content}
0 -40 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -20 Td
(Sample Document for Testing) Tj
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
trailer<</Size 5/Root 1 0 R>>
startxref
617
%%EOF`);
}

// Document templates
const DOC_TYPES = {
  'CONTRACT_SIGNED': {
    title: 'SIGNED SALES CONTRACT',
    content: '(Contract Agreement Between Exporter and Buyer) Tj\n0 -20 Td\n(Product: Ethiopian Coffee Beans) Tj\n0 -15 Td\n(Quantity: 1000 kg) Tj\n0 -15 Td\n(Price: $5.50 per kg) Tj\n0 -15 Td'
  },
  'QUALITY_CERTIFICATE': {
    title: 'QUALITY CERTIFICATE',
    content: '(ECTA Quality Inspection Certificate) Tj\n0 -20 Td\n(Grade: Grade 1 Premium) Tj\n0 -15 Td\n(Moisture: 11.5%) Tj\n0 -15 Td\n(Defects: 8 per 300g) Tj\n0 -15 Td'
  },
  'CERTIFICATE_OF_ORIGIN': {
    title: 'CERTIFICATE OF ORIGIN',
    content: '(Country of Origin: ETHIOPIA) Tj\n0 -20 Td\n(Region: Sidamo/Yirgacheffe) Tj\n0 -15 Td\n(100% Ethiopian Origin Certified) Tj\n0 -15 Td'
  },
  'EXPORT_PERMIT': {
    title: 'EXPORT PERMIT',
    content: '(Export Authorization Granted) Tj\n0 -20 Td\n(Permit Status: APPROVED) Tj\n0 -15 Td\n(Valid for 90 days) Tj\n0 -15 Td'
  }
};

async function main() {
  console.log('\n=== Adding Sample Documents to Contracts ===\n');
  
  try {
    const db = DatabaseService.getInstance();
    const uploadDir = path.join(__dirname, 'api/uploads/documents');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('✓ Created uploads directory\n');
    }
    
    // Get contracts
    const contracts = await db.all(`
      SELECT contract_id, exporter_id, status 
      FROM contracts 
      WHERE LOWER(status) IN ('registered', 'approved', 'pending')
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${contracts.length} contracts\n`);
    
    let stats = { added: 0, skipped: 0, total: 0 };
    
    for (const contract of contracts) {
      console.log(`\n${contract.contract_id}:`);
      
      // Check existing documents
      const existing = await db.all(`
        SELECT document_type 
        FROM documents 
        WHERE contract_id = $1
      `, [contract.contract_id]);
      
      const existingTypes = new Set(existing.map(d => d.document_type));
      
      // Add missing documents
      for (const [docType, template] of Object.entries(DOC_TYPES)) {
        stats.total++;
        
        if (existingTypes.has(docType)) {
          console.log(`  ⏭  ${docType} exists`);
          stats.skipped++;
          continue;
        }
        
        try {
          // Create PDF
          const pdfContent = createPDF(template.title, template.content);
          const fileHash = crypto.createHash('sha256').update(pdfContent).digest('hex');
          
          // Save file
          const timestamp = Date.now();
          const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}-${docType}_${contract.contract_id}.pdf`;
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, pdfContent);
          
          // Insert into database
          const documentId = `DOC_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
          
          await db.run(`
            INSERT INTO documents (
              document_id, 
              contract_id, 
              document_type, 
              file_name, 
              file_hash, 
              mime_type, 
              file_size, 
              file_path, 
              uploaded_by, 
              status, 
              verification_status, 
              uploaded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          `, [
            documentId,
            contract.contract_id,
            docType,
            fileName,
            fileHash,
            'application/pdf',
            pdfContent.length,
            filePath,
            'system',
            'active',
            docType === 'CONTRACT_SIGNED' ? 'verified' : 'pending'
          ]);
            'application/pdf',
            pdfContent.length,
            filePath,
            'system',
            'active',
            docType === 'CONTRACT_SIGNED' ? 'verified' : 'pending'
          ]);
          
          console.log(`  ✓ ${docType} added (${(pdfContent.length/1024).toFixed(1)} KB)`);
          stats.added++;
          
        } catch (err) {
          console.log(`  ✗ ${docType} failed: ${err.message}`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Contracts processed: ${contracts.length}`);
    console.log(`Documents added:     ${stats.added}`);
    console.log(`Already existed:     ${stats.skipped}`);
    console.log(`Total checked:       ${stats.total}`);
    console.log('='.repeat(50));
    
    if (stats.added > 0) {
      console.log('\n✅ SUCCESS! Documents added to contracts.');
      console.log('\nNext steps:');
      console.log('1. Refresh your portal browser tab');
      console.log('2. Open a contract details dialog');
      console.log('3. You should now see the documents listed');
      console.log('4. ECTA users can sign the quality documents');
    } else {
      console.log('\n✓ All contracts already have documents!');
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n=== Complete ===\n');
  process.exit(0);
});
