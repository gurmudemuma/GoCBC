#!/usr/bin/env node
/**
 * Test Frontend Payment Release Filter Logic
 * Simulates exact frontend filter to debug why LC isn't showing
 */

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function testFilter() {
  try {
    console.log('🔍 Simulating Frontend Payment Release Filter\n');
    
    // Step 1: Get LC from blockchain (simulating API call)
    console.log('Step 1: Checking blockchain LC status...');
    const { execSync } = require('child_process');
    const lcJson = execSync('curl -s -u admin:adminpw http://localhost:5984/coffeechannel_coffee/LC_LC1789460822330', { encoding: 'utf8' });
    const lcData = JSON.parse(lcJson);
    
    console.log(`  LC ID: ${lcData.lcId}`);
    console.log(`  Status: ${lcData.status}`);
    console.log(`  ✓ Status === 'UTILIZED': ${lcData.status === 'UTILIZED' ? '✅' : '❌'}\n`);
    
    if (lcData.status !== 'UTILIZED') {
      console.log('❌ FAIL: LC status is not UTILIZED');
      console.log(`   Current status: ${lcData.status}`);
      console.log('   Expected: UTILIZED\n');
      await pool.end();
      return;
    }
    
    // Step 2: Get documents from PostgreSQL
    console.log('Step 2: Checking documents...');
    const docs = await pool.query(`
      SELECT document_id, document_type, verification_status, status
      FROM documents 
      WHERE entity_type = 'LC' AND entity_id = $1
    `, ['LC1789460822330']);
    
    console.log(`  Total documents: ${docs.rows.length}`);
    
    if (docs.rows.length === 0) {
      console.log('❌ FAIL: No documents found\n');
      await pool.end();
      return;
    }
    
    // Step 3: Check if all documents are verified (mimicking frontend logic)
    console.log('\\nStep 3: Checking document verification (Frontend Logic)...');
    const allDocsVerified = docs.rows.every(d => {
      const docStatus = d.verification_status || d.status || '';
      const isVerified = docStatus === 'verified' || docStatus === 'approved' || docStatus === 'compliant';
      
      if (!isVerified) {
        console.log(`  ❌ Doc ${d.document_type}: status='${docStatus}' (NOT verified)`);
      }
      
      return isVerified;
    });
    
    console.log(`  ✓ All docs verified: ${allDocsVerified ? '✅' : '❌'}`);
    
    if (!allDocsVerified) {
      console.log('\\n❌ FAIL: Not all documents are verified\n');
      await pool.end();
      return;
    }
    
    // Step 4: Check approval workflows
    console.log('\\nStep 4: Checking multi-party approvals...');
    const approvalsNeeded = await pool.query(`
      SELECT d.document_id, d.document_type,
             a.required_approvals, a.current_approvals
      FROM documents d
      LEFT JOIN approval_workflow_state a ON d.document_id = a.document_id
      WHERE d.entity_type = 'LC' AND d.entity_id = $1
        AND a.required_approvals > 1
    `, ['LC1789460822330']);
    
    if (approvalsNeeded.rows.length > 0) {
      console.log(`  Documents requiring multi-party approval: ${approvalsNeeded.rows.length}`);
      let allApprovalsComplete = true;
      
      approvalsNeeded.rows.forEach(a => {
        const complete = a.current_approvals >= a.required_approvals;
        console.log(`    ${a.document_type}: ${a.current_approvals}/${a.required_approvals} ${complete ? '✅' : '❌'}`);
        if (!complete) allApprovalsComplete = false;
      });
      
      if (!allApprovalsComplete) {
        console.log('\\n❌ FAIL: Pending approvals exist\n');
        await pool.end();
        return;
      }
    } else {
      console.log('  ✅ No multi-party approvals required');
    }
    
    // Step 5: Check customs clearance
    console.log('\\nStep 5: Checking customs clearance...');
    const contract = await pool.query(`
      SELECT id FROM export_contracts WHERE contract_number = $1
    `, ['CONTRACT1789460822330']);
    
    if (contract.rows.length === 0) {
      console.log('  ❌ Contract not found');
      await pool.end();
      return;
    }
    
    const customs = await pool.query(`
      SELECT status FROM customs_declarations 
      WHERE contract_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [contract.rows[0].id]);
    
    if (customs.rows.length === 0) {
      console.log('  ❌ FAIL: No customs declaration found\n');
      await pool.end();
      return;
    }
    
    const customsStatus = customs.rows[0].status;
    const customsCleared = customsStatus === 'CLEARED' || customsStatus === 'cleared';
    console.log(`  Customs status: ${customsStatus}`);
    console.log(`  ✓ Customs cleared: ${customsCleared ? '✅' : '❌'}`);
    
    if (!customsCleared) {
      console.log(`\\n❌ FAIL: Customs not cleared (status: ${customsStatus})\n`);
      await pool.end();
      return;
    }
    
    // Final verdict
    console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL CHECKS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 LC1789460822330 SHOULD appear in Payment Release tab');
    console.log('\\nIf it\'s still not showing, the issue is in:');
    console.log('  1. API not enriching data correctly');
    console.log('  2. Frontend not receiving enriched data');
    console.log('  3. Browser cache needs clearing\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

testFilter();
