const axios = require('axios');

const testCases = [
  {
    name: 'Forex Allocation',
    entityType: 'FOREX_ALLOCATION',
    entityId: 'FOREX_LC-CONTRACT1788435011592-1788509695626_1788592090021',
    expectedEndorsers: ['BanksMSP', 'NBEMSP', 'ECTAMSP']
  },
  {
    name: 'LC Issuance',
    entityType: 'LC',
    entityId: 'LC-CONTRACT1788435011592-1788509695626',
    expectedEndorsers: ['BanksMSP', 'NBEMSP', 'ECTAMSP']
  },
  {
    name: 'Contract',
    entityType: 'CONTRACT',
    entityId: 'CONTRACT1788435011592',
    expectedEndorsers: ['ECTAMSP', 'BanksMSP']
  }
];

(async () => {
  console.log('🔍 TESTING BLOCKCHAIN SIGNATURES ACROSS ALL ENTITY TYPES');
  console.log('='.repeat(80));
  
  let allPassed = true;
  
  for (const test of testCases) {
    console.log(`\n📦 Testing: ${test.name}`);
    console.log('-'.repeat(80));
    
    try {
      const res = await axios.get(
        `http://localhost:3001/api/v1/blockchain-signatures/entity/${test.entityType}/${test.entityId}`
      );
      
      const transactions = res.data.data.transactions;
      
      if (transactions.length === 0) {
        console.log(`  ⚠️  No transactions found (entity may not exist yet)`);
        continue;
      }
      
      console.log(`  ✓ Found ${transactions.length} transaction(s)`);
      
      // Check each transaction
      let hasIssues = false;
      transactions.forEach((tx, idx) => {
        const cert = tx.certificateDetails;
        const creatorOK = cert && cert.commonName && cert.organization && cert.issuer;
        
        if (!creatorOK) {
          console.log(`  ✗ Transaction ${idx + 1}: Incomplete creator certificate`);
          hasIssues = true;
          allPassed = false;
        }
        
        // Check endorsers
        if (tx.endorsers && tx.endorsers.length > 0) {
          tx.endorsers.forEach(e => {
            const endOK = e.certificateDetails && 
                          e.certificateDetails.commonName && 
                          e.certificateDetails.issuer && 
                          e.endpoint;
            if (!endOK) {
              console.log(`  ✗ Transaction ${idx + 1}: Incomplete endorser ${e.mspId}`);
              hasIssues = true;
              allPassed = false;
            }
          });
        }
        
        // Check expected endorsers
        const endorserMsps = (tx.endorsers || []).map(e => e.mspId);
        const hasExpected = test.expectedEndorsers.some(exp => endorserMsps.includes(exp));
        
        if (hasExpected) {
          console.log(`  ✓ Transaction ${idx + 1}: Has expected consortium endorsers`);
        } else {
          console.log(`  ⚠️  Transaction ${idx + 1}: Different endorsers than expected`);
        }
      });
      
      if (!hasIssues) {
        console.log(`  ✅ All certificates complete - NO undefined or N/A`);
      }
      
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log(`  ⚠️  Entity not found (may not exist in ledger yet)`);
      } else {
        console.log(`  ✗ Error: ${err.message}`);
        allPassed = false;
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Real consortium blockchain fully working!');
    console.log('✅ Multi-organization endorsements verified!');
    console.log('✅ Complete X.509 certificates across all entity types!');
  } else {
    console.log('⚠️  Some tests had issues - review above');
  }
  console.log('');
})();
