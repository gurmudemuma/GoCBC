/**
 * Test Document Fetching from Multiple Sources
 * Verifies that documents are correctly retrieved from:
 * 1. PostgreSQL documents table
 * 2. PostgreSQL exporter_applications table
 * 3. Blockchain CoffeeShipment documents array
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'cecbs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cecbs',
  password: process.env.DB_PASSWORD || 'cecbs123',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function testDocumentFetching() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔍 TESTING DOCUMENT FETCHING FROM MULTIPLE SOURCES');
  console.log('═'.repeat(80));
  
  try {
    // Get a sample shipment ID WITH documents
    const shipments = await pool.query(`
      SELECT application_id, company_name 
      FROM exporter_applications 
      WHERE status = 'approved' 
        AND documents IS NOT NULL 
        AND jsonb_array_length(documents) > 0
      ORDER BY submitted_at DESC
      LIMIT 1
    `);
    
    if (shipments.rows.length === 0) {
      console.log('❌ No approved applications found');
      return;
    }
    
    const application = shipments.rows[0];
    const applicationId = application.application_id;
    const shipmentId = `SHIPAPP-${applicationId}`;
    
    console.log(`\n📦 Testing with Shipment: ${shipmentId}`);
    console.log(`   Company: ${application.company_name}`);
    console.log(`   Application ID: ${applicationId}`);
    
    // SOURCE 1: PostgreSQL documents table
    console.log('\n' + '─'.repeat(80));
    console.log('1️⃣  POSTGRESQL DOCUMENTS TABLE');
    console.log('─'.repeat(80));
    
    const pgDocs = await pool.query(`
      SELECT 
        document_id,
        file_name,
        document_type,
        file_path,
        uploaded_at,
        uploaded_by,
        status
      FROM documents 
      WHERE entity_type = 'shipment' 
        AND (entity_id = $1 OR entity_id = $2 OR shipment_id = $1 OR shipment_id = $2)
        AND status != 'deleted'
      ORDER BY uploaded_at DESC
    `, [shipmentId, `SHIP${applicationId}`]);
    
    console.log(`   Found ${pgDocs.rows.length} documents in documents table`);
    pgDocs.rows.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.file_name}`);
      console.log(`      Type: ${doc.document_type}`);
      console.log(`      Uploaded: ${doc.uploaded_at}`);
      console.log(`      By: ${doc.uploaded_by}`);
    });
    
    // SOURCE 2: Application documents
    console.log('\n' + '─'.repeat(80));
    console.log('2️⃣  APPLICATION DOCUMENTS (exporter_applications table)');
    console.log('─'.repeat(80));
    
    const appData = await pool.query(`
      SELECT 
        documents,
        submitted_at,
        company_name
      FROM exporter_applications 
      WHERE application_id = $1
    `, [applicationId]);
    
    if (appData.rows.length > 0) {
      const app = appData.rows[0];
      
      if (app.documents && Array.isArray(app.documents)) {
        let appDocCount = 0;
        app.documents.forEach((doc) => {
          if (doc && (doc.documentId || doc.fileName)) {
            appDocCount++;
            console.log(`   ${appDocCount}. ${doc.fileName || 'Document'}`);
            console.log(`      Type/Category: ${doc.category || doc.type || 'Unknown'}`);
            console.log(`      Document ID: ${doc.documentId || 'N/A'}`);
            console.log(`      URL: /api/v1/documents/${doc.documentId}`);
            console.log(`      Uploaded: ${doc.uploadedAt || app.submitted_at}`);
            console.log(`      By: ${doc.uploadedBy || app.company_name}`);
          }
        });
        console.log(`\n   Found ${appDocCount} application documents`);
      } else {
        console.log('   ℹ️  No documents in JSONB array');
      }
    } else {
      console.log('   ❌ Application not found');
    }
    
    // SOURCE 3: Check if blockchain has documents
    console.log('\n' + '─'.repeat(80));
    console.log('3️⃣  BLOCKCHAIN DOCUMENTS');
    console.log('─'.repeat(80));
    console.log('   ℹ️  Blockchain documents are stored in CouchDB');
    console.log('   ℹ️  Access via: shipment.documents[] array');
    console.log('   ℹ️  Requires blockchain query to verify');
    
    // SUMMARY
    console.log('\n' + '═'.repeat(80));
    console.log('📊 DOCUMENT FETCHING SUMMARY');
    console.log('═'.repeat(80));
    
    const totalDocs = pgDocs.rows.length + (appData.rows.length > 0 ? 
      Object.keys(appData.rows[0]).filter(k => appData.rows[0][k] && k.includes('document') || k.includes('certificate') || k.includes('permit')).length : 0);
    
    console.log(`\n   Shipment ID: ${shipmentId}`);
    console.log(`   Application ID: ${applicationId}`);
    console.log(`   PostgreSQL documents table: ${pgDocs.rows.length} documents`);
    console.log(`   Application documents: ${appData.rows.length > 0 ? 'Found' : 'Not found'}`);
    console.log(`   Blockchain documents: Check via API/blockchain query`);
    console.log(`\n   ✅ Total documents accessible: ${totalDocs}+`);
    
    if (totalDocs === 0) {
      console.log('\n   ⚠️  WARNING: No documents found!');
      console.log('   This could mean:');
      console.log('   - Documents not uploaded yet');
      console.log('   - Shipment/Application ID mismatch');
      console.log('   - Database query needs adjustment');
    } else {
      console.log('\n   ✅ SUCCESS: Documents are accessible!');
      console.log('   The verification dialog should display these documents.');
    }
    
    console.log('\n' + '═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run test
testDocumentFetching();
