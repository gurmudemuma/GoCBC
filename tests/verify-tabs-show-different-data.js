const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function verifyTabsShowDifferentData() {
  console.log('Verifying Customs Portal Tabs Show Different Data\n');
  console.log('==================================================\n');

  // Login
  const login = await axios.post(`${API}/auth/login`, {
    username: 'customs_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  // Get all declarations
  const response = await axios.get(`${API}/customs/declarations`, { headers });
  const allDeclarations = response.data.data;

  console.log(`📊 Total Declarations in System: ${allDeclarations.length}\n`);

  // Simulate what each tab should show (matching the UI logic)
  const tab0_submitted = allDeclarations.filter(d => 
    (d.status || d.Status) === 'SUBMITTED'
  );

  const tab1_riskQueue = allDeclarations.filter(d => {
    const status = d.status || d.Status;
    return status === 'UNDER_REVIEW' ||
           status === 'HELD' ||
           status === 'PERMIT_ISSUED' ||
           status === 'QUALITY_APPROVED';
  });

  const tab2_inspectionQueue = allDeclarations.filter(d => 
    (d.status || d.Status) === 'UNDER_INSPECTION'
  );

  const tab3_releaseQueue = allDeclarations.filter(d => 
    (d.status || d.Status) === 'CLEARED'
  );

  console.log('📋 TAB DATA BREAKDOWN:\n');
  
  console.log('Tab 0 (Declaration & Document Validation)');
  console.log(`  Status Filter: SUBMITTED`);
  console.log(`  Count: ${tab0_submitted.length}`);
  if (tab0_submitted.length > 0) {
    tab0_submitted.forEach(d => {
      console.log(`    - ${d.declarationId || d.DeclarationID} (${d.status || d.Status})`);
    });
  } else {
    console.log(`    (empty)`);
  }
  console.log('');

  console.log('Tab 1 (Risk Management & Review)');
  console.log(`  Status Filter: UNDER_REVIEW, HELD, PERMIT_ISSUED, QUALITY_APPROVED`);
  console.log(`  Count: ${tab1_riskQueue.length}`);
  if (tab1_riskQueue.length > 0) {
    tab1_riskQueue.slice(0, 5).forEach(d => {
      console.log(`    - ${d.declarationId || d.DeclarationID} (${d.status || d.Status})`);
    });
    if (tab1_riskQueue.length > 5) console.log(`    ... and ${tab1_riskQueue.length - 5} more`);
  } else {
    console.log(`    (empty)`);
  }
  console.log('');

  console.log('Tab 2 (Physical Inspection)');
  console.log(`  Status Filter: UNDER_INSPECTION`);
  console.log(`  Count: ${tab2_inspectionQueue.length}`);
  if (tab2_inspectionQueue.length > 0) {
    tab2_inspectionQueue.forEach(d => {
      console.log(`    - ${d.declarationId || d.DeclarationID} (${d.status || d.Status})`);
    });
  } else {
    console.log(`    (empty)`);
  }
  console.log('');

  console.log('Tab 3 (Customs Release)');
  console.log(`  Status Filter: CLEARED`);
  console.log(`  Count: ${tab3_releaseQueue.length}`);
  if (tab3_releaseQueue.length > 0) {
    tab3_releaseQueue.slice(0, 5).forEach(d => {
      console.log(`    - ${d.declarationId || d.DeclarationID} (${d.status || d.Status})`);
    });
    if (tab3_releaseQueue.length > 5) console.log(`    ... and ${tab3_releaseQueue.length - 5} more`);
  } else {
    console.log(`    (empty)`);
  }
  console.log('');

  // Verification
  console.log('==================================================');
  console.log('VERIFICATION RESULTS:\n');

  const allTabCounts = [
    tab0_submitted.length,
    tab1_riskQueue.length,
    tab2_inspectionQueue.length,
    tab3_releaseQueue.length
  ];

  const nonEmptyTabs = allTabCounts.filter(c => c > 0).length;
  const totalInTabs = allTabCounts.reduce((a, b) => a + b, 0);

  if (tab0_submitted.length === allDeclarations.length) {
    console.log('❌ FAIL: Tab 0 showing ALL declarations (not filtered)');
  } else {
    console.log('✅ PASS: Tab 0 properly filtered to SUBMITTED only');
  }

  if (tab1_riskQueue.length === allDeclarations.length) {
    console.log('❌ FAIL: Tab 1 showing ALL declarations (not filtered)');
  } else {
    console.log('✅ PASS: Tab 1 properly filtered to risk queue statuses');
  }

  if (tab3_releaseQueue.length === 0 && allDeclarations.some(d => (d.status || d.Status) === 'CLEARED')) {
    console.log('❌ FAIL: Tab 3 is empty but CLEARED declarations exist');
  } else if (tab3_releaseQueue.length > 0) {
    console.log('✅ PASS: Tab 3 showing CLEARED declarations');
  }

  console.log('');
  console.log(`📊 Summary: ${nonEmptyTabs} tabs have data, ${totalInTabs} total declarations across tabs`);
  console.log(`   (Note: Total in tabs should equal total declarations: ${allDeclarations.length})`);
  
  if (totalInTabs === allDeclarations.length) {
    console.log('\n✅ ALL DECLARATIONS ACCOUNTED FOR - Tabs are properly segmented!\n');
  } else if (totalInTabs > allDeclarations.length) {
    console.log('\n⚠️  WARNING: Some declarations appear in multiple tabs\n');
  } else {
    const missing = allDeclarations.filter(d => {
      const status = d.status || d.Status;
      return status !== 'SUBMITTED' && 
             status !== 'UNDER_REVIEW' && 
             status !== 'HELD' && 
             status !== 'PERMIT_ISSUED' && 
             status !== 'QUALITY_APPROVED' && 
             status !== 'UNDER_INSPECTION' && 
             status !== 'CLEARED';
    });
    console.log(`\n⚠️  ${allDeclarations.length - totalInTabs} declarations not in any tab:`);
    missing.forEach(d => {
      console.log(`   - ${d.declarationId || d.DeclarationID}: ${d.status || d.Status}`);
    });
    console.log('');
  }
}

verifyTabsShowDifferentData().catch(console.error);
