// Diagnostic script to check Banks Portal data availability
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function diagnose() {
  console.log('\n=== Banks Portal Data Diagnostic ===\n');
  
  try {
    // Step 1: Login as bank user
    console.log('Step 1: Logging in as bank user...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'bank_admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    if (!token) {
      console.log('❌ Login failed - no token received');
      console.log('Trying alternative credentials...');
      
      // Try alternative bank user
      const alt = await axios.post(`${API_BASE}/auth/login`, {
        username: 'bank_officer',
        password: 'password123'
      });
      
      if (!alt.data.token && !alt.data.data?.token) {
        console.log('❌ Could not login with any bank credentials');
        console.log('\nAvailable test users:');
        console.log('- bank_admin / password123');
        console.log('- bank_officer / password123');
        console.log('- Try logging in manually first to confirm credentials');
        return;
      }
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Logged in successfully\n');
    
    // Step 2: Fetch all LCs
    console.log('Step 2: Fetching all LCs from API...');
    const lcsResponse = await axios.get(`${API_BASE}/banking/lc`, { headers });
    
    const lcs = lcsResponse.data.data?.lcs || lcsResponse.data.data || lcsResponse.data.lcs || [];
    
    if (lcs.length === 0) {
      console.log('❌ No LCs found in system!');
      console.log('\n🔧 Solution: You need to create test data');
      console.log('Run: cd api && node create-test-data-exp4886039.js');
      return;
    }
    
    console.log(`✅ Found ${lcs.length} total LCs\n`);
    
    // Step 3: Analyze LC statuses
    console.log('Step 3: Analyzing LC statuses...\n');
    
    const byStatus = {};
    lcs.forEach(lc => {
      const status = lc.status || 'UNKNOWN';
      if (!byStatus[status]) {
        byStatus[status] = [];
      }
      byStatus[status].push(lc);
    });
    
    // Display status breakdown
    console.log('📊 LC Status Breakdown:\n');
    Object.keys(byStatus).sort().forEach(status => {
      const count = byStatus[status].length;
      console.log(`  ${status}: ${count} LCs`);
      
      if (count <= 3) {
        byStatus[status].forEach(lc => {
          const docCount = (lc.documents || []).length;
          console.log(`    - ${lc.lcId}: ${lc.exporterName || lc.exporterId} ($${lc.amount} ${lc.currency}, ${docCount} docs)`);
        });
      }
    });
    
    // Step 4: Check Tab 2 (Document Examination) data
    console.log('\n\n=== Tab 2: Document Examination ===\n');
    
    const forExamination = lcs.filter(lc => 
      ['FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status)
    );
    
    console.log(`Filter: ['FOREX_ALLOCATED', 'UTILIZED']`);
    console.log(`Result: ${forExamination.length} LCs\n`);
    
    if (forExamination.length === 0) {
      console.log('⚠️  No LCs for Tab 2!');
      console.log('You need LCs with status FOREX_ALLOCATED or UTILIZED');
      console.log('\nTo get LCs in FOREX_ALLOCATED status:');
      console.log('1. Go to Tab 1 (Forex Allocation)');
      console.log('2. Allocate forex for an ISSUED LC');
    } else {
      console.log('✅ Tab 2 has data:\n');
      forExamination.forEach(lc => {
        const docs = lc.documents || [];
        const verified = docs.filter(d => d.status === 'verified' || d.verificationStatus === 'verified').length;
        console.log(`  ${lc.lcId} (${lc.status}): ${verified}/${docs.length} docs verified`);
      });
    }
    
    // Step 5: Check Tab 3 (Payment Release) data
    console.log('\n\n=== Tab 3: Payment Release ===\n');
    
    const forPayment = lcs.filter(lc => {
      // Must have documents
      if (!lc.documents || lc.documents.length === 0) return false;
      
      // Must be UTILIZED
      if (lc.status !== 'UTILIZED') return false;
      
      // All documents must be verified
      const allDocsVerified = lc.documents.every(d => 
        d.status === 'verified' || 
        d.status === 'approved' || 
        d.status === 'compliant' ||
        d.verificationStatus === 'verified' ||
        d.verificationStatus === 'approved' ||
        d.verificationStatus === 'compliant'
      );
      
      return allDocsVerified;
    });
    
    console.log(`Filter: status === 'UTILIZED' AND all docs verified`);
    console.log(`Result: ${forPayment.length} LCs\n`);
    
    if (forPayment.length === 0) {
      console.log('❌ No LCs ready for payment release!');
      console.log('\n🔧 Why Tab 3 shows "No data":');
      
      const utilized = byStatus['UTILIZED'] || [];
      
      if (utilized.length === 0) {
        console.log('\n1. No LCs with status UTILIZED');
        console.log('   → You need to examine documents in Tab 2 first');
        console.log('   → After all docs are verified, LC status changes to UTILIZED');
      } else {
        console.log(`\n1. Found ${utilized.length} LCs with UTILIZED status:`);
        utilized.forEach(lc => {
          const docs = lc.documents || [];
          if (docs.length === 0) {
            console.log(`   ❌ ${lc.lcId}: No documents!`);
          } else {
            const verified = docs.filter(d => 
              d.status === 'verified' || d.verificationStatus === 'verified'
            ).length;
            console.log(`   ${verified === docs.length ? '✅' : '❌'} ${lc.lcId}: ${verified}/${docs.length} docs verified`);
            
            if (verified < docs.length) {
              console.log(`      → ${docs.length - verified} documents not yet verified`);
            }
          }
        });
      }
      
      console.log('\n📋 Steps to fix:');
      console.log('1. Go to Tab 2 (Document Examination)');
      console.log('2. Find an LC with FOREX_ALLOCATED status');
      console.log('3. Click "Examine Documents"');
      console.log('4. Approve all 12 documents');
      console.log('5. LC status will change to UTILIZED');
      console.log('6. LC will appear in Tab 3');
      
    } else {
      console.log('✅ Tab 3 has data:\n');
      forPayment.forEach(lc => {
        const docs = lc.documents || [];
        console.log(`  ${lc.lcId}: $${lc.amount} ${lc.currency} (${docs.length} docs all verified) ✅`);
      });
    }
    
    // Step 6: Check Tab 5 (Settlement) data
    console.log('\n\n=== Tab 5: LC Settlement ===\n');
    
    const forSettlement = lcs.filter(lc => 
      ['PAYMENT_RELEASED', 'SETTLED'].includes(lc.status)
    );
    
    console.log(`Filter: ['PAYMENT_RELEASED', 'SETTLED']`);
    console.log(`Result: ${forSettlement.length} LCs\n`);
    
    if (forSettlement.length === 0) {
      console.log('⚠️  No LCs for Tab 5');
      console.log('LCs will appear here after payment is released in Tab 3');
    } else {
      console.log('✅ Tab 5 has data:\n');
      forSettlement.forEach(lc => {
        console.log(`  ${lc.lcId} (${lc.status}): $${lc.amount} ${lc.currency}`);
      });
    }
    
    // Summary
    console.log('\n\n=== Summary ===\n');
    console.log(`Total LCs: ${lcs.length}`);
    console.log(`Tab 2 (Document Examination): ${forExamination.length} LCs`);
    console.log(`Tab 3 (Payment Release): ${forPayment.length} LCs`);
    console.log(`Tab 5 (LC Settlement): ${forSettlement.length} LCs`);
    
    if (forPayment.length === 0) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('Tab 3 shows "No data" because no LCs are ready for payment release.');
      console.log('Follow the workflow to move LCs through the stages.');
    } else {
      console.log('\n✅ All tabs have data - system is working correctly!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.log('API Response:', error.response.data);
    }
  }
}

diagnose();
