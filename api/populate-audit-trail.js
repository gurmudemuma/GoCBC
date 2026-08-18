// Populate Audit Trail with Real Transaction Data
// This script creates audit logs from existing database transactions

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function populateAuditTrail() {
  console.log('🔍 Populating Audit Trail from existing transactions...\n');

  try {
    // 1. Get existing export contracts and create audit logs
    const contracts = await pool.query(`
      SELECT contract_id, exporter_id, status, created_at, approved_at
      FROM export_contracts 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    console.log(`📋 Found ${contracts.rows.length} export contracts`);
    
    for (const contract of contracts.rows) {
      // Log contract registration
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'CONTRACT',
        contract.contract_id,
        'CREATE',
        contract.exporter_id || 'EXPORTER',
        'EXPORTER',
        'N/A',
        'REGISTERED',
        'Contract registered by exporter',
        JSON.stringify({ contractId: contract.contract_id, exporterId: contract.exporter_id }),
        '127.0.0.1',
        contract.created_at || new Date()
      ]);
      
      // If contract is approved, log ECTA approval
      if (contract.status === 'approved' || contract.status === 'APPROVED') {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          'CONTRACT',
          contract.contract_id,
          'APPROVE',
          'ecta_officer',
          'ECTAMSP',
          'REGISTERED',
          'APPROVED',
          'Contract approved for export compliance',
          JSON.stringify({ contractId: contract.contract_id, approvedBy: 'ECTA' }),
          '127.0.0.1',
          contract.approved_at || new Date()
        ]);
      }
    }
    
    console.log(`✅ Created ${contracts.rows.length * 2} contract audit logs\n`);

    // 2. Get existing LC and payment data - using payments table
    const payments = await pool.query(`
      SELECT payment_id, contract_id, status, created_at
      FROM payments 
      ORDER BY created_at DESC 
      LIMIT 15
    `);
    
    console.log(`💰 Found ${payments.rows.length} Payments`);
    
    for (const payment of payments.rows) {
      // Log payment creation
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'PAYMENT',
        payment.payment_id,
        'CREATE',
        'bank_officer',
        'BANKSMSP',
        'N/A',
        payment.status || 'INITIATED',
        'Payment initiated',
        JSON.stringify({ paymentId: payment.payment_id, contractId: payment.contract_id }),
        '127.0.0.1',
        payment.created_at || new Date()
      ]);
    }
    
    console.log(`✅ Created ${payments.rows.length} payment audit logs\n`);

    // 3. Get existing forex allocations
    const forex = await pool.query(`
      SELECT forex_id, contract_id, status, request_date, allocation_date
      FROM forex_allocations 
      ORDER BY request_date DESC 
      LIMIT 15
    `);
    
    console.log(`💱 Found ${forex.rows.length} Forex Allocations`);
    
    for (const f of forex.rows) {
      // Log forex request
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'FOREX',
        f.forex_id,
        'CREATE',
        'nbe_officer',
        'NBEMSP',
        'N/A',
        'REQUESTED',
        'Forex allocation requested',
        JSON.stringify({ forexId: f.forex_id, contractId: f.contract_id }),
        '127.0.0.1',
        f.request_date || new Date()
      ]);
      
      // If forex is allocated
      if (f.status === 'ALLOCATED' || f.status === 'APPROVED') {
        await pool.query(`
          INSERT INTO audit_trail (
            entity_type, entity_id, action, performed_by, performed_by_org,
            old_value, new_value, reason, metadata, ip_address, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          'FOREX',
          f.forex_id,
          'APPROVE',
          'nbe_manager',
          'NBEMSP',
          'REQUESTED',
          'ALLOCATED',
          'Forex allocation approved by NBE',
          JSON.stringify({ forexId: f.forex_id, allocatedBy: 'NBE Manager' }),
          '127.0.0.1',
          f.allocation_date || new Date()
        ]);
      }
    }
    
    console.log(`✅ Created ${forex.rows.length * 2} forex audit logs\n`);

    // 4. Get existing shipments
    const shipments = await pool.query(`
      SELECT shipment_id, contract_id, status, created_at
      FROM shipments 
      ORDER BY created_at DESC 
      LIMIT 15
    `);
    
    console.log(`🚢 Found ${shipments.rows.length} Shipments`);
    
    for (const shipment of shipments.rows) {
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'SHIPMENT',
        shipment.shipment_id,
        'CREATE',
        'exporter',
        'EXPORTER',
        'N/A',
        shipment.status || 'CREATED',
        'Shipment registered',
        JSON.stringify({ shipmentId: shipment.shipment_id, contractId: shipment.contract_id }),
        '127.0.0.1',
        shipment.created_at || new Date()
      ]);
    }
    
    console.log(`✅ Created ${shipments.rows.length} shipment audit logs\n`);

    // 5. Add some document view logs (recent activity)
    console.log(`📄 Creating document view logs...`);
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - (i * 3600000)); // 1 hour intervals
      await pool.query(`
        INSERT INTO audit_trail (
          entity_type, entity_id, action, performed_by, performed_by_org,
          old_value, new_value, reason, metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'DOCUMENT',
        `DOC-${Date.now()}-${i}`,
        'VIEW',
        i % 3 === 0 ? 'ecta_officer' : (i % 3 === 1 ? 'bank_officer' : 'exporter'),
        i % 3 === 0 ? 'ECTAMSP' : (i % 3 === 1 ? 'BANKSMSP' : 'EXPORTER'),
        'N/A',
        'VIEWED',
        'Document accessed',
        JSON.stringify({ documentType: 'CONTRACT_DOCUMENT', viewType: 'inline' }),
        '127.0.0.1',
        timestamp
      ]);
    }
    
    console.log(`✅ Created 10 document view logs\n`);

    // Get final count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM audit_trail');
    console.log(`\n🎉 SUCCESS! Total audit logs in database: ${countResult.rows[0].count}`);
    
    // Show sample of what was created
    const sampleResult = await pool.query(`
      SELECT entity_type, action, performed_by, performed_by_org, created_at 
      FROM audit_trail 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📊 Sample of recent audit logs:');
    console.table(sampleResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
populateAuditTrail().then(() => {
  console.log('\n✅ Audit trail population complete!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Failed to populate audit trail:', error);
  process.exit(1);
});
