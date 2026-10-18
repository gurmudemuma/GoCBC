#!/usr/bin/env node
/**
 * Add ECTA Required Documents to Contracts
 * 
 * This script adds the three required ECTA documents to contracts:
 * 1. QUALITY_CERTIFICATE
 * 2. CERTIFICATE_OF_ORIGIN
 * 3. EXPORT_PERMIT
 */

const { DatabaseService } = require('./api/dist/services/databaseService');
const { FabricService } = require('./api/dist/services/fabricService');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Sample PDF template function
function createPDF(title, content) {
  return `%PDF-1.4
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
/F2 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${300 + content.length}
>>
stream
BT
/F2 18 Tf
50 720 Td
(${title}) Tj
0 -30 Td
/F1 10 Tf
(Ethiopian Coffee & Tea Authority (ECTA)) Tj
0 -15 Td
(Trade & Export Division) Tj
0 -30 Td
${content}
0 -30 Td
(___________________________) Tj
0 -15 Td
(Inspector Signature) Tj
0 -30 Td
(___________________________) Tj
0 -15 Td
(Supervisor Signature) Tj
0 -30 Td
/F1 8 Tf
(This is a sample document for testing purposes.) Tj
0 -10 Td
(Date: ${new Date().toISOString().split('T')[0]}) Tj
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
${800 + content.length}
%%EOF`;
}

// Document templates
const DOCUMENT_TEMPLATES = {
  QUALITY_CERTIFICATE: {
    title: 'QUALITY CERTIFICATE',
    content: `(Certificate No: QC-${Date.now()}) Tj\n0 -20 Td\n(Product: Ethiopian Arabica Coffee Beans) Tj\n0 -15 Td\n(Grade: Grade 1) Tj\n0 -15 Td\n(Quality: Premium Export Grade) Tj\n0 -15 Td\n(Moisture Content: 11.5%) Tj\n0 -15 Td\n(Defect Count: 8 per 300g sample) Tj\n0 -15 Td\n(Certification: Meets international export standards) Tj\n0 -15 Td\n(Inspection Date: ${new Date().toLocaleDateString()}) Tj\n0 -15 Td`,
    description: 'Official quality inspection certificate confirming coffee grade and standards compliance'
  },
  CERTIFICATE_OF_ORIGIN: {
    title: 'CERTIFICATE OF ORIGIN',
    content: `(Certificate No: CO-${Date.now()}) Tj\n0 -20 Td\n(Country of Origin: ETHIOPIA) Tj\n0 -15 Td\n(Product: Arabica Coffee Beans) Tj\n0 -15 Td\n(Growing Region: Sidamo/Yirgacheffe) Tj\n0 -15 Td\n(Harvest Season: 2024/2025) Tj\n0 -15 Td\n(Certification: 100% Ethiopian Origin) Tj\n0 -15 Td\n(This certifies that the goods described are produced) Tj\n0 -15 Td\n(and exported from the Federal Democratic Republic of Ethiopia.) Tj\n0 -15 Td\n(Issue Date: ${new Date().toLocaleDateString()}) Tj\n0 -15 Td`,
    description: 'Official certificate verifying Ethiopian origin of exported coffee'
  },
  EXPORT_PERMIT: {
    title: 'EXPORT PERMIT',
    content: `(Permit No: EP-${Date.now()}) Tj\n0 -20 Td\n(Exporter: [Registered Coffee Exporter]) Tj\n0 -15 Td\n(Product: Arabica Coffee Beans) Tj\n0 -15 Td\n(Quantity: 1000 kg) Tj\n0 -15 Td\n(Destination Country: [Import Country]) Tj\n0 -15 Td\n(Export Authorization: GRANTED) Tj\n0 -15 Td\n(Compliance: All export regulations satisfied) Tj\n0 -15 Td\n(Valid Until: ${new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString()}) Tj\n0 -15 Td\n(Permit Issue Date: ${new Date().toLocaleDateString()}) Tj\n0 -15 Td`,
    description: 'Official permit authorizing export of coffee from Ethiopia'
  }
};

async function createSampleDocument(docType, uploadDir) {
  const template = DOCUMENT_TEMPLATES[docType];
  const fileName = `Sample_${docType}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  
  // Check if already exists
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${docType} sample already exists`);
    return { filePath, fileName, isNew: false };
  }
  
  // Create PDF content
  const pdfContent = createPDF(template.title, template.content);
  fs.writeFileSync(filePath, pdfContent);
  
  console.log(`  ✓ Created ${docType} sample`);
  return { filePath, fileName, isNew: true };
}

