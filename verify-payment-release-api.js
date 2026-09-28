#!/usr/bin/env node
/**
 * Verify Payment Release Data from API
 * Direct database check to see what API should return
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function verifyPaymentRelease() {
  try {
    console.log('🔍 Verifying Payment Release Conditions for LC1789460822330\n');
    
    // 1. Check LC Status
    const lc = await pool.query(
      `SELECT lc_id, status, contract_id FROM letters_of_credit WHERE lc_id = $1`,
      ['LC1789460822330']
    );
    
    if (lc.rows.length === 0) {
      console.log('❌ LC not found!');
      await pool.end();
      return;
    }
    
    const lcData = lc.rows[0];
    console.log('📋 LC Status Check:');
    console.log(`  LC ID: ${lcData.lc_id}`);
    console.log(`  Status: ${lcData.status}`);
    console.log(`  Status is UTILIZED: ${lcData.status === 'UTILIZED' ? '✅' : '❌'}`);
    console.log(`  Contract ID: ${lcData.contract_id}\n`);
    
    // 2. Check Contract and get numeric ID
    const contract = await pool.query(
      `SELECT id FROM export_contracts WHERE contract_number = $1`,
      [lcData.contract_id]
    );
    
    let contractNumericId = null;
    if (contract.rows.length > 0) {
      contractNumericId = contract.rows[0].id;
      console.log(`📦 Contract: ${lcData.contract_id} → ID ${contractNumericId}\n`);
    } else {
      console.log(`❌ Contract not found: ${lcData.contract_id}\n`);
    }
    
    // 3. Check Customs Clearance
    if (contractNumericId) {
      const customs = await pool.query(
        `SELECT declaration_number, status, clearance_date 
         FROM customs_declarations 
         WHERE contract_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [contractNumericId]
      );
      
      console.log('🚢 Customs Clearance Check:');
      if (customs.rows.length > 0) {
        const customsData = customs.rows[0];
        console.log(`  Declaration: ${customsData.declaration_number}`);
        console.log(`  Status: ${customsData.status}`);
        console.log(`  Cleared: ${customsData.status === 'CLEARED' || customsData.status === 'cleared' ? '✅' : '❌'}`);
        console.log(`  Date: ${customsData.clearance_date}\n`);
      } else {
        console.log('  ❌ No customs declaration found\n');
      }
    }
    
    // 4. Check Documents
    const docs = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified,
              COUNT(CASE WHEN verification_status IN ('verified', 'approved', 'compliant') THEN 1 END) as approved
       FROM documents 
       WHERE entity_type = 'LC' AND entity_id = $1`,
      [lcData.lc_id]
    );
    
    if (docs.rows.length > 0) {
      const docData = docs.rows[0];
      console.log('📄 Documents Check:');
      console.log(`  Total: ${docData.total}`);
      console.log(`  Verified: ${docData.verified}`);
      console.log(`  Approved/Compliant: ${docData.approved}`);
      console.log(`  All verified: ${docData.total > 0 && docData.approved === docData.total ? '✅' : '❌'}\n`);
    }
    
    // 5. Check Multi-Party Approvals
    const approvals = await pool.query(
      `SELECT d.document_id, d.document_type, d.verification_status,
              a.required_approvals, a.current_approvals, a.approval_status
       FROM documents d
       LEFT JOIN approval_workflow_state a ON d.document_id = a.document_id
       WHERE d.entity_type = 'LC' AND d.entity_id = $1 
         AND a.required_approvals > 1
       LIMIT 5`,
      [lcData.lc_id]
    );
    
    console.log('🔐 Multi-Party Approval Check:');
    if (approvals.rows.length > 0) {
      console.log(`  Documents requiring approval: ${approvals.rows.length}`);
      approvals.rows.forEach((a, i) => {
        const complete = a.current_approvals >= a.required_approvals;
        console.log(`  ${i+1}. ${a.document_type}: ${a.current_approvals}/${a.required_approvals} ${complete ? '✅' : '❌'}`);
      });
    } else {
      console.log('  ✅ No multi-party approvals required (or all complete)\n');
    }
    
    // 6. Final Verdict
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PAYMENT RELEASE QUALIFICATION SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const checks = {
      lcStatus: lcData.status === 'UTILIZED',
      hasDocs: docs.rows[0]?.total > 0,
      docsVerified: docs.rows[0]?.total > 0 && docs.rows[0]?.approved === docs.rows[0]?.total,
      customsCleared: false
    };
    
    if (contractNumericId) {
      const customsCheck = await pool.query(
        `SELECT status FROM customs_declarations WHERE contract_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [contractNumericId]
      );
      if (customsCheck.rows.length > 0) {
        const status = customsCheck.rows[0].status;
        checks.customsCleared = status === 'CLEARED' || status === 'cleared';
      }
    }
    
    console.log(`  ✓ LC Status = UTILIZED: ${checks.lcStatus ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Has Documents: ${checks.hasDocs ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ All Docs Verified: ${checks.docsVerified ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Customs Cleared: ${checks.customsCleared ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPass = checks.lcStatus && checks.hasDocs && checks.docsVerified && checks.customsCleared;
    console.log('\n' + (allPass ? '🎉 SHOULD APPEAR IN PAYMENT RELEASE TAB!' : '⚠️  WILL NOT APPEAR IN PAYMENT RELEASE TAB'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

verifyPaymentRelease();
