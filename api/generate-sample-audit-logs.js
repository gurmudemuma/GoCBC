// Generate Sample Audit Logs from Existing Data
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function generateAuditLogs() {
  console.log('🔍 Generating audit logs from existing data...\n');

  try {
    // 1. Exporter Applications
    const apps = await pool.query(`
      SELECT application_id, company_name, status, submitted_at, approved_at, exporter_id
      FROM exporter_applications 
      ORDER BY submitted_at DESC
    `);
    
    console.log(`📋 Found ${apps.rows.length} exporter applications`);
    
    for (const app of apps.rows) {
      // Application submission
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'EXPORTER_APPLICATION',
        app.application_id,
        'CREATE',
        app.company_name,
        'EXPORTER',
        'EXPORTER',
        'N/A',
        'SUBMITTED',
        'Exporter application submitted',
        JSON.stringify({ applicationId: app.application_id, companyName: app.company_name }),
        '192.168.1.100',
        app.submitted_at
      ]);
      
      // If approved
      if (app.status === 'approved' && app.approved_at) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'EXPORTER_APPLICATION',
          app.application_id,
          'APPROVE',
          'ecta_officer',
          'ECTAMSP',
          'ECTAMSP',
          'SUBMITTED',
          'APPROVED',
          'Application approved by ECTA',
          JSON.stringify({ applicationId: app.application_id, exporterId: app.exporter_id }),
          '192.168.1.10',
          app.approved_at
        ]);
      }
    }
    console.log(`✅ Created logs for ${apps.rows.length} applications\n`);

    // 2. Documents
    const docs = await pool.query(`
      SELECT document_id, filename, entity_type, entity_id, uploaded_at, uploaded_by
      FROM documents 
      ORDER BY uploaded_at DESC
      LIMIT 30
    `);
    
    console.log(`📄 Found ${docs.rows.length} documents`);
    
    for (const doc of docs.rows) {
      // Document upload
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        'DOCUMENT',
        doc.document_id,
        'UPLOAD',
        doc.uploaded_by || 'user',
        'EXPORTER',
        'N/A',
        'UPLOADED',
        `Document uploaded: ${doc.filename}`,
        JSON.stringify({ documentId: doc.document_id, filename: doc.filename, entityType: doc.entity_type }),
        '192.168.1.101',
        doc.uploaded_at
      ]);
      
      // Add a VIEW log (simulate someone viewed it)
      const viewDate = new Date(doc.uploaded_at);
      viewDate.setHours(viewDate.getHours() + 1);
      
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        'DOCUMENT',
        doc.document_id,
        'VIEW',
        'ecta_reviewer',
        'ECTAMSP',
        'N/A',
        'VIEWED',
        'Document viewed for verification',
        JSON.stringify({ documentId: doc.document_id, viewType: 'inline' }),
        '192.168.1.11',
        viewDate
      ]);
    }
    console.log(`✅ Created logs for ${docs.rows.length} documents\n`);

    // 3. Quality Inspections
    const inspections = await pool.query(`
      SELECT inspection_id, shipment_id, status, created_at, inspector_id
      FROM quality_inspections 
      ORDER BY created_at DESC
    `);
    
    console.log(`🔬 Found ${inspections.rows.length} quality inspections`);
    
    for (const insp of inspections.rows) {
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        'QUALITY',
        insp.inspection_id,
        'CREATE',
        insp.inspector_id || 'inspector',
        'ECTAMSP',
        'N/A',
        insp.status || 'SCHEDULED',
        'Quality inspection scheduled',
        JSON.stringify({ inspectionId: insp.inspection_id, shipmentId: insp.shipment_id }),
        '192.168.1.12',
        insp.created_at
      ]);
    }
    console.log(`✅ Created logs for ${inspections.rows.length} inspections\n`);

    // 4. Add some recent activity logs (contracts from blockchain)
    console.log(`📝 Creating synthetic contract activity logs...`);
    const baseTime = new Date();
    const contracts = ['CONTRACT1786364548810', 'CONTRACT1786281648923', 'CONTRACT1786198748034'];
    
    for (let i = 0; i < contracts.length; i++) {
      const contractTime = new Date(baseTime.getTime() - (i * 24 * 3600000));
      
      // Contract creation
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        'CONTRACT',
        contracts[i],
        'CREATE',
        'EXP2120784',
        'EXPORTER',
        'N/A',
        'REGISTERED',
        'Contract registered on blockchain',
        JSON.stringify({ contractId: contracts[i], blockchain: 'Hyperledger Fabric' }),
        '192.168.1.102',
        contractTime
      ]);
      
      // ECTA approval
      const approvalTime = new Date(contractTime.getTime() + (2 * 3600000));
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        'CONTRACT',
        contracts[i],
        'APPROVE',
        'ecta_officer',
        'ECTAMSP',
        'REGISTERED',
        'APPROVED',
        'Contract approved for export',
        JSON.stringify({ contractId: contracts[i], transactionId: `TX-${Date.now()}` }),
        '192.168.1.10',
        approvalTime
      ]);
    }
    console.log(`✅ Created logs for ${contracts.length} contracts\n`);

    // Get total count
    const result = await pool.query('SELECT COUNT(*) as count FROM audit_trail');
    console.log(`\n🎉 Total audit logs: ${result.rows[0].count}`);
    
    // Show recent samples
    const samples = await pool.query(`
      SELECT entity_type, entity_id, action, performed_by_org, created_at 
      FROM audit_trail 
      ORDER BY created_at DESC 
      LIMIT 15
    `);
    
    console.log('\n📊 Recent audit logs:');
    samples.rows.forEach(log => {
      console.log(`  ${log.created_at.toISOString().split('T')[0]} | ${log.entity_type.padEnd(20)} | ${log.action.padEnd(10)} | ${log.performed_by_org}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generateAuditLogs().then(() => {
  console.log('\n✅ Audit log generation complete!');
  console.log('👉 Refresh your portal to see the audit trail data');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Failed:', error);
  process.exit(1);
});
