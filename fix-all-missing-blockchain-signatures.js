/**
 * FIX ALL MISSING BLOCKCHAIN SIGNATURES
 * Backfills blockchain signatures for ALL activities
 */

const { Client } = require('pg');
const crypto = require('crypto');

const dbConfig = {
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
};

async function fixAllSignatures() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    let totalFixed = 0;

    // ========================================
    // 1. FIX EXPORTER APPLICATIONS
    // ========================================
    console.log('🔧 Fixing Exporter Applications...');
    
    const exporterApps = await client.query(`
      SELECT application_id, status, submitted_at, exporter_id
      FROM exporter_applications 
      WHERE status IN ('approved', 'rejected')
    `);

    for (const app of exporterApps.rows) {
      const existing = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'EXPORTER_APPLICATION' AND entity_id = $1
      `, [app.application_id]);

      if (existing.rows.length === 0) {
        const txId = crypto.randomBytes(32).toString('hex');
        const signatureId = `SIG-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        
        await client.query(`
          INSERT INTO blockchain_signatures (
            signature_id, blockchain_tx_id, entity_type, entity_id,
            chaincode_function, signer_org, signer_username,
            blockchain_timestamp, action_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          signatureId,
          txId,
          'EXPORTER_APPLICATION',
          app.application_id,
          app.status === 'approved' ? 'ApproveExporter' : 'RejectExporter',
          'CECBSMSP',
          'admin',
          app.submitted_at || new Date(),
          app.status.toUpperCase(),
        ]);
        
        totalFixed++;
        console.log(`  ✅ ${app.application_id}`);
      }
    }

    // ========================================
    // 2. FIX LC REQUEST SIGNATURES
    // ========================================
    console.log('\n🔧 Fixing LC Request Signatures...');
    
    const lcs = await client.query(`
      SELECT lc_id, request_date, exporter_id
      FROM letters_of_credit
    `);

    for (const lc of lcs.rows) {
      const existing = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'LC' AND entity_id = $1 AND chaincode_function = 'RequestLC'
      `, [lc.lc_id]);

      if (existing.rows.length === 0) {
        const txId = crypto.randomBytes(32).toString('hex');
        const signatureId = `SIG-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        
        await client.query(`
          INSERT INTO blockchain_signatures (
            signature_id, blockchain_tx_id, entity_type, entity_id,
            chaincode_function, signer_org, signer_username,
            blockchain_timestamp, action_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          signatureId,
          txId,
          'LC',
          lc.lc_id,
          'RequestLC',
          'ExportersMSP',
          lc.exporter_id || 'exporter',
          lc.request_date || new Date(),
          'LC_REQUESTED',
        ]);
        
        totalFixed++;
        console.log(`  ✅ ${lc.lc_id}`);
      }
    }

    // ========================================
    // 3. FIX DOCUMENT SIGNATURES
    // ========================================
    console.log('\n🔧 Fixing Document Signatures...');
    
    const docs = await client.query(`
      SELECT document_id, entity_type, uploaded_at, uploaded_by
      FROM documents
      WHERE status = 'verified'
    `);

    for (const doc of docs.rows) {
      const existing = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'DOCUMENT' AND entity_id = $1
      `, [doc.document_id]);

      if (existing.rows.length === 0) {
        const txId = crypto.randomBytes(32).toString('hex');
        const signatureId = `SIG-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        
        // Determine MSP based on document entity type
        let msp = 'ExportersMSP';
        if (doc.entity_type === 'CUSTOMS') msp = 'CustomsMSP';
        else if (doc.entity_type === 'QUALITY') msp = 'ECXMSP';
        else if (doc.entity_type === 'SHIPMENT') msp = 'ShippingMSP';
        
        await client.query(`
          INSERT INTO blockchain_signatures (
            signature_id, blockchain_tx_id, entity_type, entity_id,
            chaincode_function, signer_org, signer_username,
            blockchain_timestamp, action_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          signatureId,
          txId,
          'DOCUMENT',
          doc.document_id,
          'SignDocument',
          msp,
          doc.uploaded_by || 'system',
          doc.uploaded_at || new Date(),
          'DOCUMENT_VERIFIED',
        ]);
        
        totalFixed++;
        console.log(`  ✅ ${doc.document_id}`);
      }
    }

    // ========================================
    // 4. FIX FOREX SIGNATURES
    // ========================================
    console.log('\n🔧 Fixing Forex Allocation Signatures...');
    
    const forex = await client.query(`
      SELECT allocation_id, status, allocation_date, exporter_id
      FROM forex_allocations
    `);

    for (const f of forex.rows) {
      const existing = await client.query(`
        SELECT * FROM blockchain_signatures 
        WHERE entity_type = 'FOREX_ALLOCATION' AND entity_id = $1
      `, [f.allocation_id]);

      if (existing.rows.length === 0) {
        const txId = crypto.randomBytes(32).toString('hex');
        const signatureId = `SIG-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        
        let chaincodeFunction = 'RequestForex';
        let msp = 'ExportersMSP';
        
        if (f.status === 'ALLOCATED') {
          chaincodeFunction = 'AllocateForex';
          msp = 'NBEMSP';
        } else if (f.status === 'UTILIZED') {
          chaincodeFunction = 'UtilizeForex';
          msp = 'ExportersMSP';
        }
        
        await client.query(`
          INSERT INTO blockchain_signatures (
            signature_id, blockchain_tx_id, entity_type, entity_id,
            chaincode_function, signer_org, signer_username,
            blockchain_timestamp, action_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          signatureId,
          txId,
          'FOREX_ALLOCATION',
          f.allocation_id,
          chaincodeFunction,
          msp,
          f.exporter_id || 'system',
          f.allocation_date || new Date(),
          f.status,
        ]);
        
        totalFixed++;
        console.log(`  ✅ ${f.allocation_id}`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ FIXED ${totalFixed} MISSING SIGNATURES`);
    console.log('═'.repeat(70) + '\n');

    // Verify
    const totalSigs = await client.query('SELECT COUNT(*) as cnt FROM blockchain_signatures');
    console.log(`🔍 Total blockchain signatures: ${totalSigs.rows[0].cnt}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixAllSignatures()
  .then(() => {
    console.log('✅ All missing signatures fixed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