async function addECTADocumentsToContracts() {
  console.log('\n=== ADDING ECTA DOCUMENTS TO CONTRACTS ===\n');
  
  const db = DatabaseService.getInstance();
  const fabricService = FabricService.getInstance();
  
  try {
    // Connect to blockchain
    await fabricService.connect();
    console.log('✅ Connected to blockchain\n');
    
    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, 'api/uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('✅ Created upload directory\n');
    }
    
    // Create sample documents
    console.log('📄 Creating sample ECTA documents...\n');
    const sampleDocs = {};
    for (const docType of ['QUALITY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN', 'EXPORT_PERMIT']) {
      sampleDocs[docType] = await createSampleDocument(docType, uploadDir);
    }
    console.log('');
    
    // Get contracts
    console.log('🔍 Finding contracts...\n');
    const contracts = await db.all(`
      SELECT contract_id, exporter_id, contract_status, created_at
      FROM contracts
      WHERE contract_status IN ('REGISTERED', 'APPROVED', 'PENDING')
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    console.log(`Found ${contracts.length} contracts\n`);
    
    let stats = {
      processed: 0,
      documentsAdded: 0,
      skipped: 0,
      errors: 0,
      byType: {
        QUALITY_CERTIFICATE: 0,
        CERTIFICATE_OF_ORIGIN: 0,
        EXPORT_PERMIT: 0
      }
    };
    
    for (const contract of contracts) {
      console.log(`\n📋 ${contract.contract_id} (${contract.contract_status})`);
      stats.processed++;
      
      // Check existing documents
      const existingDocs = await db.all(`
        SELECT document_type 
        FROM documents 
        WHERE (entity_type = 'CONTRACT' AND entity_id = $1) 
           OR contract_id = $1
      `, [contract.contract_id]);
      
      const existingTypes = new Set(existingDocs.map(d => d.document_type));
      
      // Add missing ECTA documents
      for (const docType of ['QUALITY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN', 'EXPORT_PERMIT']) {
        if (existingTypes.has(docType)) {
          console.log(`  ⏭️  ${docType} - already exists`);
          stats.skipped++;
          continue;
        }
        
        try {
          const sample = sampleDocs[docType];
          
          // Read file and calculate hash
          const fileBuffer = fs.readFileSync(sample.filePath);
          const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          const fileSize = fileBuffer.length;
          
          // Generate unique document ID
          const documentId = `DOC_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const fileName = `${docType}_${contract.contract_id}.pdf`;
          
          // Copy sample to new file
          const newFilePath = path.join(
            uploadDir,
            `${Date.now()}-${Math.round(Math.random() * 1E9)}-${fileName}`
          );
          fs.copyFileSync(sample.filePath, newFilePath);
          
          // Register on blockchain
          const bcResult = await fabricService.invokeChaincode('RegisterDocumentHash', [
            documentId,
            fileHash,
            docType,
            '', // lcId
            contract.contract_id, // contractId
            'ecta_system',
            JSON.stringify({
              fileName: fileName,
              entityType: 'CONTRACT',
              entityId: contract.contract_id,
              fileSize: fileSize,
              mimeType: 'application/pdf',
              uploadedAt: new Date().toISOString(),
              description: DOCUMENT_TEMPLATES[docType].description,
              requiresSignature: true,
              signatureSequence: 'INSPECTOR_THEN_SUPERVISOR'
            })
          ]);
          
          if (!bcResult.success) {
            console.log(`  ❌ ${docType} - Blockchain error: ${bcResult.error}`);
            stats.errors++;
            continue;
          }
          
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
              description,
              blockchain_tx_id,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, datetime('now'))
          `, [
            documentId,
            'CONTRACT',
            contract.contract_id,
            contract.contract_id,
            docType,
            fileName,
            fileHash,
            'application/pdf',
            fileSize,
            newFilePath,
            'ecta_system',
            'active',
            DOCUMENT_TEMPLATES[docType].description,
            bcResult.txId
          ]);
          
          console.log(`  ✅ ${docType} - Added (TX: ${bcResult.txId.substring(0, 16)}...)`);
          stats.documentsAdded++;
          stats.byType[docType]++;
          
        } catch (error) {
          console.log(`  ❌ ${docType} - Error: ${error.message}`);
          stats.errors++;
        }
      }
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Contracts Processed:       ${stats.processed}`);
    console.log(`Documents Added:           ${stats.documentsAdded}`);
    console.log(`  - QUALITY_CERTIFICATE:   ${stats.byType.QUALITY_CERTIFICATE}`);
    console.log(`  - CERTIFICATE_OF_ORIGIN: ${stats.byType.CERTIFICATE_OF_ORIGIN}`);
    console.log(`  - EXPORT_PERMIT:         ${stats.byType.EXPORT_PERMIT}`);
    console.log(`Already Existed:           ${stats.skipped}`);
    console.log(`Errors:                    ${stats.errors}`);
    console.log('='.repeat(60));
    
    if (stats.documentsAdded > 0) {
      console.log('\n✅ SUCCESS!');
      console.log('\nNext Steps:');
      console.log('1. Refresh the portal to see the new documents');
      console.log('2. ECTA Inspector should sign each document first');
      console.log('3. ECTA Supervisor should sign after inspector');
      console.log('4. Documents will then be ready for bank examination');
    } else if (stats.skipped > 0 && stats.errors === 0) {
      console.log('\n✅ All contracts already have ECTA documents!');
    } else {
      console.log('\n⚠️  Some issues occurred. Check the logs above.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Main execution
addECTADocumentsToContracts().then(() => {
  console.log('\n=== COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
