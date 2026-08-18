const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function createSampleLogs() {
  try {
    console.log('Creating sample audit logs...\n');
    
    const sampleLogs = [
      {
        entity_type: 'CONTRACT',
        entity_id: 'CONTRACT1786364548810',
        action: 'APPROVE',
        performed_by: 'admin',
        performed_by_org: 'ECTAMSP',
        old_value: 'REGISTERED',
        new_value: 'APPROVED',
        reason: 'Contract approved by ECTA for export compliance',
        metadata: JSON.stringify({
          contractId: 'CONTRACT1786364548810',
          approvedBy: 'admin',
          role: 'ADMIN',
          organization: 'ECTAMSP',
          action: 'Export Compliance Approval'
        }),
        ip_address: '127.0.0.1'
      },
      {
        entity_type: 'DOCUMENT',
        entity_id: 'DOC-1786364548834428406',
        action: 'VIEW',
        performed_by: 'admin',
        performed_by_org: 'ECTAMSP',
        old_value: 'N/A',
        new_value: 'VIEWED',
        reason: 'Document viewed: Gurmu_Demuma_Resume.pdf',
        metadata: JSON.stringify({
          documentId: 'DOC-1786364548834428406',
          fileName: 'Gurmu_Demuma_Resume.pdf',
          viewedBy: 'admin',
          role: 'ADMIN'
        }),
        ip_address: '127.0.0.1'
      },
      {
        entity_type: 'EXPORTER',
        entity_id: 'EXP3574583',
        action: 'CREATE',
        performed_by: 'admin',
        performed_by_org: 'ECTAMSP',
        old_value: 'N/A',
        new_value: 'ACTIVE',
        reason: 'Exporter approved and registered on blockchain',
        metadata: JSON.stringify({
          exporterId: 'EXP3574583',
          companyName: 'Sample Coffee Exporter',
          approvedBy: 'admin'
        }),
        ip_address: '127.0.0.1'
      },
      {
        entity_type: 'CONTRACT',
        entity_id: 'CONTRACT1786346872498',
        action: 'REJECT',
        performed_by: 'ecta_officer',
        performed_by_org: 'ECTAMSP',
        old_value: 'REGISTERED',
        new_value: 'REJECTED',
        reason: 'Price below minimum FOB requirement',
        metadata: JSON.stringify({
          contractId: 'CONTRACT1786346872498',
          rejectedBy: 'ecta_officer',
          role: 'ECTA Officer'
        }),
        ip_address: '192.168.1.100'
      },
      {
        entity_type: 'LC',
        entity_id: 'LC-2026-001',
        action: 'CREATE',
        performed_by: 'bank_officer',
        performed_by_org: 'BANKSMSP',
        old_value: 'N/A',
        new_value: 'ISSUED',
        reason: 'Letter of Credit issued for approved contract',
        metadata: JSON.stringify({
          lcNumber: 'LC-2026-001',
          issuedBy: 'bank_officer',
          amount: 370350000,
          currency: 'USD'
        }),
        ip_address: '192.168.1.50'
      }
    ];
    
    for (const log of sampleLogs) {
      await pool.query(
        `INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          log.entity_type,
          log.entity_id,
          log.action,
          log.performed_by,
          log.performed_by_org,
          log.old_value,
          log.new_value,
          log.reason,
          log.metadata,
          log.ip_address
        ]
      );
      console.log(`✅ Created ${log.action} log for ${log.entity_type} ${log.entity_id}`);
    }
    
    console.log(`\n✅ Created ${sampleLogs.length} sample audit logs successfully!`);
    
    // Verify
    const result = await pool.query('SELECT COUNT(*) FROM audit_trail');
    console.log(`\nTotal audit logs in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating sample logs:', error.message);
  } finally {
    await pool.end();
  }
}

createSampleLogs();
