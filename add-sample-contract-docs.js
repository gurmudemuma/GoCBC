#!/usr/bin/env node
/**
 * Add Sample Contract Documents
 * 
 * This script:
 * 1. Creates a sample sales contract PDF if it doesn't exist
 * 2. Finds contracts without documents
 * 3. Uploads the sample document to those contracts
 * 4. Records the upload in both blockchain and database
 */

const { DatabaseService } = require('./api/dist/services/databaseService');
const { FabricService } = require('./api/dist/services/fabricService');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Sample PDF content (minimal valid PDF)
const SAMPLE_PDF = `%PDF-1.4
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
/Length 200
>>
stream
BT
/F1 24 Tf
50 700 Td
(SALES CONTRACT) Tj
0 -50 Td
/F1 12 Tf
(Contract No: SAMPLE-CONTRACT) Tj
0 -30 Td
(Exporter: Sample Coffee Exporter) Tj
0 -20 Td
(Buyer: International Coffee Buyer) Tj
0 -20 Td
(Product: Arabica Coffee Beans) Tj
0 -20 Td
(Quantity: 1000 kg) Tj
0 -20 Td
(Price: $5.50 per kg) Tj
0 -30 Td
(This is a sample document for testing purposes.) Tj
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
567
%%EOF`;

async function createSamplePDF() {
  const uploadDir = path.join(__dirname, 'api/uploads/documents');
  
  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Created upload directory:', uploadDir);
  }
  
  // Check if sample already exists
  const samplePath = path.join(uploadDir, 'Sample_Sales_Contract.pdf');
  
  if (fs.existsSync(samplePath)) {
    console.log('✅ Sample contract PDF already exists:', samplePath);
    return samplePath;
  }
  
  // Create sample PDF
  fs.writeFileSync(samplePath, SAMPLE_PDF);
  console.log('✅ Created sample contract PDF:', samplePath);
  
  return samplePath;
}

async function addDocumentsToContracts() {
  console.log('\n=== ADDING SAMPLE DOCUMENTS TO CONTRACTS ===\n');
  
  const db = DatabaseService.getInstance();
  const fabricService = FabricService.getInstance();
  
  try {
    // Connect to blockchain
    await fabricService.connect();
    console.log('✅ Connected to blockchain\n');
    
    // Create sample PDF
    const samplePdfPath = await createSamplePDF();
    const pdfBuffer = fs.readFileSync(samplePdfPath);
    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const fileSize = pdfBuffer.length;
    
    console.log(`Sample PDF hash: ${fileHash}`);
    console.log(`Sample PDF size: ${fileSize} bytes\n`);
    
    // Get contracts without documents
    console.log('🔍 Finding contracts without documents...\n');
    
    const contracts = await db.all(`
      SELECT c.contract_id, c.exporter_id, c.contract_status, c.created_at
      FROM contracts c
      WHERE c.contract_status IN ('REGISTERED', 'APPROVED', 'PENDING')
      ORDER BY c.created_at DESC
      LIMIT 20
    `);
    
    console.log(`Found ${contracts.length} contracts\n`);
    
    let added = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const contract of contracts) {
      console.log(`\nProcessing ${contract.contract_id}...`);
      
      // Check if contract already has CONTRACT_SIGNED document
      const existingDocs = await db.all(`
        SELECT document_id, document_type 
        FROM documents 
        WHERE (entity_type = 'CONTRACT' AND entity_id = $1) 
           OR contract_id = $1
      `, [contract.contract_id]);
      
      const hasContractSigned = existingDocs.some(d => 
        d.document_type === 'CONTRACT_SIGNED' || 
        d.document_type === 'SALES_CONTRACT'
      );
      
      if (hasContractSigned) {
        console.log(`  ⏭️  Already has contract document (${existingDocs.length} docs total) - skipping`);
        skipped++;
        continue;
      }
      
      console.log(`  📄 Adding sample contract document...`);
      
      try {
        // Generate document ID
        const documentId = `DOC_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const fileName = `Signed_Sales_Contract_${contract.contract_id}.pdf`;
        
        // Copy sample PDF to new file
        const newFilePath = path.join(
          path.dirname(samplePdfPath), 
          `${Date.now()}-${Math.round(Math.random() * 1E9)}-${fileName}`
        );
        fs.copyFileSync(samplePdfPath, newFilePath);
        
        // Register on blockchain
        console.log(`  ⛓️  Registering on blockchain...`);
        const bcResult = await fabricService.invokeChaincode('RegisterDocumentHash', [
          documentId,
          fileHash,
          'CONTRACT_SIGNED',
          '', // lcId
          contract.contract_id, // contractId
          'system',
          JSON.stringify({
            fileName: fileName,
            entityType: 'CONTRACT',
            entityId: contract.contract_id,
            fileSize: fileSize,
            mimeType: 'application/pdf',
            uploadedAt: new Date().toISOString(),
            note: 'Sample document added by system'
          })
        ]);
        
        if (!bcResult.success) {
          console.log(`  ❌ Blockchain error: ${bcResult.error}`);
          errors++;
          continue;
        }
        
        console.log(`  ✅ Blockchain TX: ${bcResult.txId}`);
        
        // Insert into database
        await db.run(`
          INSERT INTO documents (
            document_id, 
            entity_type, 
            entity_id, 
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
            blockchain_tx_id,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, datetime('now'))
        `, [
          documentId,
          'CONTRACT',
          contract.contract_id,
          contract.contract_id,
          'CONTRACT_SIGNED',
          fileName,
          fileHash,
          'application/pdf',
          fileSize,
          newFilePath,
          'system',
          'active',
          'verified', // Mark as verified so it can be used
          bcResult.txId
        ]);
        
        console.log(`  ✅ Added to database: ${documentId}`);
        added++;
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    // Summary
    console.log('\n\n=== SUMMARY ===\n');
    console.log(`Total contracts processed: ${contracts.length}`);
    console.log(`Documents added: ${added}`);
    console.log(`Skipped (already have docs): ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    if (added > 0) {
      console.log('\n✅ SUCCESS! Sample documents have been added to contracts.');
      console.log('   You can now view these documents in the portals.');
    } else if (skipped > 0 && errors === 0) {
      console.log('\n✅ All contracts already have documents!');
    } else {
      console.log('\n⚠️  Some issues occurred. Check the logs above.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

addDocumentsToContracts().then(() => {
  console.log('\n=== COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
