const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

// Document IDs from blockchain for shipment SHIP1787204371672
const blockchainDocuments = [
  'DOC_1787204314325_ghzu2qoer',
  'DOC_1787204321224_683c6u3gy',
  'DOC_1787204333266_53bpjrff3',
  'DOC_1787204339636_fmjmycwr6',
  'DOC_1787204346315_5qz8bpx7t',
  'DOC_1787204353614_80s51riy5'
];

const shipmentId = 'SHIP1787204371672';
const uploadedBy = 'Blockchain';

// Mapping document types based on typical shipping documents
const documentTypes = [
  'CUSTOMS_CLEARANCE_CERTIFICATE',
  'EXPORT_PERMIT',
  'PHYTOSANITARY_CERTIFICATE',
  'TRUCK_REGISTRATION',
  'DRIVER_LICENSE',
  'BILL_OF_LADING'
];

const documentNames = [
  'Customs Clearance Certificate',
  'Export Permit',
  'Phytosanitary Certificate',
  'Truck Registration',
  'Driver License',
  'Bill of Lading'
];

(async () => {
  try {
    console.log('\n🔄 Syncing blockchain documents to PostgreSQL...\n');

    for (let i = 0; i < blockchainDocuments.length; i++) {
      const docId = blockchainDocuments[i];
      const docType = documentTypes[i];
      const fileName = documentNames[i] + '.pdf';
      
      // Check if document already exists
      const existing = await pool.query(
        'SELECT id FROM documents WHERE document_id = $1',
        [docId]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${docId} - already exists`);
        continue;
      }

      // Insert document
      await pool.query(`
        INSERT INTO documents (
          document_id,
          document_type,
          entity_type,
          entity_id,
          file_name,
          file_hash,
          uploaded_by,
          encrypted,
          verification_status,
          status,
          shipment_id,
          file_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        docId,
        docType,
        'SHIPMENT',
        shipmentId,
        fileName,
        `hash_${docId}`,
        uploadedBy,
        false,
        'verified',
        'active',
        shipmentId,
        `/documents/${docId}`
      ]);

      console.log(`✅ Inserted ${fileName} (${docId})`);
    }

    console.log('\n📊 Verification:\n');
    const result = await pool.query(`
      SELECT document_id, document_type, file_name, uploaded_by, verification_status
      FROM documents 
      WHERE shipment_id = $1
      ORDER BY uploaded_at DESC
    `, [shipmentId]);

    console.table(result.rows);
    
    console.log(`\n✅ Successfully synced ${blockchainDocuments.length} documents to PostgreSQL!\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
})();
