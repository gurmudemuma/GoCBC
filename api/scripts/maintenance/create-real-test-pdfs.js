/**
 * Create real PDF files for testing document viewing
 * Uses PDFKit to generate actual PDF documents
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const uploadsDir = path.join(__dirname, 'uploads', 'documents');

// Ensure directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create PDF helper
function createTestPDF(filename, title, content) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(uploadsDir, filename);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filepath);
    
    doc.pipe(stream);
    
    // Add header
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    
    // Add content
    doc.fontSize(12).text(content, {
      align: 'left',
      width: 410
    });
    
    // Add footer
    doc.moveDown(2);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, {
      align: 'center'
    });
    
    doc.end();
    
    stream.on('finish', () => {
      console.log(`Created: ${filename}`);
      resolve(filepath);
    });
    
    stream.on('error', reject);
  });
}

async function main() {
  try {
    console.log('Creating real PDF test documents...');
    
    // Create test PDFs
    const businessLicensePath = await createTestPDF(
      'test-business-license.pdf',
      'Business License Certificate',
      'This is a test Business License document for Coffee Export Company.\n\n' +
      'License Number: BL-2024-12345\n' +
      'Company Name: Test Coffee Exporter\n' +
      'Issue Date: January 1, 2024\n' +
      'Expiry Date: December 31, 2024\n\n' +
      'This license authorizes the company to engage in coffee export activities.'
    );
    
    const tinPath = await createTestPDF(
      'test-tin-certificate.pdf',
      'Tax Identification Number Certificate',
      'This is a test TIN Certificate for Coffee Export Company.\n\n' +
      'TIN Number: 1234567890\n' +
      'Company Name: Test Coffee Exporter\n' +
      'Registration Date: January 1, 2024\n\n' +
      'This certificate confirms the company\'s tax registration status.'
    );
    
    const tasterPath = await createTestPDF(
      'test-taster-certificate.pdf',
      'Coffee Taster Certification',
      'This is a test Coffee Taster Certificate.\n\n' +
      'Certificate Number: TC-2024-001\n' +
      'Taster Name: John Doe\n' +
      'Issue Date: January 1, 2024\n' +
      'Valid Until: December 31, 2024\n\n' +
      'This certifies that the taster is qualified to assess coffee quality.'
    );
    
    const labPath = await createTestPDF(
      'test-lab-certificate.pdf',
      'Laboratory Test Certificate',
      'This is a test Laboratory Certificate.\n\n' +
      'Certificate Number: LC-2024-001\n' +
      'Laboratory Name: Ethiopian Coffee Quality Lab\n' +
      'Test Date: January 15, 2024\n' +
      'Sample ID: SAMPLE-2024-001\n\n' +
      'Results:\n' +
      '- Moisture Content: 11.5%\n' +
      '- Defects: Grade 1 (0 defects)\n' +
      '- Cup Quality: 85/100\n' +
      '- Status: PASSED'
    );
    
    console.log('\n✅ All PDF files created successfully!');
    
    // Now update the database
    console.log('\nUpdating database with new PDF files...');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
    });
    
    await client.connect();
    
    // Get existing documents for APP-07193259
    const { rows } = await client.query(
      `SELECT document_id, file_name FROM documents 
       WHERE entity_id = 'APP-07193259' 
       AND entity_type = 'EXPORTER_APPLICATION'
       ORDER BY document_id`
    );
    
    if (rows.length === 0) {
      console.log('No documents found for APP-07193259');
      await client.end();
      return;
    }
    
    // Map old files to new files
    const fileMapping = {
      'Business_License.pdf': businessLicensePath,
      'TIN_Certificate.pdf': tinPath,
      'Taster_Certificate.pdf': tasterPath,
      'Lab_Certificate.pdf': labPath
    };
    
    // Update each document
    for (const row of rows) {
      const newPath = fileMapping[row.file_name];
      if (newPath) {
        const stats = fs.statSync(newPath);
        const crypto = require('crypto');
        const fileBuffer = fs.readFileSync(newPath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        await client.query(
          `UPDATE documents 
           SET file_path = $1, 
               file_size = $2, 
               file_hash = $3,
               mime_type = 'application/pdf'
           WHERE document_id = $4`,
          [newPath, stats.size, fileHash, row.document_id]
        );
        
        console.log(`✓ Updated ${row.file_name} (${row.document_id}) - ${stats.size} bytes`);
      }
    }
    
    await client.end();
    console.log('\n✅ Database updated successfully!');
    console.log('\nYou can now view these documents in the ECTA portal.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
