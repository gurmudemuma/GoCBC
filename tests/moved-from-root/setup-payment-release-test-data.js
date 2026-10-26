/**
 * Setup test data for Payment Release feature
 * This creates LCs with proper status and customs clearance
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function setupTestData() {
  try {
    console.log('🔄 Setting up Payment Release test data...');
    
    // Step 1: Get an LC with documents
    const lcResult = await pool.query(`
      SELECT lc.lc_id, lc.contract_id, COUNT(d.document_id) as doc_count
      FROM letters_of_credit lc
      LEFT JOIN documents d ON d.entity_id = lc.lc_id AND d.entity_type = 'LC'
      GROUP BY lc.lc_id, lc.contract_id
      HAVING COUNT(d.document_id) > 0
      ORDER BY lc.created_at DESC
      LIMIT 1
    `);
    
    if (lcResult.rows.length === 0) {
      console.log('❌ No LCs with documents found. Please upload documents first.');
      process.exit(1);
    }
    
    const lc = lcResult.rows[0];
    console.log(`✅ Found LC: ${lc.lc_id} with ${lc.doc_count} documents`);
    
    // Step 2: Update LC status to UTILIZED
    await pool.query(`
      UPDATE letters_of_credit 
      SET status = 'UTILIZED',
          updated_at = CURRENT_TIMESTAMP
      WHERE lc_id = $1
    `, [lc.lc_id]);
    console.log(`✅ Updated LC status to UTILIZED`);
    
    // Step 3: Set all documents to verified status
    await pool.query(`
      UPDATE documents 
      SET status = 'verified',
          verification_status = 'verified',
          verified_at = CURRENT_TIMESTAMP,
          verified_by = 'bank_officer_test'
      WHERE entity_id = $1 AND entity_type = 'LC'
    `, [lc.lc_id]);
    console.log(`✅ Set all documents to verified`);
    
    // Step 4: Create or update customs declaration with CLEARED status
    // First, get the integer contract ID from export_contracts
    const contractResult = await pool.query(`
      SELECT id FROM export_contracts 
      WHERE contract_number = $1
      LIMIT 1
    `, [lc.contract_id]);
    
    let contractIntId;
    if (contractResult.rows.length > 0) {
      contractIntId = contractResult.rows[0].id;
      console.log(`✅ Found export_contracts ID: ${contractIntId}`);
    } else {
      console.log('⚠️  No export_contracts entry found, skipping customs');
      contractIntId = null;
    }
    
    if (contractIntId) {
      const customsCheck = await pool.query(`
        SELECT id FROM customs_declarations 
        WHERE contract_id = $1
      `, [contractIntId]);
      
      if (customsCheck.rows.length > 0) {
        // Update existing
        await pool.query(`
          UPDATE customs_declarations 
          SET status = 'cleared',
              clearance_date = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE contract_id = $1
        `, [contractIntId]);
        console.log(`✅ Updated existing customs declaration to CLEARED`);
      } else {
        // Create new
        await pool.query(`
          INSERT INTO customs_declarations (
            declaration_number, contract_id, customs_value_usd,
            status, clearance_date, created_at
          ) VALUES (
            $1, $2, 50000,
            'cleared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [`DECL-${Date.now()}`, contractIntId]);
        console.log(`✅ Created new customs declaration with CLEARED status`);
      }
    }
    
    // Step 5: Create approval workflow states for documents (mark as complete)
    const documents = await pool.query(`
      SELECT document_id, document_type 
      FROM documents 
      WHERE entity_id = $1 AND entity_type = 'LC'
    `, [lc.lc_id]);
    
    console.log(`\n🔐 Setting up approval workflows for ${documents.rows.length} documents...`);
    
    for (const doc of documents.rows) {
      // Check if approval requirement exists
      const reqResult = await pool.query(`
        SELECT min_approvers, required_roles 
        FROM approval_requirements 
        WHERE document_type = $1 AND entity_type = 'LC' AND active = true
      `, [doc.document_type]);
      
      if (reqResult.rows.length > 0) {
        const req = reqResult.rows[0];
        console.log(`  - ${doc.document_type}: requires ${req.min_approvers} approvals`);
        
        // Create workflow state marked as complete
        await pool.query(`
          INSERT INTO approval_workflow_state (
            document_id, document_type, entity_type,
            required_approvals, current_approvals,
            approval_status, approved_by, approved_by_roles,
            workflow_complete, completed_at, created_at
          ) VALUES (
            $1, $2, 'LC',
            $3, $3,
            'approved', ARRAY['officer1', 'officer2'], ARRAY['bank_officer', 'senior_bank_officer'],
            true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (document_id) DO UPDATE SET
            current_approvals = EXCLUDED.required_approvals,
            approval_status = 'approved',
            workflow_complete = true,
            completed_at = CURRENT_TIMESTAMP
        `, [doc.document_id, doc.document_type, req.min_approvers]);
        
        console.log(`    ✅ Workflow complete (${req.min_approvers}/${req.min_approvers})`);
      } else {
        console.log(`  - ${doc.document_type}: no approval requirement (single approval)`);
      }
    }
    
    console.log('\n✅ Test data setup complete!');
    console.log('\nSummary:');
    console.log(`  LC ID: ${lc.lc_id}`);
    console.log(`  Status: UTILIZED ✅`);
    console.log(`  Documents: ${lc.doc_count} (all verified) ✅`);
    console.log(`  Customs: CLEARED ✅`);
    console.log(`  Approvals: Complete ✅`);
    console.log('\n🎯 The LC should now appear in Payment Release tab!');
    console.log('\n📋 Next steps:');
    console.log('  1. Refresh the Banks Portal');
    console.log('  2. Navigate to Payment Release tab');
    console.log('  3. The LC should now be visible');
    console.log('  4. Click "Release Payment" to test the feature');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

setupTestData();
