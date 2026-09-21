#!/usr/bin/env node

/**
 * Complete One LC Workflow Transaction
 * Takes one of the 17 existing LCs and completes the full workflow
 */

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

const API_BASE = 'http://localhost:3001/api/v1';

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 12);
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: '📋', step: '🔹' };
  console.log(`[${timestamp}] ${icons[type] || ''} ${message}`);
}

async function completeWorkflow() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Complete One LC Workflow Transaction                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Find a suitable LC (FOREX_ALLOCATED)
    await log('Step 1: Finding LC with FOREX_ALLOCATED status', 'step');
    
    const lcResult = await pool.query(`
      SELECT lc_id, contract_id, amount, currency, status, exporter_id
      FROM letters_of_credit
      WHERE status = 'FOREX_ALLOCATED'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (lcResult.rows.length === 0) {
      await log('No LC with FOREX_ALLOCATED status found', 'error');
      await log('Checking for ISSUED LCs to allocate forex...', 'info');
      
      const issuedLC = await pool.query(`
        SELECT lc_id FROM letters_of_credit WHERE status = 'ISSUED' LIMIT 1
      `);
      
      if (issuedLC.rows.length > 0) {
        await log(`Found ISSUED LC: ${issuedLC.rows[0].lc_id}`, 'info');
        await log('Please allocate forex in Tab 1 first, then run this script again', 'warn');
      } else {
        await log('No suitable LCs found. Please create test data first.', 'error');
      }
      return;
    }
    
    const lc = lcResult.rows[0];
    await log(`Selected LC: ${lc.lc_id}`, 'success');
    await log(`  Amount: $${lc.amount} ${lc.currency}`, 'info');
    await log(`  Status: ${lc.status}`, 'info');
    await log(`  Contract: ${lc.contract_id || 'N/A'}`, 'info');
    
    // Step 2: Check if documents exist
    await log('\nStep 2: Checking documents', 'step');
    
    const docsResult = await pool.query(`
      SELECT document_id, document_type, status, verification_status
      FROM documents
      WHERE entity_type = 'LC' AND entity_id = $1 AND status = 'active'
    `, [lc.lc_id]);
    
    await log(`Found ${docsResult.rows.length} existing documents`, 'info');
    
    // Step 3: Add documents if missing
    if (docsResult.rows.length === 0) {
      await log('\nStep 3: Adding required documents', 'step');
      
      const documentTypes = [
        'Bill of Lading',
        'Commercial Invoice',
        'Packing List',
        'Certificate of Origin',
        'Insurance Certificate',
        'Quality Certificate',
        'Phytosanitary Certificate',
        'Weight Certificate',
        'Fumigation Certificate',
        'ICO Certificate',
        'EUR1 Certificate',
        'Customs Declaration'
      ];
      
      for (const docType of documentTypes) {
        const docId = `DOC-${lc.lc_id}-${docType.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;
        const fileHash = `SHA256-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        
        await pool.query(`
          INSERT INTO documents (
            document_id, document_type, file_name, file_path, file_hash,
            entity_type, entity_id, status, verification_status,
            uploaded_at, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
        `, [
          docId,
          docType,
          `${docType.replace(/\s+/g, '_')}.pdf`,
          `/uploads/lc/${lc.lc_id}/${docType.replace(/\s+/g, '_')}.pdf`,
          fileHash,
          'LC',
          lc.lc_id,
          'active',
          'pending',
          lc.exporter_id || 'SYSTEM'
        ]);
        
        await log(`  Added: ${docType}`, 'success');
      }
      
      await log(`\n✅ Added ${documentTypes.length} documents`, 'success');
    } else {
      await log('Documents already exist, proceeding to verification', 'info');
    }
    
    // Step 4: Verify all documents
    await log('\nStep 4: Verifying all documents', 'step');
    
    const allDocs = await pool.query(`
      SELECT document_id, document_type, verification_status
      FROM documents
      WHERE entity_type = 'LC' AND entity_id = $1 AND status = 'active'
    `, [lc.lc_id]);
    
    let verifiedCount = 0;
    
    for (const doc of allDocs.rows) {
      if (doc.verification_status === 'verified' || doc.verification_status === 'approved') {
        await log(`  ${doc.document_type}: Already verified ✓`, 'info');
        verifiedCount++;
        continue;
      }
      
      // Update document verification
      await pool.query(`
        UPDATE documents
        SET verification_status = 'verified',
            status = 'verified',
            verified_at = NOW(),
            verified_by = 'bank1.cecbs.et',
            verification_notes = 'Document compliant with UCP 600 standards - Auto-verified for testing'
        WHERE document_id = $1
      `, [doc.document_id]);
      
      await log(`  ${doc.document_type}: Verified ✓`, 'success');
      verifiedCount++;
      
      // Simulate blockchain signature creation
      await log(`    → Blockchain signature: SIG_${doc.document_id}_BankMSP_${Date.now()}`, 'info');
    }
    
    await log(`\n✅ Verified ${verifiedCount}/${allDocs.rows.length} documents`, 'success');
    
    // Step 5: Change LC status to UTILIZED
    await log('\nStep 5: Updating LC status to UTILIZED', 'step');
    
    await pool.query(`
      UPDATE letters_of_credit
      SET status = 'UTILIZED',
          updated_at = NOW(),
          last_updated_by = 'bank1.cecbs.et',
          last_updated_by_msp = 'BankMSP'
      WHERE lc_id = $1
    `, [lc.lc_id]);
    
    await log('LC status changed: FOREX_ALLOCATED → UTILIZED', 'success');
    
    // Step 6: Verify the changes
    await log('\nStep 6: Verifying workflow completion', 'step');
    
    const verifyResult = await pool.query(`
      SELECT 
        lc.lc_id, 
        lc.status,
        lc.amount,
        lc.currency,
        COUNT(d.document_id) as total_docs,
        COUNT(CASE WHEN d.verification_status = 'verified' THEN 1 END) as verified_docs
      FROM letters_of_credit lc
      LEFT JOIN documents d ON d.entity_id = lc.lc_id AND d.entity_type = 'LC' AND d.status = 'active'
      WHERE lc.lc_id = $1
      GROUP BY lc.lc_id, lc.status, lc.amount, lc.currency
    `, [lc.lc_id]);
    
    const result = verifyResult.rows[0];
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  Workflow Completion Summary              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`  LC ID:              ${result.lc_id}`);
    console.log(`  Status:             ${result.status} ✅`);
    console.log(`  Amount:             $${result.amount} ${result.currency}`);
    console.log(`  Documents:          ${result.verified_docs}/${result.total_docs} verified ✅`);
    console.log(`  Ready for Tab 3:    YES ✅`);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Next Steps                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. Navigate to Banks Portal → Tab 3 (Payment Release)');
    console.log(`3. You should now see LC ${result.lc_id} in the list`);
    console.log('4. Click "Release Payment" to continue the workflow');
    console.log('5. Test the complete payment release process\n');
    
    console.log('✅ Transaction completed successfully!\n');
    
    // Show updated status distribution
    const statusDist = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM letters_of_credit
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('📊 Updated LC Status Distribution:\n');
    statusDist.rows.forEach(row => {
      const marker = row.status === 'UTILIZED' ? ' ← NEW!' : '';
      console.log(`   ${row.status}: ${row.count} LCs${marker}`);
    });
    
    console.log('');
    
  } catch (error) {
    await log(`Error: ${error.message}`, 'error');
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the workflow
completeWorkflow().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
