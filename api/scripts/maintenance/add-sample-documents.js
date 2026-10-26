// Add sample documents for Jimma Buna application
require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

const applicationId = 'APP-1786706626876-FPEY88';

const sampleDocuments = [
  {
    document_id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    document_type: 'BUSINESS_LICENSE',
    file_name: 'Business_License_Jimma_Buna.pdf',
    file_size: 156789,
    mime_type: 'application/pdf',
    file_hash: crypto.randomBytes(32).toString('hex'),
    uploaded_by: 'applicant',
    status: 'active',
  },
  {
    document_id: `DOC-${Date.now() + 1}-${Math.floor(Math.random() * 1000000)}`,
    document_type: 'TIN_CERTIFICATE',
    file_name: 'TIN_Certificate_Jimma_Buna.pdf',
    file_size: 98456,
    mime_type: 'application/pdf',
    file_hash: crypto.randomBytes(32).toString('hex'),
    uploaded_by: 'applicant',
    status: 'active',
  },
  {
    document_id: `DOC-${Date.now() + 2}-${Math.floor(Math.random() * 1000000)}`,
    document_type: 'TASTER_CERTIFICATE',
    file_name: 'Professional_Taster_Certificate.pdf',
    file_size: 123456,
    mime_type: 'application/pdf',
    file_hash: crypto.randomBytes(32).toString('hex'),
    uploaded_by: 'applicant',
    status: 'active',
  },
  {
    document_id: `DOC-${Date.now() + 3}-${Math.floor(Math.random() * 1000000)}`,
    document_type: 'LABORATORY_CERTIFICATE',
    file_name: 'Laboratory_Certificate.pdf',
    file_size: 234567,
    mime_type: 'application/pdf',
    file_hash: crypto.randomBytes(32).toString('hex'),
    uploaded_by: 'applicant',
    status: 'active',
  },
  {
    document_id: `DOC-${Date.now() + 4}-${Math.floor(Math.random() * 1000000)}`,
    document_type: 'BANK_STATEMENT',
    file_name: 'Bank_Account_Statement.pdf',
    file_size: 345678,
    mime_type: 'application/pdf',
    file_hash: crypto.randomBytes(32).toString('hex'),
    uploaded_by: 'applicant',
    status: 'active',
  },
  {
    document_id: `DOC-${Date.now() + 5}-${Math.floor(Math.random() * 1000000)}`,
    document_type: 'TRADE_LICENSE',
    file_name: 'Trade_License.pdf',
    file_size: 187654,
    mime_type: 'application/pdf',
    file_hash: crypto.randomBytes(32).toString('hex'),
    uploaded_by: 'applicant',
    status: 'active',
  },
];

(async () => {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log(`Adding ${sampleDocuments.length} sample documents for application: ${applicationId}\n`);
    
    for (const doc of sampleDocuments) {
      await client.query(`
        INSERT INTO documents (
          document_id, entity_type, entity_id, document_type, file_name,
          file_hash, mime_type, file_size, uploaded_by, status,
          uploaded_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        doc.document_id,
        'EXPORTER_APPLICATION',
        applicationId,
        doc.document_type,
        doc.file_name,
        doc.file_hash,
        doc.mime_type,
        doc.file_size,
        doc.uploaded_by,
        doc.status,
      ]);
      
      console.log(`✅ Added: ${doc.file_name} (${doc.document_type})`);
    }
    
    console.log('\n✅ All documents added successfully!');
    console.log('\nYou can now view these documents in the ECTA portal:');
    console.log('1. Login as ectaAdmin');
    console.log('2. Go to Pending Applications');
    console.log('3. Click "View Details" on Jimma Buna exporter');
    console.log('4. Click "Documents (6)" tab');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
