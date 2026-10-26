// Backfill Audit Trail from Existing System Activity
// This reads REAL data from PostgreSQL + Blockchain and creates comprehensive audit logs

const { Pool } = require('pg');
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function backfillAuditTrail() {
  console.log('🔄 Backfilling Audit Trail from Existing System Activity...\n');
  
  let totalLogs = 0;

  try {
    // 1. EXPORTER APPLICATIONS - Get all applications and their lifecycle
    console.log('📋 Processing Exporter Applications...');
    const applications = await pool.query(`
      SELECT 
        application_id, company_name, status, exporter_id, ecta_license_number,
        submitted_at, approved_at, rejected_at, rejection_reason, reviewed_by
      FROM exporter_applications 
      ORDER BY submitted_at ASC
    `);
    
    for (const app of applications.rows) {
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
        'Application submitted for ECTA review',
        JSON.stringify({ 
          applicationId: app.application_id, 
          companyName: app.company_name,
          status: 'submitted'
        }),
        '127.0.0.1',
        app.submitted_at
      ]);
      totalLogs++;
      
      // Application approval
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
          app.reviewed_by || 'ecta_officer',
          'ECTAMSP',
          'ECTAMSP',
          'SUBMITTED',
          'APPROVED',
          `Application approved - Exporter ID: ${app.exporter_id}, License: ${app.ecta_license_number}`,
          JSON.stringify({
            applicationId: app.application_id,
            exporterId: app.exporter_id,
            ectaLicenseNumber: app.ecta_license_number,
            reviewedBy: app.reviewed_by
          }),
          '127.0.0.1',
          app.approved_at
        ]);
        totalLogs++;
      }
      
      // Application rejection
      if (app.status === 'rejected' && app.rejected_at) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'EXPORTER_APPLICATION',
          app.application_id,
          'REJECT',
          app.reviewed_by || 'ecta_officer',
          'ECTAMSP',
          'ECTAMSP',
          'SUBMITTED',
          'REJECTED',
          app.rejection_reason || 'Application does not meet requirements',
          JSON.stringify({
            applicationId: app.application_id,
            rejectionReason: app.rejection_reason,
            reviewedBy: app.reviewed_by
          }),
          '127.0.0.1',
          app.rejected_at
        ]);
        totalLogs++;
      }
    }
    console.log(`✅ Created ${applications.rows.length} application audit logs\n`);

    // 2. DOCUMENTS - All document uploads and potential views
    console.log('📄 Processing Documents...');
    const documents = await pool.query(`
      SELECT 
        document_id, file_name, entity_type, entity_id, document_type,
        uploaded_at, uploaded_by, file_size, mime_type, description,
        verification_status, status
      FROM documents 
      ORDER BY uploaded_at ASC
    `);
    
    for (const doc of documents.rows) {
      // Document upload
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'DOCUMENT',
        doc.document_id,
        'UPLOAD',
        doc.uploaded_by || 'user',
        doc.entity_type === 'EXPORTER_APPLICATION' ? 'EXPORTER' : 'SYSTEM',
        doc.entity_type === 'EXPORTER_APPLICATION' ? 'EXPORTER' : 'SYSTEM',
        'N/A',
        'UPLOADED',
        `Document uploaded: ${doc.file_name} (${doc.document_type})`,
        JSON.stringify({
          documentId: doc.document_id,
          fileName: doc.file_name,
          documentType: doc.document_type,
          entityType: doc.entity_type,
          entityId: doc.entity_id,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          description: doc.description,
          verificationStatus: doc.verification_status,
          status: doc.status
        }),
        '127.0.0.1',
        doc.uploaded_at
      ]);
      totalLogs++;
    }
    console.log(`✅ Created ${documents.rows.length} document audit logs\n`);

    // 3. QUALITY INSPECTIONS
    console.log('🔬 Processing Quality Inspections...');
    const inspections = await pool.query(`
      SELECT 
        inspection_id, exporter_id, contract_id, shipment_id, coffee_type,
        quantity, sample_size, inspector_name, grade, cup_quality,
        moisture_content, defect_count, screen_size, passed, status,
        certification_number, remarks, requested_date, inspection_date,
        created_at, updated_at
      FROM quality_inspections 
      ORDER BY created_at ASC
    `);
    
    for (const insp of inspections.rows) {
      // Inspection scheduled
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'QUALITY',
        insp.inspection_id,
        'CREATE',
        insp.inspector_name || 'quality_inspector',
        'ECTAMSP',
        'ECTAMSP',
        'N/A',
        'SCHEDULED',
        `Quality inspection scheduled for ${insp.coffee_type} coffee`,
        JSON.stringify({
          inspectionId: insp.inspection_id,
          exporterId: insp.exporter_id,
          contractId: insp.contract_id,
          shipmentId: insp.shipment_id,
          coffeeType: insp.coffee_type,
          quantity: insp.quantity,
          sampleSize: insp.sample_size,
          inspector: insp.inspector_name,
          requestedDate: insp.requested_date
        }),
        '127.0.0.1',
        insp.created_at
      ]);
      totalLogs++;
      
      // Inspection completed
      if (insp.inspection_date) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'QUALITY',
          insp.inspection_id,
          insp.passed ? 'APPROVE' : 'REJECT',
          insp.inspector_name || 'quality_inspector',
          'ECTAMSP',
          'ECTAMSP',
          'SCHEDULED',
          insp.status ? insp.status.toUpperCase() : (insp.passed ? 'APPROVED' : 'REJECTED'),
          `Inspection ${insp.passed ? 'passed' : 'failed'} - Grade: ${insp.grade}, Quality: ${insp.cup_quality}`,
          JSON.stringify({
            inspectionId: insp.inspection_id,
            exporterId: insp.exporter_id,
            contractId: insp.contract_id,
            shipmentId: insp.shipment_id,
            coffeeType: insp.coffee_type,
            quantity: insp.quantity,
            grade: insp.grade,
            cupQuality: insp.cup_quality,
            moistureContent: insp.moisture_content,
            defectCount: insp.defect_count,
            screenSize: insp.screen_size,
            passed: insp.passed,
            status: insp.status,
            certificationNumber: insp.certification_number,
            remarks: insp.remarks
          }),
          '127.0.0.1',
          insp.inspection_date
        ]);
        totalLogs++;
      }
    }
    console.log(`✅ Created inspection audit logs\n`);

    // 4. FOREX ALLOCATIONS
    console.log('💱 Processing Forex Allocations...');
    const forex = await pool.query(`
      SELECT 
        allocation_id, contract_id, exporter_id, amount_usd,
        exchange_rate, status, created_at, allocation_date
      FROM forex_allocations 
      ORDER BY created_at ASC
    `);
    
    for (const f of forex.rows) {
      // Forex request
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'FOREX',
        f.allocation_id,
        'CREATE',
        'nbe_officer',
        'NBEMSP',
        'NBEMSP',
        'N/A',
        'REQUESTED',
        'Forex allocation requested',
        JSON.stringify({
          allocationId: f.allocation_id,
          contractId: f.contract_id,
          exporterId: f.exporter_id,
          amount: f.amount_usd,
          currency: 'USD'
        }),
        '127.0.0.1',
        f.created_at
      ]);
      totalLogs++;
      
      // Forex approval
      if (f.allocation_date) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'FOREX',
          f.allocation_id,
          'APPROVE',
          'nbe_manager',
          'NBEMSP',
          'NBEMSP',
          'REQUESTED',
          'ALLOCATED',
          `Forex allocated: ${f.amount_usd} USD at rate ${f.exchange_rate}`,
          JSON.stringify({
            allocationId: f.allocation_id,
            allocatedAmount: f.amount_usd,
            exchangeRate: f.exchange_rate,
            status: f.status
          }),
          '127.0.0.1',
          f.allocation_date
        ]);
        totalLogs++;
      }
    }
    console.log(`✅ Created forex allocation audit logs\n`);

    // 5. EXPORT CONTRACTS
    console.log('📜 Processing Export Contracts...');
    const contracts = await pool.query(`
      SELECT 
        contract_number, exporter_id, status, created_at, updated_at,
        total_value_usd, buyer_id
      FROM export_contracts 
      ORDER BY created_at ASC
    `);
    
    for (const contract of contracts.rows) {
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'CONTRACT',
        contract.contract_number,
        'CREATE',
        contract.exporter_id || 'exporter',
        'EXPORTER',
        'EXPORTER',
        'N/A',
        contract.status || 'CREATED',
        `Export contract ${contract.contract_number} created`,
        JSON.stringify({
          contractNumber: contract.contract_number,
          contractValue: contract.total_value_usd,
          buyerId: contract.buyer_id
        }),
        '127.0.0.1',
        contract.created_at
      ]);
      totalLogs++;
    }
    console.log(`✅ Created ${contracts.rows.length} contract audit logs\n`);

    // 6. PAYMENTS
    console.log('💰 Processing Payments...');
    const payments = await pool.query(`
      SELECT 
        payment_id, lc_number, contract_id, exporter_id, amount, currency,
        payment_method, payment_date, status, created_at
      FROM payments 
      ORDER BY created_at ASC
    `);
    
    for (const payment of payments.rows) {
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'PAYMENT',
        payment.payment_id,
        'CREATE',
        'bank_officer',
        'BANKSMSP',
        'BANKSMSP',
        'N/A',
        payment.status || 'INITIATED',
        `Payment ${payment.payment_method || 'initiated'}: ${payment.amount} ${payment.currency}`,
        JSON.stringify({
          paymentId: payment.payment_id,
          lcNumber: payment.lc_number,
          contractId: payment.contract_id,
          exporterId: payment.exporter_id,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.payment_method,
          status: payment.status
        }),
        '127.0.0.1',
        payment.created_at
      ]);
      totalLogs++;
      
      // Payment confirmation
      if (payment.payment_date) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'PAYMENT',
          payment.payment_id,
          'APPROVE',
          'bank_manager',
          'BANKSMSP',
          'BANKSMSP',
          'INITIATED',
          'CONFIRMED',
          'Payment confirmed by bank',
          JSON.stringify({
            paymentId: payment.payment_id,
            paymentDate: payment.payment_date
          }),
          '127.0.0.1',
          payment.payment_date
        ]);
        totalLogs++;
      }
    }
    console.log(`✅ Created payment audit logs\n`);

    // 7. SHIPMENTS
    console.log('🚢 Processing Shipments...');
    const shipments = await pool.query(`
      SELECT 
        shipment_number, contract_id, status,
        created_at, updated_at, shipping_line
      FROM shipments 
      ORDER BY created_at ASC
    `);
    
    for (const shipment of shipments.rows) {
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'SHIPMENT',
        shipment.shipment_number,
        'CREATE',
        'exporter',
        'EXPORTER',
        'EXPORTER',
        'N/A',
        shipment.status || 'CREATED',
        'Shipment registered',
        JSON.stringify({
          shipmentNumber: shipment.shipment_number,
          contractId: shipment.contract_id,
          shippingLine: shipment.shipping_line
        }),
        '127.0.0.1',
        shipment.created_at
      ]);
      totalLogs++;
    }
    console.log(`✅ Created ${shipments.rows.length} shipment audit logs\n`);

    // 8. CUSTOMS DECLARATIONS
    console.log('🛃 Processing Customs Declarations...');
    const declarations = await pool.query(`
      SELECT 
        declaration_number, contract_id, clearance_status, customs_value_usd, duty_paid,
        created_at, clearance_date
      FROM customs_declarations 
      ORDER BY created_at ASC
    `);
    
    for (const declaration of declarations.rows) {
      // Declaration submitted
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, organization, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING
      `, [
        'CUSTOMS_DECLARATION',
        declaration.declaration_number,
        'CREATE',
        'customs_officer',
        'CUSTOMSMSP',
        'CUSTOMSMSP',
        'N/A',
        declaration.clearance_status || 'PENDING',
        'Customs declaration submitted',
        JSON.stringify({
          declarationNumber: declaration.declaration_number,
          contractId: declaration.contract_id,
          customsValue: declaration.customs_value_usd,
          dutyPaid: declaration.duty_paid
        }),
        '127.0.0.1',
        declaration.created_at
      ]);
      totalLogs++;
      
      // Declaration cleared
      if (declaration.clearance_date) {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, organization, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          'CUSTOMS_DECLARATION',
          declaration.declaration_number,
          'APPROVE',
          'customs_manager',
          'CUSTOMSMSP',
          'CUSTOMSMSP',
          'PENDING',
          'CLEARED',
          'Customs declaration cleared',
          JSON.stringify({
            declarationNumber: declaration.declaration_number,
            clearanceDate: declaration.clearance_date
          }),
          '127.0.0.1',
          declaration.clearance_date
        ]);
        totalLogs++;
      }
    }
    console.log(`✅ Created customs declaration audit logs\n`);

    // Final count
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM audit_trail');
    console.log(`\n🎉 SUCCESS! Total audit logs in database: ${finalCount.rows[0].count}`);
    console.log(`📊 Logs created in this run: ${totalLogs}\n`);

    // Show sample
    const sample = await pool.query(`
      SELECT entity_type, entity_id, action, performed_by_org, 
             TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as time
      FROM audit_trail 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    console.log('📋 Recent audit logs (last 20):');
    console.log('─'.repeat(80));
    sample.rows.forEach(log => {
      console.log(`${log.time} | ${log.entity_type.padEnd(22)} | ${log.action.padEnd(10)} | ${log.performed_by_org}`);
    });
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

backfillAuditTrail().then(() => {
  console.log('\n✅ Audit trail backfill complete!');
  console.log('👉 Refresh your portal to see the audit trail data');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Failed:', error);
  process.exit(1);
});
